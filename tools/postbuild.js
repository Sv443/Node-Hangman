// Post-Build script - no need to call manually, this is called when running the build command (`npm run build`)

require("fs").copyFileSync("./LICENSE.txt", "build/LICENSE.txt");