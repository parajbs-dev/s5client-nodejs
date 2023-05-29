/**
 * Demo script for test funktion "downloadDirectory".
 *
 * Example for "downloadDirectory" usage: node scripts/download_directory.js "tmp/video" "z31rccxzvfW5qumeRyrHNZjH6hn78y4Z1MT9ZqvABR6odfoy"
 *
 * Example with default data: node scripts/download_directory.js
 *
 */

(async () => {
  const { S5Client, defaultS5PortalUrl } = require("..");

  const portalUrl = defaultS5PortalUrl;
  const client = new S5Client(`${portalUrl}`);
  // const client = new S5Client("", { portalUrl: `${portalUrl}` });

  const defaultPath = "tmp/video";
  const defaultCid = "z31rccxzvfW5qumeRyrHNZjH6hn78y4Z1MT9ZqvABR6odfoy";
  let usedPath;
  let usedCid;

  if (process.argv[2] === null || process.argv[2] === undefined) {
    usedPath = defaultPath;
    console.log("\n\nusedPath =  " + usedPath);
    usedCid = defaultCid;
    console.log("\n\nusedCid =  " + usedCid);
  } else {
    usedPath = process.argv[2];
    console.log("usedPath =  " + usedPath);
    usedCid = process.argv[3];
    console.log("usedCid =  " + usedCid);
  }

  // 1. use downloadDirectory to get all files and subdirectorys from S5-net.
  async function downloadDirectory(path, cid) {
    const inputCid = await client.tools.convertDownloadDirectoryInputCid(cid);

    await client
      .downloadDirectory(path, inputCid)
      .then(() => {
        console.log("\n\n\n1. use downloadDirectory to get all files and subdirectorys from S5-net.");
      })
      .catch((err) => {
        console.log("\n1. Get Error: ", err);
      });
  }

  downloadDirectory(usedPath, usedCid);
})();
