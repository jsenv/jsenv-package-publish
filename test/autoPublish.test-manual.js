import { autoPublish } from "../../index.js"
// import secrets from "../../secrets.json"

// Object.assign(process.env, secrets)

const { projectPath } = import.meta.require("../../jsenv.config.js")

autoPublish({
  projectPath,
  logLevel: "info",
  registryMap: {
    "https://registry.npmjs.org": {
      token: process.env.NPM_TOKEN,
    },
    "https://npm.pkg.github.com": {
      token: process.env.GITHUB_TOKEN,
    },
  },
})
