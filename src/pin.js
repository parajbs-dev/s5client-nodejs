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

  // Variable to store the result of the pinning operation
  let responseMessage;

  try {
    // Execute the pinning request asynchronously
    const response = await this.executeRequest({
      ...opts,
      method: "post",
      extraPath: cid,
    });

    // Check the response status and set responseMessage accordingly
    if (response.status === 200) {
      responseMessage = "successful";
    } else {
      responseMessage = "failed";
    }

    return responseMessage;
  } catch (e) {
    console.log(e.message);
    return (responseMessage = "failed");
  }
};

module.exports = { pinCid };
