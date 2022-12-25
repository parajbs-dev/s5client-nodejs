"use strict";

const FormData = require("form-data");
const fs = require("fs");
const p = require("path");
const { Blake3Hasher } = require("@napi-rs/blake-hash");
const tus = require("tus-js-client");
const { DetailedError } = require("tus-js-client");

const { DEFAULT_UPLOAD_OPTIONS, DEFAULT_UPLOAD_DIRECTORY_OPTIONS, TUS_CHUNK_SIZE } = require("./defaults");
const { getFileMimeType, makeUrl, walkDirectory } = require("./utils");
const { mhashBlake3Default, cidTypeRaw } = require("./constants");

/**
 * Uploads in-memory data to S5-Network.
 *
 * @param {string|Buffer} data - The data to upload, either a string or raw bytes.
 * @param {string} filename - The filename to use on S5-Network.
 * @param {Object} [customOptions={}] - Configuration options.
 * @returns - The S5 cid.
 */
const uploadData = async function (data, filename, customOptions = {}) {
  const opts = { ...DEFAULT_UPLOAD_OPTIONS, ...this.customOptions, ...customOptions };

  const sizeInBytes = data.length;

  if (sizeInBytes < opts.largeFileSize) {
    return await uploadSmallFile(this, data, filename, opts);
  }
  return await uploadLargeFile(this, data, filename, sizeInBytes, opts);
};

const uploadFile = async function (path, customOptions = {}) {
  const opts = { ...DEFAULT_UPLOAD_OPTIONS, ...this.customOptions, ...customOptions };

  const stat = await fs.promises.stat(path);
  const sizeInBytes = stat.size;
  const filename = opts.customFilename ? opts.customFilename : p.basename(path);
  const stream = fs.createReadStream(path);

  if (sizeInBytes < opts.largeFileSize) {
    return await uploadSmallFile(this, stream, filename, opts);
  }
  return await uploadLargeFile(this, path, stream, filename, sizeInBytes, opts);
};

async function uploadSmallFile(client, stream, filename, opts) {
  const params = {};
  if (opts.dryRun) params.dryrun = true;

  const formData = new FormData();
  formData.append(opts.portalFileFieldname, stream, filename);
  const headers = formData.getHeaders();

  const response = await client.executeRequest({
    ...opts,
    method: "post",
    data: formData,
    headers,
    params,
  });

  const responsedS5Cid = response.data.cid;

  return `${responsedS5Cid}`;
}

