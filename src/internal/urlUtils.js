import { pathToFileURL, fileURLToPath } from "url"

export const resolveUrl = (value, baseUrl) => {
  return String(new URL(value, baseUrl))
}

export const filePathToUrl = (path) => {
  return String(pathToFileURL(path))
}

export const urlToFilePath = (url) => {
  return fileURLToPath(url)
}

export const hasScheme = (string) => {
  return /^[a-zA-Z]{2,}:/.test(string)
}
