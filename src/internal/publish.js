import { readFileSync, writeFileSync } from "fs"
import { exec } from "child_process"
import { setNpmConfig } from "./setNpmConfig.js"
import { resolveUrl, urlToFilePath } from "./urlUtils.js"

export const publish = async ({ logger, projectDirectoryUrl, registryUrl, token }) => {
  const previousValue = process.env.NODE_AUTH_TOKEN
  const restoreProcessEnv = () => {
    process.env.NODE_AUTH_TOKEN = previousValue
  }

  const projectPackageFileUrl = resolveUrl("./package.json", projectDirectoryUrl)
  const projectPackageFilePath = urlToFilePath(projectPackageFileUrl)

  const projectPackageString = String(readFileSync(projectPackageFilePath))
  const restoreProjectPackageFile = () => {
    writeFileSync(projectPackageFilePath, projectPackageString)
  }

  const projectNpmConfigFileUrl = resolveUrl("./npmrc", projectDirectoryUrl)
  const projectNpmConfigFilePath = urlToFilePath(projectNpmConfigFileUrl)
  let projectNpmConfigString
  try {
    projectNpmConfigString = String(readFileSync(projectNpmConfigFilePath))
  } catch (e) {
    if (e.code === "ENOENT") {
      projectNpmConfigString = ""
    } else {
      throw e
    }
  }
  const restoreProjectNpmConfigFile = () => {
    writeFileSync(projectNpmConfigFilePath, projectNpmConfigString)
  }

  process.env.NODE_AUTH_TOKEN = token

  const projectPackageObject = JSON.parse(projectPackageString)
  projectPackageObject.publishConfig = projectPackageObject.publishConfig || {}
  projectPackageObject.publishConfig.registry = registryUrl
  writeFileSync(projectPackageFilePath, JSON.stringify(projectPackageObject, null, "  "))

  writeFileSync(
    projectNpmConfigFilePath,
    setNpmConfig(projectNpmConfigString, {
      [computeRegistryTokenKey(registryUrl)]: token,
      [computeRegistryKey(projectPackageObject.name)]: registryUrl,
    }),
  )

  try {
    await new Promise((resolve, reject) => {
      const command = exec(
        "npm publish",
        {
          cwd: urlToFilePath(projectDirectoryUrl),
          stdio: "silent",
        },
        (error) => {
          if (error) {
            if (error.message.includes("EPUBLISHCONFLICT")) {
              // it certainly means a previous published worked
              // but registry is still busy so when we asked
              // for latest version is was not yet available
              resolve()
            } else {
              reject(error)
            }
          } else {
            resolve()
          }
        },
      )
      command.stdout.on("data", (data) => {
        logger.debug(data)
      })
      command.stderr.on("data", (data) => {
        // debug because this output is part of
        // the error message generated by a failing npm publish
        logger.debug(data)
      })
    })
  } finally {
    restoreProcessEnv()
    restoreProjectPackageFile()
    restoreProjectNpmConfigFile()
  }
}

const computeRegistryTokenKey = (registryUrl) => {
  if (registryUrl.startsWith("http://")) {
    return `${registryUrl.slice("http:".length)}/:_authToken`
  }
  if (registryUrl.startsWith("https://")) {
    return `${registryUrl.slice("https:".length)}/:_authToken`
  }
  if (registryUrl.startsWith("//")) {
    return `${registryUrl}/:_authToken`
  }
  throw new Error(`registryUrl must start with http or https, got ${registryUrl}`)
}

const computeRegistryKey = (packageName) => {
  if (packageName[0] === "@") {
    const packageScope = packageName.slice(0, packageName.indexOf("/"))
    return `${packageScope}:registry`
  }
  return `registry`
}
