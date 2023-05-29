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

  // Variable to store the result of the delete operation
  let responseMessage;

  try {
    // Execute the delete request asynchronously
    const response = await this.executeRequest({
      ...opts,
      method: "delete",
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

module.exports = { deleteCid };
