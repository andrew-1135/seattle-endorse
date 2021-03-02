const fs = require("fs");
const path = require("path");

const UNUSED_FILES = [
  "main.js",
];
const UNUSED_DIRS = [
  "_snowpack",
  "test",
];

for (const uFile of UNUSED_FILES) {
  fs.unlinkSync(path.join("build", uFile), { recursive: true });
}

for (const uDir of UNUSED_DIRS) {
  fs.rmdirSync(path.join("build", uDir), { recursive: true });
}
