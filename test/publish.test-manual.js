import { createLogger } from "@jsenv/logger"
import { publish } from "../../src/autoPublish/publish.js"
// import secrets from "../../secrets.json"

// Object.assign(process.env, secrets)

const { projectPath } = import.meta.require("../../jsenv.config.js")

publish({
  projectPath,
  logger: createLogger(),
  registryUrl: "https://npm.pkg.github.com",
  token: process.env.GITHUB_TOKEN,
})
