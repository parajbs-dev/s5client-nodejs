"use strict";
const fs = require("fs");
var getDirName = require("path").dirname;

const { convertS5CidToMHashB64url, checkRawSizeIsNotNull } = require("s5-utils-nodejs");

const {
  DEFAULT_DOWNLOAD_OPTIONS,
  DEFAULT_GET_METADATA_OPTIONS,
  DEFAULT_GET_STORAGE_LOCATIONS_OPTIONS,
  DEFAULT_GET_DOWNLOAD_URLS_OPTIONS,
} = require("./defaults");

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
 * Downloads files from a directory identified by a CID on S5-network.
 *
 * @param {string} path - The path where the directory will be downloaded.
 * @param {string} cid - The Content Identifier (CID) of the directory.
 * @param {object} customOptions - Custom options for the download (optional).
 */
const downloadDirectory = async function (path, cid, customOptions = {}) {
  const opts = { ...DEFAULT_GET_METADATA_OPTIONS, ...this.customOptions, ...customOptions };

  try {
    // Execute the request to get the directory information
    const response = await this.executeRequest({
      ...opts,
      method: "get",
      extraPath: cid,
    });

    const allDirectoryCids = [response.data.paths];

    // Iterate over each directory path and CID
    allDirectoryCids.forEach((obj) => {
      for (const [key, value] of Object.entries(obj)) {
        // Download the CID
        downloadAllCid(this, path, key, value.cid);
      }
    });
  } catch (error) {
    console.log("ERROR: " + error);
  }
};

/**
 * Downloads a file identified by the given key and cid.
 * Creates a directory if it doesn't exist and then downloads the file to that directory.
 *
 * @param {object} client - The s5Client object with a `downloadFile` method.
 * @param {string} path - The base path where the file should be downloaded.
 * @param {string} key - The key or filename under which the file should be saved.
 * @param {string} cid - The CID (Content Identifier) of the file to download.
 */
const downloadAllCid = async function (client, path, key, cid) {
  // Check if the key is not null
  if (key != null) {
    // Create the directory, including any necessary parent directories
    await fs.promises.mkdir(getDirName(path + "/" + key), { recursive: true });

    // Download the file to the specified path
    await client.downloadFile(path + "/" + key, cid);
  }
};

/**
 * Retrieves the resolved URL for a given content ID (cid).
 *
 * @param {string} cid - The content ID.
 * @param {CustomDownloadOptions} [customOptions] - Optional custom download options.
 * @returns {Promise<string>} - A Promise that resolves to the resolved URL.
 */
const getCidUrl = async function (cid, customOptions) {
  // Merge default download options, instance custom options, and provided custom options
  const opts = { ...DEFAULT_DOWNLOAD_OPTIONS, ...this.customOptions, ...customOptions };

  // Obtain the portal URL asynchronously
  const portalUrl = await opts.portalUrl;

  // Create the resolve URL by concatenating the portal URL, cid, and optional auth token query string
  const resolveUrl = portalUrl + "/" + cid + (opts.authToken ? `?auth_token=${opts.authToken}` : "");

  return resolveUrl;
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

/**
 * Retrieves storage locations for a given CID.
 *
 * @param this - S5Client
 * @param {string} cid - The S5 cid.
 * @param {Object} [customOptions={}] - Configuration options.
 * @returns - The storage locations in JSON format. Empty if no storage locations was found.
 */
const getStorageLocations = async function (cid, customOptions = {}) {
  const opts = { ...DEFAULT_GET_STORAGE_LOCATIONS_OPTIONS, ...this.customOptions, ...customOptions };

  // Convert CID to mHashB64url
  const mHashB64url = convertS5CidToMHashB64url(cid);

  if (mHashB64url != "") {
    // Execute GET request with merged options and mHashB64url as extraPath
    const response = await this.executeRequest({
      ...opts,
      method: "get",
      extraPath: mHashB64url,
    });

    // Return the response data
    return response.data;
  } else {
    return "It is not possible!";
  }
};

/**
 * Retrieves the download URLs for a given CID (Content Identifier)
 *
 * @param this - S5Client
 * @param {string} cid - The S5 cid.
 * @param {Object} [customOptions={}] - Configuration options.
 * @returns - The download URLs. Empty if no download URLs was found.
 */
const getDownloadUrls = async function (cid, customOptions = {}) {
  const opts = { ...DEFAULT_GET_DOWNLOAD_URLS_OPTIONS, ...this.customOptions, ...customOptions };

  const rawSizeIsNotNull = checkRawSizeIsNotNull(cid);

  if (rawSizeIsNotNull === true) {
    // Execute the request to retrieve the download URLs
    const response = await this.executeRequest({
      ...opts,
      method: "get",
      extraPath: cid,
    });

    // Return the response data
    return response.data;
  } else {
    return "It is not possible!";
  }
};

/**
 * Builds download parameters object based on the provided format.
 * @param {string} format - The format of the download.
 * @returns {Object} - The download parameters object.
 */
const buildDownloadParams = function (format) {
  const params = {};
  if (format) {
    params.format = format;
  }
  return params;
};

module.exports = {
  downloadData,
  downloadFile,
  downloadDirectory,
  getCidUrl,
  getMetadata,
  getStorageLocations,
  getDownloadUrls,
  buildDownloadParams,
};
