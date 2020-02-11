// Post-Build script - no need to call manually, this is called when running the build commands (`npm run build` / `npm run build-*`)

const fs = require("fs");

fs.copyFileSync("./LICENSE.txt", "build/LICENSE.txt");
fs.copyFileSync("./README.md", "build/README.md");