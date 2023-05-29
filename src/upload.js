"use strict";
const fs = require("fs");
const p = require("path");
const FormData = require("form-data");
const tus = require("tus-js-client");
const { DetailedError } = require("tus-js-client");

const {
  calculateB3hashFromFile,
  generateMHashFromB3hash,
  convertMHashToB64url,
  generateCIDFromMHash,
  encodeCIDWithPrefixZ,
  walkDirectory,
  makeUrl,
  getFileMimeType,
} = require("s5-utils-nodejs");

const {
  DEFAULT_UPLOAD_OPTIONS,
  DEFAULT_UPLOAD_DIRECTORY_OPTIONS,
  DEFAULT_DIRECTORY_NAME,
  DEFAULT_UPLOAD_FROM_URL_OPTIONS,
} = require("./defaults");

/**
 * Uploads a file from a URL.
 *
 * @param this - The instance of the S5Client class.
 * @param dataurl - The URL of the file to be uploaded to S5-Network.
 * @param customOptions - Optional custom upload options.
 * @returns A promise that resolves to the AxiosResponse object representing the upload response.
 */
const uploadFromUrl = async function (dataurl, customOptions = {}) {
  // Merge the default upload options, custom options from the instance, and any provided custom options
  const opts = { ...DEFAULT_UPLOAD_FROM_URL_OPTIONS, ...this.customOptions, ...customOptions };

  const params = { url: dataurl };

  // Execute the request to upload from the URL
  const response = await this.executeRequest({
    ...opts,
    method: "post",
    params,
  });

  return response.data;
};

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
  const endpointLargeUpload = `${opts.endpointLargeUpload}${opts.authToken ? `?auth_token=${opts.authToken}` : ""}`;

  const url = makeUrl(opts.portalUrl, endpointLargeUpload);

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

  const b3hash = await calculateB3hashFromFile(path);
  const mhash = generateMHashFromB3hash(b3hash);
  const cid = generateCIDFromMHash(mhash, path);

  const mHashBase64url = convertMHashToB64url(mhash);
  const zCid = encodeCIDWithPrefixZ(cid);

  return new Promise((resolve, reject) => {
    const tusOpts = {
      endpoint: url,
      metadata: {
        hash: mHashBase64url,
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
        console.log(zCid);
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
  let filename = opts.customDirname || p.basename(path) || DEFAULT_DIRECTORY_NAME;
  if (filename.startsWith("/")) {
    filename = filename.slice(1);
  }
  const params = { filename };
  params.name = filename;
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

/**
 * Uploads a WebApp directory from the local filesystem to S5-network.
 *
 * @param {string} path - The path of the directory to upload.
 * @param {Object} [customOptions] - Configuration options.
 * @param {Object} [customOptions.disableDefaultPath=false] - If the value of `disableDefaultPath` is `true` no content is served if the s5file is accessed at its root path.
 * @returns - The S5 cid.
 */
const uploadWebapp = async function (path, customOptions = {}) {
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
  let filename = opts.customDirname || p.basename(path) || DEFAULT_DIRECTORY_NAME;
  if (filename.startsWith("/")) {
    filename = filename.slice(1);
  }
  const params = { filename };
  params.name = filename;
  if (opts.tryFiles) {
    params.tryfiles = JSON.stringify(opts.tryFiles);
  } else {
    params.tryfiles = JSON.stringify(["index.html"]);
  }
  if (opts.errorPages) {
    params.errorpages = JSON.stringify(opts.errorPages);
  } else {
    params.errorpages = JSON.stringify({ 404: "/404.html" });
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

module.exports = { uploadFromUrl, uploadData, uploadFile, uploadDirectory, uploadWebapp };
