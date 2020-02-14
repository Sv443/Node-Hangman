// Post-Build script - no need to call manually, this is called when running the build commands (`npm run build` / `npm run build-*`)

const fs = require("fs");

fs.copyFileSync("./LICENSE.txt", "build/LICENSE.txt");
fs.copyFileSync("./README.md", "build/README.md");

fs.mkdirSync("build/translations");
fs.readdirSync("./translations").forEach(f => {
    fs.copyFileSync(`./translations/${f}`, `build/translations/${f}`)
});