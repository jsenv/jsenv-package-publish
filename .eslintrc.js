const { createConfig } = require("@jsenv/eslint-config")

const config = createConfig({
  importResolutionMethod: "import-map",
  projectDirectoryPath: __dirname,
})

module.exports = config
