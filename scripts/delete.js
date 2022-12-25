/**
 * Demo script for test funktion "deleteCid".
 *
 * Example for "deleteCid" usage: node scripts/delete.js "z6e5pNnenj1z8929xQmXmf4M5iQgec8rS8bWvFiWL5Zxv336qSqjv"
 *
 * Example with default data: node scripts/delete.js
 *
 */

(async () => {
  const { S5Client, defaultS5PortalUrl } = require("..");

  const portalUrl = defaultS5PortalUrl;
  const client = new S5Client(`${portalUrl}`);
  const defaultCid = "z6e5pNnenj1z8929xQmXmf4M5iQgec8rS8bWvFiWL5Zxv336qSqjv";
  let usedCid;

  if (process.argv[2] === null || process.argv[2] === undefined) {
    usedCid = defaultCid;
    console.log("\n\nusedCid =  " + usedCid);
  } else {
    usedCid = process.argv[2];
    console.log("usedCid =  " + usedCid);
  }

  // 1. use deleteCid to delete a cid to a portal.
  async function deleteCid(cid) {
    await client
      .deleteCid(cid)
      .then(() => {
        console.log("\n\n\n1. use deleteCid to delete a S5 cid from a portal.");
      })
      .catch((err) => {
        console.log("\n1. Get Error: ", err.response.data);
      });
  }

  deleteCid(usedCid);
})();
