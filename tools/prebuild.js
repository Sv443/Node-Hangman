// Pre-Build script - no need to call manually, this is called when running the build commands (`npm run build` / `npm run build-*`)

const fs = require("fs");

if(fs.existsSync("./build/translations"))
    fs.rmdirSync("./build/translations", {
        recursive: true
    });

fs.readdirSync("./build").forEach(f => {
    fs.unlinkSync(`./build/${f}`);
});