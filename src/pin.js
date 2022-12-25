"use strict";

const { DEFAULT_PIN_OPTIONS } = require("./defaults");

/**
 * Re-pins the given cid.
 *
 * @param {string} cid - The S5 cid.
 * @param {Object} [customOptions={}] - Configuration options.
 */
const pinCid = async function (cid, customOptions = {}) {
  const opts = { ...DEFAULT_PIN_OPTIONS, ...this.customOptions, ...customOptions };

  await this.executeRequest({
    ...opts,
    method: "post",
    extraPath: cid,
  });
};

module.exports = { pinCid };
