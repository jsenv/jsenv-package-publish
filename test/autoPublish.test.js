import { createRequire } from "module"
import { assert } from "@jsenv/assert"
import { ensureEmptyDirectory, resolveUrl, writeFile } from "@jsenv/util"
import { fetchLatestInRegistry } from "../src/internal/fetchLatestInRegistry.js"
import { publishPackage } from "../index.js"
import { loadEnvFile, assertProcessEnvShape } from "./testHelper.js"

const require = createRequire(import.meta.url)
const { inc: incrementVersion } = require("semver")

if (!process.env.CI) {
  await loadEnvFile(resolveUrl("../secrets.json", import.meta.url))
}
assertProcessEnvShape({
  NPM_TOKEN: true,
  GITHUB_TOKEN: true,
})

const tempDirectoryUrl = resolveUrl("./temp/", import.meta.url)
const packageName = "@jsenv/package-publish-test"
// const fetchLatestVersionOnNpm = async () => {
//   const { version } = await fetchLatestInRegistry({
//     registryUrl: "https://registry.npmjs.org",
//     packageName,
//     token: process.env.NPM_TOKEN,
//   })
//   return version
// }
const fetchLatestVersionOnGithub = async () => {
  const { version } = await fetchLatestInRegistry({
    registryUrl: "https://npm.pkg.github.com",
    packageName,
    token: process.env.GITHUB_TOKEN,
  })
  return version
}
let latestVersionOnGithub = await fetchLatestVersionOnGithub()

// try to publish the same version on github and npm
{
  await ensureEmptyDirectory(tempDirectoryUrl)
  const packageFileUrl = resolveUrl("package.json", tempDirectoryUrl)
  const packageVersion = latestVersionOnGithub
  await writeFile(
    packageFileUrl,
    JSON.stringify({
      name: packageName,
      version: packageVersion,
      repository: {
        type: "git",
        url: "https://github.com/jsenv/jsenv-package-publish-test",
      },
      publishConfig: {
        access: "public",
      },
    }),
  )

  // it should not throw but it should not publish a new package either
  const actual = await publishPackage({
    projectDirectoryUrl: tempDirectoryUrl,
    logLevel: "debug",
    registriesConfig: {
      "https://npm.pkg.github.com": {
        token: process.env.GITHUB_TOKEN,
      },
      "https://registry.npmjs.org": {
        token: process.env.NPM_TOKEN,
      },
    },
  })
  const expected = {
    "https://npm.pkg.github.com": {
      packageName,
      packageVersion,
      registryLatestVersion: latestVersionOnGithub,
      action: "nothing",
      actionReason: "already-published",
      actionResult: {
        success: true,
        reason: "nothing-to-do",
      },
    },
    "https://registry.npmjs.org": {
      packageName,
      packageVersion,
      registryLatestVersion: latestVersionOnGithub,
      action: "nothing",
      actionReason: "already-published",
      actionResult: {
        success: true,
        reason: "nothing-to-do",
      },
    },
  }
  assert({ actual, expected })
}

// publish new minor on github and npm
{
  await ensureEmptyDirectory(tempDirectoryUrl)
  const packageFileUrl = resolveUrl("package.json", tempDirectoryUrl)
  const packageVersion = incrementVersion(latestVersionOnGithub, "patch")
  await writeFile(
    packageFileUrl,
    JSON.stringify({
      name: packageName,
      version: packageVersion,
      repository: {
        type: "git",
        url: "https://github.com/jsenv/jsenv-package-publish-test",
      },
      publishConfig: {
        access: "public",
      },
    }),
  )

  const actual = await publishPackage({
    logLevel: "debug",
    logNpmPublishOutput: false,
    projectDirectoryUrl: tempDirectoryUrl,
    registriesConfig: {
      "https://npm.pkg.github.com": {
        token: process.env.GITHUB_TOKEN,
      },
      "https://registry.npmjs.org": {
        token: process.env.NPM_TOKEN,
      },
    },
  })
  const expected = {
    "https://npm.pkg.github.com": {
      packageName,
      packageVersion,
      registryLatestVersion: latestVersionOnGithub,
      action: "needs-publish",
      actionReason: "latest-lower",
      actionResult: {
        success: true,
        reason: "published",
      },
    },
    "https://registry.npmjs.org": {
      packageName,
      packageVersion,
      registryLatestVersion: latestVersionOnGithub,
      action: "needs-publish",
      actionReason: "latest-lower",
      actionResult: {
        success: true,
        reason: "published",
      },
    },
  }
  assert({ actual, expected })
  latestVersionOnGithub = packageVersion
}

// TODO: test with npmrc presence or not
// test with package publishConfig.registry presence or not
