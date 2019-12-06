const { execute, launchNode } = require("@jsenv/core")
const jsenvConfig = require("../../jsenv.config.js")

execute({
  ...jsenvConfig,
  launch: launchNode,
  fileRelativePath: process.argv[2],
})