async function uploadLargeFile(client, path, stream, filename, filesize, opts) {
  let upload = null;
  let uploadIsRunning = false;

  const url = makeUrl(opts.portalUrl, opts.endpointLargeUpload);
  const chunkSize = TUS_CHUNK_SIZE;

  const askToResumeUpload = function (previousUploads, currentUpload) {
    if (previousUploads.length === 0) return;

    let text = "You tried to upload this file previously at these times:\n\n";
    previousUploads.forEach((previousUpload, index) => {
      text += `[${index}] ${previousUpload.creationTime}\n`;
    });
    text += "\nEnter the corresponding number to resume an upload or press Cancel to start a new upload";

    const answer = text + "yes";
    const index = parseInt(answer, 10);

    if (!Number.isNaN(index) && previousUploads[index]) {
      currentUpload.resumeFromPreviousUpload(previousUploads[index]);
    }
  };

  const reset = function () {
    upload = null;
    uploadIsRunning = false;
  };

  const onProgress =
    opts.onUploadProgress &&
    function (bytesSent, bytesTotal) {
      const progress = bytesSent / bytesTotal;

      // @ts-expect-error TS complains.
      opts.onUploadProgress(progress, { loaded: bytesSent, total: bytesTotal });
    };

  const b3hash = await new Promise((resolve, reject) => {
    const hasher = new Blake3Hasher();
    stream.on("error", (err) => reject(err));
    stream.on("data", (chunk) => hasher.update(chunk));
    stream.on("end", () => resolve(hasher.digestBuffer()));
  });

  const hash = Buffer.concat([Buffer.alloc(1, mhashBlake3Default), b3hash]);
  const cid = Buffer.concat([Buffer.alloc(1, cidTypeRaw), hash, numberToBuffer(fs.statSync(path).size)]);

  function numberToBuffer(value) {
    const view = Buffer.alloc(16);
    let lastIndex = 15;
    for (var index = 0; index <= 15; ++index) {
      if (value % 256 !== 0) {
        lastIndex = index;
      }
      view[index] = value % 256;
      value = value >> 8;
    }
    return view.subarray(0, lastIndex + 1);
  }

  return new Promise((resolve, reject) => {
    const tusOpts = {
      endpoint: url,
      chunkSize: chunkSize,
      //     retryDelays: opts.retryDelays,
      metadata: {
        hash: hash.toString("base64url"),
        filename,
        filetype: getFileMimeType(filename),
      },
      onProgress,
      onError: (error = Error | DetailedError) => {
        // Return error body rather than entire error.
        const res = error.originalResponse;
        const newError = res ? new Error(res.getBody().trim()) || error : error;
        reset();
        reject(newError);
      },
      onSuccess: async () => {
        if (!upload.url) {
          reject(new Error("'upload.url' was not set"));
          return;
        }

        console.log("Upload finished.");
        console.log("CID:", "u" + cid.toString("base64url"));
      },
    };

    upload = new tus.Upload(stream, tusOpts);
    upload.findPreviousUploads().then((previousUploads) => {
      askToResumeUpload(previousUploads, upload);

      upload.start();

      uploadIsRunning = true;
      if (uploadIsRunning === false) {
        console.log("Upload Is Running:  " + uploadIsRunning);
      }
    });
  });
}

/**
 * Uploads a directory from the local filesystem to S5-network.
 *
 * @param {string} path - The path of the directory to upload.
 * @param {Object} [customOptions] - Configuration options.
 * @param {Object} [customOptions.disableDefaultPath=false] - If the value of `disableDefaultPath` is `true` no content is served if the s5file is accessed at its root path.
 * @returns - The S5 cid.
 */
const uploadDirectory = async function (path, customOptions = {}) {
  const opts = { ...DEFAULT_UPLOAD_DIRECTORY_OPTIONS, ...this.customOptions, ...customOptions };

  // Check if there is a directory at given path.
  const stat = await fs.promises.stat(path);
  if (!stat.isDirectory()) {
    throw new Error(`Given path is not a directory: ${path}`);
  }

  const formData = new FormData();
  path = p.resolve(path);
  let basepath = path;
  // Ensure the basepath ends in a slash.
  if (!basepath.endsWith("/")) {
    basepath += "/";
    // Normalize the slash on non-Unix filesystems.
    basepath = p.normalize(basepath);
  }

  for (const file of walkDirectory(path)) {
    // Remove the dir path from the start of the filename if it exists.
    let filename = file;
    if (file.startsWith(basepath)) {
      let filenametext = file.replace(basepath, "");
      filename = filenametext.replace(/\\/g, "/");
    }
    formData.append(filename, fs.createReadStream(file), { filepath: filename });
  }

  // Use either the custom dirname, or the last portion of the path.
  let filename = opts.customDirname || p.basename(path);
  if (filename.startsWith("/")) {
    filename = filename.slice(1);
  }
  const params = { filename };
  if (opts.tryFiles) {
    params.tryfiles = JSON.stringify(opts.tryFiles);
  }
  if (opts.errorPages) {
    params.errorpages = JSON.stringify(opts.errorPages);
  }
  if (opts.disableDefaultPath) {
    params.disableDefaultPath = true;
  }

  if (opts.dryRun) params.dryrun = true;

  const response = await this.executeRequest({
    ...opts,
    method: "post",
    data: formData,
    headers: {
      ...formData.getHeaders(),
    },
    params,
  });

  const responsedS5Cid = response.data.cid;

  return `${responsedS5Cid}`;
};

module.exports = { uploadData, uploadFile, uploadDirectory };
