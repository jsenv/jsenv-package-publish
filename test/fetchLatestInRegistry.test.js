import { assert } from "@jsenv/assert"
import { fetchLatestInRegistry } from "../src/internal/fetchLatestInRegistry.js"

{
  const { name: actual } = await fetchLatestInRegistry({
    registryUrl: "https://npm.pkg.github.com",
    packageName: "@jsenv/logger",
    token: process.env.GITHUB_TOKEN,
  })
  const expected = "@jsenv/logger"
  assert({ actual, expected })
}

{
  const { name: actual } = await fetchLatestInRegistry({
    registryUrl: "https://registry.npmjs.org",
    packageName: "@jsenv/logger",
    token: process.env.NPM_TOKEN,
  })
  const expected = "@jsenv/logger"
  assert({ actual, expected })
}
