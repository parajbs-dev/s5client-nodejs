"use strict";

const { DEFAULT_DELETE_OPTIONS } = require("./defaults");

/**
 * Delete the given cid.
 *
 * @param {string} cid - The s5 cid.
 * @param {Object} [customOptions={}] - Configuration options.
 */
const deleteCid = async function (cid, customOptions = {}) {
  const opts = { ...DEFAULT_DELETE_OPTIONS, ...this.customOptions, ...customOptions };

  await this.executeRequest({
    ...opts,
    method: "delete",
    extraPath: cid,
  });
};

module.exports = { deleteCid };
