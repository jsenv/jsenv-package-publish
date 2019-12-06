const { test } = require("@jsenv/testing")
const { projectPath, testDescription } = require("../../jsenv.config.js")

// const secrets = require("../../secrets.json")
// Object.assign(process.env, secrets)

test({
  projectPath,
  executeDescription: testDescription,
})
