import { createLogger } from "@jsenv/logger"
import { hasScheme, filePathToUrl } from "@jsenv/util"
import { fetchLatestInRegistry } from "./internal/fetchLatestInRegistry.js"
import { publish } from "./internal/publish.js"
import { readProjectPackage } from "./internal/readProjectPackage.js"

export const publishPackage = async ({ projectDirectoryUrl, logLevel, registriesConfig } = {}) => {
  try {
    const logger = createLogger({ logLevel })
    logger.debug(
      `publishPackage(${JSON.stringify(
        { projectDirectoryUrl, logLevel, registriesConfig },
        null,
        "  ",
      )})`,
    )
    projectDirectoryUrl = normalizeProjectDirectoryUrl(projectDirectoryUrl)
    assertRegistriesConfig(registriesConfig)

    logger.debug(`reading project package.json`)
    const packageInProject = await readProjectPackage({
      projectDirectoryUrl,
    })
    const { name: packageName, version: packageVersion } = packageInProject
    logger.debug(`${packageName}@${packageVersion} found in package.json`)

    const toPublish = []
    await Promise.all(
      Object.keys(registriesConfig).map(async (registryUrl) => {
        logger.debug(`fetching latest package in ${registryUrl}`)
        const registryConfig = registriesConfig[registryUrl]
        try {
          const latestPackageInRegistry = await fetchLatestInRegistry({
            registryUrl,
            packageName,
            ...registryConfig,
          })
          if (latestPackageInRegistry === null) {
            logger.debug(`${packageName} never published on ${registryUrl}`)
            toPublish.push(registryUrl)
            return
          }

          const latestVersionOnRegistry = latestPackageInRegistry.version
          if (latestVersionOnRegistry !== packageVersion) {
            logger.debug(
              `${packageName} latest version on ${registryUrl} is ${latestVersionOnRegistry}`,
            )
            toPublish.push(registryUrl)
            return
          }

          logger.info(`${packageName}@${packageVersion} already published on ${registryUrl}`)
          return
        } catch (e) {
          logger.error(e.message)
          return
        }
      }),
    )

    // we have to publish in serie because we don't fully control
    // npm publish, we have to enforce where the package gets published
    await toPublish.reduce((previous, registryUrl) => {
      return previous.then(async () => {
        logger.info(`publishing ${packageName}@${packageVersion} on ${registryUrl}`)
        await publish({
          projectDirectoryUrl,
          logger,
          registryUrl,
          ...registriesConfig[registryUrl],
        })
        logger.info(`${packageName}@${packageVersion} published on ${registryUrl}`)
      })
    }, Promise.resolve())
  } catch (e) {
    // because unhandled promise rejection would not set process exitCode to 1
    // otherwise
    process.exitCode = 1
    throw e
  }
}

const normalizeProjectDirectoryUrl = (value) => {
  if (value instanceof URL) {
    value = value.href
  }

  if (typeof value === "string") {
    const url = hasScheme(value) ? value : filePathToUrl(value)

    if (!url.startsWith("file://")) {
      throw new Error(`projectDirectoryUrl must starts with file://, received ${value}`)
    }

    return ensureTrailingSlash(value)
  }

  throw new TypeError(`projectDirectoryUrl must be a string or an url, received ${value}`)
}

const ensureTrailingSlash = (string) => {
  return string.endsWith("/") ? string : `${string}/`
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
