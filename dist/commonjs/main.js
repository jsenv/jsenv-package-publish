'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var fs = require('fs');
var child_process = require('child_process');

const LOG_LEVEL_OFF = "off";
const LOG_LEVEL_DEBUG = "debug";
const LOG_LEVEL_INFO = "info";
const LOG_LEVEL_WARN = "warn";
const LOG_LEVEL_ERROR = "error";

const createLogger = ({
  logLevel = LOG_LEVEL_INFO
} = {}) => {
  if (logLevel === LOG_LEVEL_DEBUG) {
    return {
      debug,
      info,
      warn,
      error
    };
  }

  if (logLevel === LOG_LEVEL_INFO) {
    return {
      debug: debugDisabled,
      info,
      warn,
      error
    };
  }

  if (logLevel === LOG_LEVEL_WARN) {
    return {
      debug: debugDisabled,
      info: infoDisabled,
      warn,
      error
    };
  }

  if (logLevel === LOG_LEVEL_ERROR) {
    return {
      debug: debugDisabled,
      info: infoDisabled,
      warn: warnDisabled,
      error
    };
  }

  if (logLevel === LOG_LEVEL_OFF) {
    return {
      debug: debugDisabled,
      info: infoDisabled,
      warn: warnDisabled,
      error: errorDisabled
    };
  }

  throw new Error(createUnexpectedLogLevelMessage({
    logLevel
  }));
};

const createUnexpectedLogLevelMessage = ({
  logLevel
}) => `unexpected logLevel.
--- logLevel ---
${logLevel}
--- allowed log levels ---
${LOG_LEVEL_OFF}
${LOG_LEVEL_ERROR}
${LOG_LEVEL_WARN}
${LOG_LEVEL_INFO}
${LOG_LEVEL_DEBUG}
`;

const debug = console.debug;

const debugDisabled = () => {};

const info = console.info;

const infoDisabled = () => {};

const warn = console.warn;

const warnDisabled = () => {};

const error = console.error;

const errorDisabled = () => {};

// eslint-disable-next-line import/no-unresolved
const nodeRequire = require;
const filenameContainsBackSlashes = __filename.indexOf("\\") > -1;
const url = filenameContainsBackSlashes ? `file://${__filename.replace(/\\/g, "/")}` : `file://${__filename}`;

// https://github.com/npm/registry/blob/master/docs/REGISTRY-API.md#getpackageversion
// https://github.com/npm/registry-issue-archive/issues/34
// https://stackoverflow.com/questions/53212849/querying-information-about-specific-version-of-scoped-npm-package
const fetch = nodeRequire("node-fetch");

const fetchLatestInRegistry = async ({
  registryUrl,
  packageName,
  token
}) => {
  const requestUrl = `${registryUrl}/${packageName}`;
  const response = await fetch(requestUrl, {
    headers: {
      // "user-agent": "jsenv",
      accept: "application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*",
      ...(token ? {
        authorization: `token ${token}`
      } : {})
    },
    method: "GET"
  });
  const responseStatus = response.status;

  if (responseStatus === 404) {
    return null;
  }

  if (responseStatus !== 200) {
    throw new Error(writeUnexpectedResponseStatus({
      requestUrl,
      responseStatus,
      responseText: await response.text()
    }));
  }

  const packageObject = await response.json();
  return packageObject.versions[packageObject["dist-tags"].latest];
};

const writeUnexpectedResponseStatus = ({
  requestUrl,
  responseStatus,
  responseText
}) => `package registry response status should be 200.
--- request url ----
${requestUrl}
--- response status ---
${responseStatus}
--- response text ---
${responseText}`;

const startsWithWindowsDriveLetter = string => {
  const firstChar = string[0];
  if (!/[a-zA-Z]/.test(firstChar)) return false;
  const secondChar = string[1];
  if (secondChar !== ":") return false;
  return true;
};

