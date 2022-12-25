/**
 * Demo script for test funktion "pinCid".
 *
 * Example for "pinCid" usage: node scripts/pin.js "z6e78acvH3M4PFaFzeA67UDpje2uYHai3LPSFQWs2WNinqpFzQYTa"
 *
 * Example with default data: node scripts/pin.js
 *
 */

(async () => {
  const { S5Client, defaultS5PortalUrl } = require("..");

  const portalUrl = defaultS5PortalUrl;
  const client = new S5Client(`${portalUrl}`);
  const defaultCid = "z6e78acvH3M4PFaFzeA67UDpje2uYHai3LPSFQWs2WNinqpFzQYTa";
  let usedCid;

  if (process.argv[2] === null || process.argv[2] === undefined) {
    usedCid = defaultCid;
    console.log("\n\nusedCid =  " + usedCid);
  } else {
    usedCid = process.argv[2];
    console.log("usedCid =  " + usedCid);
  }

  // 1. use pinCid to pin a S5 cid to a portal.
  async function pinCid(cid) {
    await client
      .pinCid(cid)
      .then(() => {
        console.log("\n\n\n1. use pinCid to pin a S5 cid to a portal.");
      })
      .catch((err) => {
        console.log("\n1. Get Error: ", err.response.data);
      });
  }

  pinCid(usedCid);
})();
