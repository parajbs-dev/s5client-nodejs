"use strict";

const fs = require("fs");
var getDirName = require("path").dirname;

const { S5Client } = require("./client");
const { DEFAULT_GET_METADATA_OPTIONS } = require("./defaults");
const { defaultS5PortalUrl } = require("./utils");
const portalUrl = defaultS5PortalUrl;
const client = new S5Client(`${portalUrl}`);

/**
 * Downloads a file from the given S5 cid.
 *
 * @param {string} path - The path to download the file to.
 * @param {Object} [customOptions] - Configuration options.
 * @param {Object} [customOptions.format] - The format (tar or zip) to download the file as.
 * @returns - The S5 cid.
 */
S5Client.prototype.downloadDirectory = async function (path, cid, customOptions = {}) {
  const opts = { ...DEFAULT_GET_METADATA_OPTIONS, ...this.customOptions, ...customOptions };

  await this.executeRequest({
    ...opts,
    method: "get",
    extraPath: cid,
  })
    .then((response) => {
      const allDirectoryCids = [response.data.paths];

      async function downloadAllCid(key, cid) {
        if (key != null) {
          await fs.promises.mkdir(getDirName(path + "/" + key), { recursive: true });
          await client.downloadFile(path + "/" + key, cid);
        }
      }

      allDirectoryCids.forEach((obj) => {
        for (const [key, value] of Object.entries(obj)) {
          downloadAllCid(key, value.cid);
        }
      });
    })
    .catch((error) => {
      console.log("ERROR: " + error);
    });
};
