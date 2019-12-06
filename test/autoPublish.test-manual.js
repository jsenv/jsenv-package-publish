import { publishPackage } from "../index.js"
// import secrets from "../../secrets.json"

// Object.assign(process.env, secrets)

const { projectDirectoryUrl } = import.meta.require("../../jsenv.config.js")

publishPackage({
  projectDirectoryUrl,
  logLevel: "info",
  registriesConfig: {
    "https://registry.npmjs.org": {
      token: process.env.NPM_TOKEN,
    },
    "https://npm.pkg.github.com": {
      token: process.env.GITHUB_TOKEN,
    },
  },
})
