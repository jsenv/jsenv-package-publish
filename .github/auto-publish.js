const { fileURLToPath } = require("url")
const { autoPublish } = require("@jsenv/auto-publish")
const { projectDirectoryUrl } = require("../jsenv.config.js")

autoPublish({
  projectPath: fileURLToPath(projectDirectoryUrl),
  registryMap: {
    "https://registry.npmjs.org": {
      token: process.env.NPM_TOKEN,
    },
    "https://npm.pkg.github.com": {
      token: process.env.GITHUB_TOKEN,
    },
  },
})
