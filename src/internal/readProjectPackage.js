import { readFile } from "fs"
import {
  operatingSystemPathToPathname,
  pathnameToOperatingSystemPath,
} from "@jsenv/operating-system-path"

export const readProjectPackage = async ({ projectPath }) => {
  if (typeof projectPath !== "string") {
    throw new Error(`projectPath must be a string.
--- project path ---
${projectPath}`)
  }

  const projectPathname = operatingSystemPathToPathname(projectPath)
  const packagePathname = `${projectPathname}/package.json`
  const packagePath = pathnameToOperatingSystemPath(packagePathname)

  let packageInProject
  try {
    const packageBuffer = await new Promise((resolve, reject) => {
      readFile(packagePath, (error, buffer) => {
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
${packagePath}`)
      }
      throw e
    }
  } catch (e) {
    if (e.code === "ENOENT") {
      throw new Error(
        `cannot find project package.json
--- package.json path ---
${packagePath}`,
      )
    }
    throw e
  }

  return packageInProject
}
