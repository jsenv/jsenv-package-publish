/**
 * If you just runned npm publish for 6.0.0
 * fetchLatestInRegistry might return 5.0.0 because
 * npm is not done handling the package you just published
 *
 * It means this test can fail if runned once and an other time shortly after.
 * on npm it should be handled by EPUBLISHCONFLICT
 * but on github the error says ambiguous version in package.json
 *
 */

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
  GITHUB_TOKEN: true,
})

const tempDirectoryUrl = resolveUrl("./temp/", import.meta.url)
const packageName = "@jsenv/package-publish-test"
const fetchLatestVersionOnGithub = async () => {
  const { version } = await fetchLatestInRegistry({
    registryUrl: "https://npm.pkg.github.com",
    packageName,
    token: process.env.GITHUB_TOKEN,
  })
  return version
}
let latestVersionOnGithub = await fetchLatestVersionOnGithub()

// try to publish existing version on github
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
  }
  assert({ actual, expected })
}

// publish new minor on github
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
  }
  assert({ actual, expected })
  latestVersionOnGithub = packageVersion
}