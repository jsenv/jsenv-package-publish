import { resolveUrl } from "@jsenv/util"
import { publishPackage } from "../index.js"
import { loadEnvFile } from "./testHelper.js"

const run = async () => {
  if (!process.env.CI) {
    await loadEnvFile(resolveUrl("../secrets.json", import.meta.url))
  }

  const projectDirectoryUrl = resolveUrl("../", import.meta.url)

  const report = await publishPackage({
    projectDirectoryUrl,
    registriesConfig: {
      "https://registry.npmjs.org": {
        token: process.env.NPM_TOKEN,
      },
      "https://npm.pkg.github.com": {
        token: process.env.GITHUB_TOKEN,
      },
    },
  })
  console.log(report)
}
run()
