import { createLogger } from "@jsenv/logger"
import { fetchLatestInRegistry } from "./internal/fetchLatestInRegistry.js"
import { publish } from "./internal/publish.js"
import { readProjectPackage } from "./internal/readProjectPackage.js"

export const publishPackage = async ({ projectDirectoryUrl, logLevel, registryMap } = {}) => {
  const logger = createLogger({ logLevel })
  logger.debug(
    `publishPackage(${JSON.stringify({ projectDirectoryUrl, logLevel, registryMap }, null, "  ")})`,
  )
  assertRegistryMap(registryMap)

  logger.debug(`reading project package.json`)
  const packageInProject = await readProjectPackage({
    projectDirectoryUrl,
  })
  const { name: packageName, version: packageVersion } = packageInProject
  logger.debug(`${packageName}@${packageVersion} found in package.json`)

  const toPublish = []
  await Promise.all(
    Object.keys(registryMap).map(async (registryUrl) => {
      logger.debug(`fetching latest package in ${registryUrl}`)
      const registryConfig = registryMap[registryUrl]
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
        projectPath,
        logger,
        registryUrl,
        ...registryMap[registryUrl],
      })
      logger.info(`${packageName}@${packageVersion} published on ${registryUrl}`)
    })
  }, Promise.resolve())
}

const assertRegistryMap = (value) => {
  if (typeof value !== "object") {
    throw new TypeError(`registryMap must be an object.
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