const replaceSlashesWithBackSlashes = string => string.replace(/\//g, "\\");

const pathnameToOperatingSystemPath = pathname => {
  if (pathname[0] !== "/") throw new Error(`pathname must start with /, got ${pathname}`);
  const pathnameWithoutLeadingSlash = pathname.slice(1);

  if (startsWithWindowsDriveLetter(pathnameWithoutLeadingSlash) && pathnameWithoutLeadingSlash[2] === "/") {
    return replaceSlashesWithBackSlashes(pathnameWithoutLeadingSlash);
  } // linux mac pathname === operatingSystemFilename


  return pathname;
};

const isWindowsPath = path => startsWithWindowsDriveLetter(path) && path[2] === "\\";

const replaceBackSlashesWithSlashes = string => string.replace(/\\/g, "/");

const operatingSystemPathToPathname = operatingSystemPath => {
  if (isWindowsPath(operatingSystemPath)) {
    return `/${replaceBackSlashesWithSlashes(operatingSystemPath)}`;
  } // linux and mac operatingSystemFilename === pathname


  return operatingSystemPath;
};

const setNpmConfig = (configString, configObject) => {
  return Object.keys(configObject).reduce((previous, key) => {
    return setOrUpdateNpmConfig(previous, key, configObject[key]);
  }, configString);
};

const setOrUpdateNpmConfig = (config, key, value) => {
  const assignmentIndex = config.indexOf(`${key}=`);

  if (assignmentIndex === -1) {
    if (config === "") {
      return `${key}=${value}`;
    }

    return `${config}
${key}=${value}`;
  }

  const beforeAssignment = config.slice(0, assignmentIndex);
  const nextLineIndex = config.indexOf("\n", assignmentIndex);

  if (nextLineIndex === -1) {
    return `${beforeAssignment}${key}=${value}`;
  }

  const afterAssignment = config.slice(nextLineIndex);
  return `${beforeAssignment}${key}=${value}${afterAssignment}`;
};

const publish = async ({
  projectPath,
  registryUrl,
  token,
  logger
}) => {
  const projectPathname = operatingSystemPathToPathname(projectPath);
  const previousValue = process.env.NODE_AUTH_TOKEN;

  const restoreProcessEnv = () => {
    process.env.NODE_AUTH_TOKEN = previousValue;
  };

  const projectPackageFilePathname = `${projectPathname}/package.json`;
  const projectPackageFilePath = pathnameToOperatingSystemPath(projectPackageFilePathname);
  const projectPackageString = String(fs.readFileSync(projectPackageFilePath));

  const restoreProjectPackageFile = () => {
    fs.writeFileSync(projectPackageFilePath, projectPackageString);
  };

  const projectNpmConfigFilePathname = `${projectPathname}/.npmrc`;
  const projectNpmConfigFilePath = pathnameToOperatingSystemPath(projectNpmConfigFilePathname);
  let projectNpmConfigString;

  try {
    projectNpmConfigString = String(fs.readFileSync(projectNpmConfigFilePath));
  } catch (e) {
    if (e.code === "ENOENT") {
      projectNpmConfigString = "";
    } else {
      throw e;
    }
  }

  const restoreProjectNpmConfigFile = () => {
    fs.writeFileSync(projectNpmConfigFilePath, projectNpmConfigString);
  };

  process.env.NODE_AUTH_TOKEN = token;
  const projectPackageObject = JSON.parse(projectPackageString);
  projectPackageObject.publishConfig = projectPackageObject.publishConfig || {};
  projectPackageObject.publishConfig.registry = registryUrl;
  fs.writeFileSync(projectPackageFilePath, JSON.stringify(projectPackageObject, null, "  "));
  fs.writeFileSync(projectNpmConfigFilePath, setNpmConfig(projectNpmConfigString, {
    [computeRegistryTokenKey(registryUrl)]: token,
    [computeRegistryKey(projectPackageObject.name)]: registryUrl
  }));

  try {
    await new Promise((resolve, reject) => {
      const command = child_process.exec("npm publish", {
        cwd: projectPath,
        stdio: "silent"
      }, error => {
        if (error) {
          if (error.message.includes("EPUBLISHCONFLICT")) {
            // it certainly means a previous published worked
            // but registry is still busy so when we asked
            // for latest version is was not yet available
            resolve();
          } else {
            reject(error);
          }
        } else {
          resolve();
        }
      });
      command.stdout.on("data", data => {
        logger.debug(data);
      });
      command.stderr.on("data", data => {
        // debug because this output is part of
        // the error message generated by a failing npm publish
        logger.debug(data);
      });
    });
  } finally {
    restoreProcessEnv();
    restoreProjectPackageFile();
    restoreProjectNpmConfigFile();
  }
};

const computeRegistryTokenKey = registryUrl => {
  if (registryUrl.startsWith("http://")) {
    return `${registryUrl.slice("http:".length)}/:_authToken`;
  }

  if (registryUrl.startsWith("https://")) {
    return `${registryUrl.slice("https:".length)}/:_authToken`;
  }

  if (registryUrl.startsWith("//")) {
    return `${registryUrl}/:_authToken`;
  }

  throw new Error(`registryUrl must start with http or https, got ${registryUrl}`);
};

const computeRegistryKey = packageName => {
  if (packageName[0] === "@") {
    const packageScope = packageName.slice(0, packageName.indexOf("/"));
    return `${packageScope}:registry`;
  }

  return `registry`;
};

const readProjectPackage = async ({
  projectPath
}) => {
  if (typeof projectPath !== "string") {
    throw new Error(`projectPath must be a string.
--- project path ---
${projectPath}`);
  }

  const projectPathname = operatingSystemPathToPathname(projectPath);
  const packagePathname = `${projectPathname}/package.json`;
  const packagePath = pathnameToOperatingSystemPath(packagePathname);
  let packageInProject;

  try {
    const packageBuffer = await new Promise((resolve, reject) => {
      fs.readFile(packagePath, (error, buffer) => {
        if (error) {
          reject(error);
        } else {
          resolve(buffer);
        }
      });
    });
    const packageString = String(packageBuffer);

    try {
      packageInProject = JSON.parse(packageString);
    } catch (e) {
      if (e.name === "SyntaxError") {
        throw new Error(`syntax error while parsing project package.json
--- syntax error stack ---
${e.stack}
--- package.json path ---
${packagePath}`);
      }

      throw e;
    }
  } catch (e) {
    if (e.code === "ENOENT") {
      throw new Error(`cannot find project package.json
--- package.json path ---
${packagePath}`);
    }

    throw e;
  }

  return packageInProject;
};

const autoPublish = async ({
  projectPath,
  logLevel,
  registryMap
} = {}) => {
  const logger = createLogger({
    logLevel
  });
  logger.debug(`autoPublish(${JSON.stringify({
    projectPath,
    logLevel,
    registryMap
  }, null, "  ")})`);
  assertRegistryMap(registryMap);
  logger.debug(`reading project package.json`);
  const packageInProject = await readProjectPackage({
    projectPath
  });
  const {
    name: packageName,
    version: packageVersion
  } = packageInProject;
  logger.debug(`${packageName}@${packageVersion} found in package.json`);
  const toPublish = [];
  await Promise.all(Object.keys(registryMap).map(async registryUrl => {
    logger.debug(`fetching latest package in ${registryUrl}`);
    const registryConfig = registryMap[registryUrl];

    try {
      const latestPackageInRegistry = await fetchLatestInRegistry({
        registryUrl,
        packageName,
        ...registryConfig
      });

      if (latestPackageInRegistry === null) {
        logger.debug(`${packageName} never published on ${registryUrl}`);
        toPublish.push(registryUrl);
        return;
      }

      const latestVersionOnRegistry = latestPackageInRegistry.version;

      if (latestVersionOnRegistry !== packageVersion) {
        logger.debug(`${packageName} latest version on ${registryUrl} is ${latestVersionOnRegistry}`);
        toPublish.push(registryUrl);
        return;
      }

      logger.info(`${packageName}@${packageVersion} already published on ${registryUrl}`);
      return;
    } catch (e) {
      logger.error(e.message);
      return;
    }
  })); // we have to publish in serie because we don't fully control
  // npm publish, we have to enforce where the package gets published

  await toPublish.reduce((previous, registryUrl) => {
    return previous.then(async () => {
      logger.info(`publishing ${packageName}@${packageVersion} on ${registryUrl}`);
      await publish({
        projectPath,
        logger,
        registryUrl,
        ...registryMap[registryUrl]
      });
      logger.info(`${packageName}@${packageVersion} published on ${registryUrl}`);
    });
  }, Promise.resolve());
};

const assertRegistryMap = value => {
  if (typeof value !== "object") {
    throw new TypeError(`registryMap must be an object.
--- registryMap ---
${value}`);
  }

  Object.keys(value).forEach(registryUrl => {
    const registryMapValue = value[registryUrl];

    if (typeof registryMapValue !== "object") {
      throw new TypeError(`found unexpected registryMap value: it must be an object.
--- registryMap value ---
${registryMapValue}
--- registryMap key ---
${registryUrl}`);
    }

    if (`token` in registryMapValue === false) {
      throw new TypeError(`missing token in registryMap.
--- registryMap key ---
${registryUrl}`);
    }

    if (typeof registryMapValue.token !== "string") {
      throw new TypeError(`unexpected token found in registryMap: it must be a string.
--- token ---
${registryMapValue.token}
--- registryMap key ---
${registryUrl}`);
    }
  });
};

// https://developer.github.com/v3/git/refs/#get-a-single-reference
const fetch$1 = nodeRequire("node-fetch");

const getGithubRelease = async ({
  githubToken,
  githubRepositoryOwner,
  githubRepositoryName,
  githubReleaseName
}) => {
  const requestUrl = `https://api.github.com/repos/${githubRepositoryOwner}/${githubRepositoryName}/git/ref/tags/${githubReleaseName}`;
  const response = await fetch$1(requestUrl, {
    headers: {
      authorization: `token ${githubToken}`
    },
    method: "GET"
  });
  const responseStatus = response.status;

  if (responseStatus === 404) {
    return null;
  }

  if (responseStatus !== 200) {
    throw new Error(writeUnexpectedResponseStatus$1({
      requestUrl,
      responseStatus,
      responseText: await response.text()
    }));
  }

  const responseJson = await response.json();
  return responseJson;
};

const writeUnexpectedResponseStatus$1 = ({
  requestUrl,
  responseStatus,
  responseText
}) => `github api response status should be 200.
--- request url ----
${requestUrl}
--- response status ---
${responseStatus}
--- response text ---
${responseText}`;

// https://developer.github.com/v3/git/tags/
const fetch$2 = nodeRequire("node-fetch");

const createGithubRelease = async ({
  githubToken,
  githubRepositoryOwner,
  githubRepositoryName,
  githubSha,
  githubReleaseName
}) => {
  const requestUrl = `https://api.github.com/repos/${githubRepositoryOwner}/${githubRepositoryName}/git/refs`;
  const body = JSON.stringify({
    ref: `refs/tags/${githubReleaseName}`,
    sha: githubSha
  });
  const response = await fetch$2(requestUrl, {
    headers: {
      authorization: `token ${githubToken}`,
      "content-length": Buffer.byteLength(body)
    },
    method: "POST",
    body
  });
  const responseStatus = response.status;

  if (responseStatus !== 201) {
    throw new Error(writeUnexpectedResponseStatus$2({
      requestUrl,
      responseStatus,
      responseText: await response.text()
    }));
  }

  const responseJson = await response.json();
  return responseJson;
};

const writeUnexpectedResponseStatus$2 = ({
  requestUrl,
  responseStatus,
  responseText
}) => `github api response status should be 201.
--- request url ----
${requestUrl}
--- response status ---
${responseStatus}
--- response text ---
${responseText}`;

const autoReleaseOnGithub = async ({
  projectPath,
  logLevel
}) => {
  const logger = createLogger({
    logLevel
  });
  logger.debug(`autoReleaseOnGithub(${JSON.stringify({
    projectPath,
    logLevel
  }, null, "  ")})`);
  const {
    githubToken,
    githubRepositoryOwner,
    githubRepositoryName,
    githubSha
  } = getOptionsFromGithubAction();
  logger.debug(`reading project package.json`);
  const {
    packageVersion
  } = await getOptionsFromProjectPackage({
    projectPath
  });
  logger.debug(`${packageVersion} found in package.json`);
  logger.debug(`search release for ${packageVersion} on github`);
  const githubReleaseName = `v${packageVersion}`;
  const existingRelease = await getGithubRelease({
    githubToken,
    githubRepositoryOwner,
    githubRepositoryName,
    githubReleaseName
  });

  if (existingRelease) {
    logger.info(`${packageVersion} already released at ${generateReleaseUrl({
      githubRepositoryOwner,
      githubRepositoryName,
      githubReleaseName
    })}`);
    return;
  }

  logger.info(`creating release for ${packageVersion}`);
  await createGithubRelease({
    githubToken,
    githubRepositoryOwner,
    githubRepositoryName,
    githubSha,
    githubReleaseName
  });
  logger.info(`release created at ${generateReleaseUrl({
    githubRepositoryOwner,
    githubRepositoryName,
    githubReleaseName
  })}`);
  return;
};

const generateReleaseUrl = ({
  githubRepositoryOwner,
  githubRepositoryName,
  githubReleaseName
}) => {
  return `https://github.com/${githubRepositoryOwner}/${githubRepositoryName}/releases/tag/${githubReleaseName}`;
};

const getOptionsFromGithubAction = () => {
  const eventName = process.env.GITHUB_EVENT_NAME;

  if (!eventName) {
    throw new Error(`missing process.env.GITHUB_EVENT_NAME, we are not in a github action`);
  }

  if (eventName !== "push") {
    throw new Error(`getOptionsFromGithubAction must be called only in a push action`);
  }

  const githubRepository = process.env.GITHUB_REPOSITORY;

  if (!githubRepository) {
    throw new Error(`missing process.env.GITHUB_REPOSITORY`);
  }

  const [githubRepositoryOwner, githubRepositoryName] = githubRepository.split("/");
  const githubToken = process.env.GITHUB_TOKEN;

  if (!githubToken) {
    throw new Error(`missing process.env.GITHUB_TOKEN`);
  }

  const githubSha = process.env.GITHUB_SHA;

  if (!githubSha) {
    throw new Error(`missing process.env.GITHUB_SHA`);
  }

  return {
    githubRepositoryOwner,
    githubRepositoryName,
    githubToken,
    githubSha
  };
};

const getOptionsFromProjectPackage = async ({
  projectPath
}) => {
  const projectPackage = await readProjectPackage({
    projectPath
  });
  return {
    packageVersion: projectPackage.version
  };
};

exports.autoPublish = autoPublish;
exports.autoReleaseOnGithub = autoReleaseOnGithub;
//# sourceMappingURL=main.js.map
