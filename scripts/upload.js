/**
 * Demo script that uploads all paths passed in as CLI arguments.
 *
 * Example usage: node scripts/upload.js <path-to-file-to-upload>
 */

const fs = require("fs");
const process = require("process");

const { S5Client } = require("..");

const client = new S5Client("", {
  portalUrl: "http://127.0.0.1:5522",
  customDirname: "start",
  tryFiles: ["index.html"],
  errorPages: { 404: "/404.html" },
});

const promises = process.argv
  // Ignore the first two arguments.
  .slice(2)
  // Use appropriate function for dir or for file. Note that this throws if the
  // path doesn't exist; we print an error later.
  .map((path) =>
    fs.promises
      .lstat(path)
      .then((stat) => (stat.isDirectory() ? client.uploadDirectory(path) : client.uploadFile(path)))
  );

(async () => {
  const results = await Promise.allSettled(promises);
  results.forEach((result) => {
    if (result.status === "fulfilled") {
      console.log(result.value);
    } else {
      console.log(result.reason);
    }
  });
})();
