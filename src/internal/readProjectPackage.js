import { readFile } from "fs"
import { resolveUrl, urlToFilePath } from "@jsenv/util"

export const readProjectPackage = async ({ projectDirectoryUrl }) => {
  const packageFileUrl = resolveUrl("./package.json", projectDirectoryUrl)
  const packageFilePath = urlToFilePath(packageFileUrl)

  let packageInProject
  try {
    const packageBuffer = await new Promise((resolve, reject) => {
      readFile(packageFilePath, (error, buffer) => {
        if (error) {
          reject(error)
        } else {
          resolve(buffer)
        }
      })
    })
    const packageString = String(packageBuffer)
    try {
      packageInProject = JSON.parse(packageString)
    } catch (e) {
      if (e.name === "SyntaxError") {
        throw new Error(`syntax error while parsing project package.json
--- syntax error stack ---
${e.stack}
--- package.json path ---
${packageFilePath}`)
      }
      throw e
    }
  } catch (e) {
    if (e.code === "ENOENT") {
      throw new Error(
        `cannot find project package.json
--- package.json path ---
${packageFilePath}`,
      )
    }
    throw e
  }

  return packageInProject
}
