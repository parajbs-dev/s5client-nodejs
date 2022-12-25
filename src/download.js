"use strict";

const fs = require("fs");

const { DEFAULT_DOWNLOAD_OPTIONS, DEFAULT_GET_METADATA_OPTIONS } = require("./defaults");

/**
 * Downloads in-memory data from a S5 cid.
 *
 * @param {string} cid - The S5 cid.
 * @param {Object} [customOptions={}] - Configuration options.
 * @returns - The data.
 */
const downloadData = async function (cid, customOptions = {}) {
  const opts = { ...DEFAULT_DOWNLOAD_OPTIONS, ...this.customOptions, ...customOptions };

  const response = await this.executeRequest({
    ...opts,
    method: "get",
    extraPath: cid,
    responseType: "arraybuffer",
  });
  return response.data;
};

/**
 * Downloads a file from the given S5 cid.
 *
 * @param {string} path - The path to download the file to.
 * @param {Object} [customOptions] - Configuration options.
 * @param {Object} [customOptions.format] - The format (tar or zip) to download the file as.
 * @returns - The S5 cid.
 */
const downloadFile = function (path, cid, customOptions = {}) {
  const opts = { ...DEFAULT_DOWNLOAD_OPTIONS, ...this.customOptions, ...customOptions };

  const writer = fs.createWriteStream(path);

  const params = buildDownloadParams(opts.format);

  return new Promise((resolve, reject) => {
    this.executeRequest({
      ...opts,
      method: "get",
      extraPath: cid,
      responseType: "stream",
      params,
    })
      .then((response) => {
        response.data.pipe(writer);
        writer.on("finish", resolve);
        writer.on("error", reject);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

/**
 * Gets only the metadata for the given cid without the contents.
 *
 * @param this - S5Client
 * @param {string} cid - The S5 cid.
 * @param {Object} [customOptions={}] - Configuration options.
 * @returns - The metadata in JSON format. Empty if no metadata was found.
 */
const getMetadata = async function (cid, customOptions = {}) {
  const opts = { ...DEFAULT_GET_METADATA_OPTIONS, ...this.customOptions, ...customOptions };

  const response = await this.executeRequest({
    ...opts,
    method: "get",
    extraPath: cid,
  });
  return response.data;
};

function buildDownloadParams(format) {
  const params = {};
  if (format) {
    params.format = format;
  }
  return params;
}

module.exports = { downloadData, downloadFile, getMetadata };
