import { createLogger } from "@jsenv/logger"
import { assertAndNormalizeDirectoryUrl } from "@jsenv/util"
import { fetchLatestInRegistry } from "./internal/fetchLatestInRegistry.js"
import { publish } from "./internal/publish.js"
import { readProjectPackage } from "./internal/readProjectPackage.js"
import {
  needsPublish,
  PUBLISH_BECAUSE_NEVER_PUBLISHED,
  PUBLISH_BECAUSE_LATEST_LOWER,
  PUBLISH_BECAUSE_TAG_DIFFERS,
  NOTHING_BECAUSE_LATEST_HIGHER,
  NOTHING_BECAUSE_ALREADY_PUBLISHED,
} from "../src/internal/needsPublish.js"

export const publishPackage = async ({
  projectDirectoryUrl,
  logLevel,
  registriesConfig,
  logNpmPublishOutput = true,
} = {}) => {
  const logger = createLogger({ logLevel })
  logger.debug(
    `publishPackage(${JSON.stringify(
      { projectDirectoryUrl, logLevel, registriesConfig },
      null,
      "  ",
    )})`,
  )
  projectDirectoryUrl = assertAndNormalizeDirectoryUrl(projectDirectoryUrl)
  assertRegistriesConfig(registriesConfig)

  logger.debug(`reading project package.json`)
  const packageInProject = await readProjectPackage({
    projectDirectoryUrl,
  })
  const { name: packageName, version: packageVersion } = packageInProject
  logger.debug(`${packageName}@${packageVersion} found in package.json`)

  const report = {}
  await Promise.all(
    Object.keys(registriesConfig).map(async (registryUrl) => {
      const registryReport = {
        packageName,
        packageVersion,
        registryLatestVersion: undefined,
        action: undefined,
        actionReason: undefined,
        actionResult: undefined,
      }
      report[registryUrl] = registryReport

      logger.debug(`check latest version for ${packageName} in ${registryUrl}`)
      const registryConfig = registriesConfig[registryUrl]

      try {
        const latestPackageInRegistry = await fetchLatestInRegistry({
          registryUrl,
          packageName,
          ...registryConfig,
        })
        const registryLatestVersion =
          latestPackageInRegistry === null ? null : latestPackageInRegistry.version
        registryReport.registryLatestVersion = registryLatestVersion

        const needs = needsPublish({ packageVersion, registryLatestVersion })
        registryReport.actionReason = needs

        if (needs === PUBLISH_BECAUSE_NEVER_PUBLISHED) {
          logger.info(
            `${packageName}@${packageVersion} needs to be published on ${registryUrl} because it was never published`,
          )
          registryReport.action = "publish"
        } else if (needs === PUBLISH_BECAUSE_LATEST_LOWER) {
          logger.info(
            `${packageName}@${packageVersion} needs to be published on ${registryUrl} because latest version is lower (${registryLatestVersion})`,
          )
          registryReport.action = "publish"
        } else if (needs === PUBLISH_BECAUSE_TAG_DIFFERS) {
          logger.info(
            `${packageName}@${packageVersion} needs to be published on ${registryUrl} because latest tag differs (${registryLatestVersion})`,
          )
          registryReport.action = "publish"
        } else if (needs === NOTHING_BECAUSE_ALREADY_PUBLISHED) {
          logger.info(
            `skip ${packageName}@${packageVersion} publish on ${registryUrl} because already published`,
          )
          registryReport.action = "nothing"
        } else if (needs === NOTHING_BECAUSE_LATEST_HIGHER) {
          logger.info(
            `skip ${packageName}@${packageVersion} publish on ${registryUrl} because latest version is higher (${registryLatestVersion})`,
          )
          registryReport.action = "nothing"
        }
      } catch (e) {
        logger.error(e.message)
        registryReport.action = "nothing"
        registryReport.actionReason = e
        process.exitCode = 1
      }
    }),
  )

  // we have to publish in serie because we don't fully control
  // npm publish, we have to enforce where the package gets published
  await Object.keys(report).reduce(async (previous, registryUrl) => {
    await previous

    const registryReport = report[registryUrl]
    if (registryReport.action !== "publish") {
      registryReport.actionResult = { success: true, reason: "nothing-to-do" }
      return
    }

    logger.info(`publishing ${packageName}@${packageVersion} on ${registryUrl}`)
    const { success, reason } = await publish({
      logger,
      logNpmPublishOutput,
      projectDirectoryUrl,
      registryUrl,
      ...registriesConfig[registryUrl],
    })
    registryReport.actionResult = { success, reason }
    if (success) {
      logger.info(`${packageName}@${packageVersion} published on ${registryUrl}`)
    } else {
      logger.error(`error when publishing ${packageName}@${packageVersion} in ${registryUrl}
--- error stack ---
${reason.stack}`)
      process.exitCode = 1
    }
  }, Promise.resolve())

  return report
}

const assertRegistriesConfig = (value) => {
  if (typeof value !== "object") {
    throw new TypeError(`registriesConfig must be an object.
--- registryMap ---
${value}`)
  }

  Object.keys(value).forEach((registryUrl) => {
    const registryMapValue = value[registryUrl]
    if (typeof registryMapValue !== "object") {
      throw new TypeError(`found unexpected registryMap value: it must be an object.
--- registryMap value ---
${registryMapValue}
--- registryMap key ---
${registryUrl}`)
    }

    if (`token` in registryMapValue === false) {
      throw new TypeError(`missing token in registryMap.
--- registryMap key ---
${registryUrl}`)
    }

    if (typeof registryMapValue.token !== "string") {
      throw new TypeError(`unexpected token found in registryMap: it must be a string.
--- token ---
${registryMapValue.token}
--- registryMap key ---
${registryUrl}`)
    }
  })
}
