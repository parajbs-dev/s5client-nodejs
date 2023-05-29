/**
 * Demo script that uploads form Url passed in as CLI arguments.
 *
 * Example usage: node scripts/upload_fromUrl.js <dataUrl>
 */

const process = require("process");

const { S5Client, defaultS5PortalUrl } = require("..");

const portalUrl = defaultS5PortalUrl;
const client = new S5Client(`${portalUrl}`);
// const client = new S5Client("", { portalUrl: `${portalUrl}` });

(async () => {
  if (process.argv[2] != null) {
    const dataUrl = process.argv[2];

    const cid = await client.uploadFromUrl(dataUrl);

    console.log(cid);
  }
})();
