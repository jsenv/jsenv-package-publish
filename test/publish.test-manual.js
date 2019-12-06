import { createLogger } from "@jsenv/logger"
import { publish } from "../src/internal/publish.js"
// import secrets from "../../secrets.json"

// Object.assign(process.env, secrets)

const { projectDirectoryUrl } = import.meta.require("../../jsenv.config.js")

publish({
  projectDirectoryUrl,
  logger: createLogger(),
  registryUrl: "https://npm.pkg.github.com",
  token: process.env.GITHUB_TOKEN,
})
