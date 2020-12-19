'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var logger = require('@jsenv/logger');
var cancellation = require('@jsenv/cancellation');
var util = require('@jsenv/util');
var server = require('@jsenv/server');
var child_process = require('child_process');
var module$1 = require('module');

// https://github.com/npm/registry/blob/master/docs/REGISTRY-API.md#getpackageversion
const fetchLatestInRegistry = async ({
  registryUrl,
  packageName,
  token
}) => {
  const requestUrl = `${registryUrl}/${packageName}`;
  const response = await server.fetchUrl(requestUrl, {
    method: "GET",
    headers: {
      // "user-agent": "jsenv",
      accept: "application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*",
      ...(token ? {
        authorization: `token ${token}`
      } : {})
    }
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
  logger,
  logNpmPublishOutput,
  projectDirectoryUrl,
  registryUrl,
  token
}) => {
  try {
    const promises = [];
    const previousValue = process.env.NODE_AUTH_TOKEN;

    const restoreProcessEnv = () => {
      process.env.NODE_AUTH_TOKEN = previousValue;
    };

    process.env.NODE_AUTH_TOKEN = token;
    const projectPackageFileUrl = util.resolveUrl("./package.json", projectDirectoryUrl);
    const projectPackageString = await util.readFile(projectPackageFileUrl);

    const restoreProjectPackageFile = () => util.writeFile(projectPackageFileUrl, projectPackageString);

    const projectPackageObject = JSON.parse(projectPackageString);
    projectPackageObject.publishConfig = projectPackageObject.publishConfig || {};
    projectPackageObject.publishConfig.registry = registryUrl;
    promises.push(util.writeFile(projectPackageFileUrl, JSON.stringify(projectPackageObject, null, "  ")));
    const projectNpmConfigFileUrl = util.resolveUrl("./.npmrc", projectDirectoryUrl);
    let projectNpmConfigString;

    try {
      projectNpmConfigString = await util.readFile(projectNpmConfigFileUrl);
    } catch (e) {
      if (e.code === "ENOENT") {
        projectNpmConfigString = "";
      } else {
        throw e;
      }
    }

    const restoreProjectNpmConfigFile = () => util.writeFile(projectNpmConfigFileUrl, projectNpmConfigString);

    promises.push(util.writeFile(projectNpmConfigFileUrl, setNpmConfig(projectNpmConfigString, {
      [computeRegistryTokenKey(registryUrl)]: token,
      [computeRegistryKey(projectPackageObject.name)]: registryUrl
    })));
    await Promise.all(promises);

    try {
      return await new Promise((resolve, reject) => {
        const command = child_process.exec("npm publish", {
          cwd: util.urlToFileSystemPath(projectDirectoryUrl),
          stdio: "silent"
        }, error => {
          if (error) {
            // publish conflict generally occurs because servers
            // returns 200 after npm publish
            // but returns previous version if asked immediatly
            // after for the last published version.
            // npm publish conclit
            if (error.message.includes("EPUBLISHCONFLICT")) {
              resolve({
                success: true,
                reason: "already-published"
              });
            } else if (error.message.includes("Cannot publish over existing version")) {
              resolve({
                success: true,
                reason: "already-published"
              });
            } else if (error.message.includes("You cannot publish over the previously published versions")) {
              resolve({
                success: true,
                reason: "already-published"
              });
            } // github publish conflict
            else if (error.message.includes("ambiguous package version in package.json")) {
                resolve({
                  success: true,
                  reason: "already-published"
                });
              } else {
                reject(error);
              }
          } else {
            resolve({
              success: true,
              reason: "published"
            });
          }
        });

        if (logNpmPublishOutput) {
          command.stdout.on("data", data => {
            logger.debug(data);
          });
          command.stderr.on("data", data => {
            // debug because this output is part of
            // the error message generated by a failing npm publish
            logger.debug(data);
          });
        }
      });
    } finally {
      await Promise.all([restoreProcessEnv(), restoreProjectPackageFile(), restoreProjectNpmConfigFile()]);
    }
  } catch (e) {
    return {
      success: false,
      reason: e
    };
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
  projectDirectoryUrl
}) => {
  const packageFileUrl = util.resolveUrl("./package.json", projectDirectoryUrl);
  let packageObject;

  try {
    const packageString = await util.readFile(packageFileUrl);

    try {
      packageObject = JSON.parse(packageString);
    } catch (e) {
      if (e.name === "SyntaxError") {
        throw new Error(`syntax error while parsing project package.json
--- syntax error stack ---
${e.stack}
--- package.json path ---
${util.urlToFileSystemPath(packageFileUrl)}`);
      }

      throw e;
    }
  } catch (e) {
    if (e.code === "ENOENT") {
      throw new Error(`cannot find project package.json
--- package.json path ---
${util.urlToFileSystemPath(packageFileUrl)}`);
    }

    throw e;
  }

  return packageObject;
};

/* global __filename */
const filenameContainsBackSlashes = __filename.indexOf("\\") > -1;
const url = filenameContainsBackSlashes ? `file:///${__filename.replace(/\\/g, "/")}` : `file://${__filename}`;

const require$1 = module$1.createRequire(url); // https://github.com/npm/node-semver#readme


const {
  gt: versionGreaterThan,
  prerelease: versionToPrerelease
} = require$1("semver");

const PUBLISH_BECAUSE_NEVER_PUBLISHED = "never-published";
const PUBLISH_BECAUSE_LATEST_LOWER = "latest-lower";
const PUBLISH_BECAUSE_TAG_DIFFERS = "tag-differs";
const NOTHING_BECAUSE_LATEST_HIGHER = "latest-higher";
const NOTHING_BECAUSE_ALREADY_PUBLISHED = "already-published";
const needsPublish = ({
  registryLatestVersion,
  packageVersion
}) => {
  if (registryLatestVersion === null) {
    return PUBLISH_BECAUSE_NEVER_PUBLISHED;
  }

  if (registryLatestVersion === packageVersion) {
    return NOTHING_BECAUSE_ALREADY_PUBLISHED;
  }

  if (versionGreaterThan(registryLatestVersion, packageVersion)) {
    return NOTHING_BECAUSE_LATEST_HIGHER;
  }

  const registryLatestVersionPrerelease = versionToPrerelease(registryLatestVersion);
  const packageVersionPrerelease = versionToPrerelease(packageVersion);

  if (registryLatestVersionPrerelease === null && packageVersionPrerelease === null) {
    return PUBLISH_BECAUSE_LATEST_LOWER;
  }

  if (registryLatestVersionPrerelease === null && packageVersionPrerelease !== null) {
    return PUBLISH_BECAUSE_LATEST_LOWER;
  }

  if (registryLatestVersionPrerelease !== null && packageVersionPrerelease === null) {
    return PUBLISH_BECAUSE_LATEST_LOWER;
  }

  const [registryReleaseTag, registryPrereleaseVersion] = registryLatestVersionPrerelease;
  const [packageReleaseTag, packagePreReleaseVersion] = packageVersionPrerelease;

  if (registryReleaseTag !== packageReleaseTag) {
    return PUBLISH_BECAUSE_TAG_DIFFERS;
  }

  if (registryPrereleaseVersion === packagePreReleaseVersion) {
    return NOTHING_BECAUSE_ALREADY_PUBLISHED;
  }

  if (registryPrereleaseVersion > packagePreReleaseVersion) {
    return NOTHING_BECAUSE_LATEST_HIGHER;
  }

  return PUBLISH_BECAUSE_LATEST_LOWER;
};

const publishPackage = async ({
  cancellationToken = cancellation.createCancellationTokenForProcess(),
  logLevel,
  projectDirectoryUrl,
  registriesConfig,
  logNpmPublishOutput = true,
  updateProcessExitCode = true
} = {}) => {
  return cancellation.executeAsyncFunction(async () => {
    const logger$1 = logger.createLogger({
      logLevel
    });
    logger$1.debug(`publishPackage(${JSON.stringify({
      projectDirectoryUrl,
      logLevel,
      registriesConfig
    }, null, "  ")})`);
    projectDirectoryUrl = util.assertAndNormalizeDirectoryUrl(projectDirectoryUrl);
    assertRegistriesConfig(registriesConfig);
    logger$1.debug(`reading project package.json`);
    const packageInProject = await readProjectPackage({
      projectDirectoryUrl
    });
    const {
      name: packageName,
      version: packageVersion
    } = packageInProject;
    logger$1.info(`${packageName}@${packageVersion} found in package.json`);
    const report = {};
    await Promise.all(Object.keys(registriesConfig).map(async registryUrl => {
      const registryReport = {
        packageName,
        packageVersion,
        registryLatestVersion: undefined,
        action: undefined,
        actionReason: undefined,
        actionResult: undefined
      };
      report[registryUrl] = registryReport;
      logger$1.debug(`check latest version for ${packageName} in ${registryUrl}`);
      const registryConfig = registriesConfig[registryUrl];

      try {
        const latestPackageInRegistry = await fetchLatestInRegistry({
          registryUrl,
          packageName,
          ...registryConfig
        });
        const registryLatestVersion = latestPackageInRegistry === null ? null : latestPackageInRegistry.version;
        registryReport.registryLatestVersion = registryLatestVersion;
        const needs = needsPublish({
          packageVersion,
          registryLatestVersion
        });
        registryReport.action = needs === PUBLISH_BECAUSE_NEVER_PUBLISHED || needs === PUBLISH_BECAUSE_LATEST_LOWER || needs === PUBLISH_BECAUSE_TAG_DIFFERS ? "publish" : "nothing";
        registryReport.actionReason = needs;
      } catch (e) {
        registryReport.action = "nothing";
        registryReport.actionReason = e;

        if (updateProcessExitCode) {
          process.exitCode = 1;
        }
      }

      cancellationToken.throwIfRequested();
    })); // we have to publish in serie because we don't fully control
    // npm publish, we have to enforce where the package gets published

    await Object.keys(report).reduce(async (previous, registryUrl) => {
      await previous;
      cancellationToken.throwIfRequested();
      const registryReport = report[registryUrl];
      const {
        action,
        actionReason,
        registryLatestVersion
      } = registryReport;

      if (action === "nothing") {
        if (actionReason === NOTHING_BECAUSE_ALREADY_PUBLISHED) {
          logger$1.info(`skip ${packageName}@${packageVersion} publish on ${registryUrl} because already published`);
        } else if (actionReason === NOTHING_BECAUSE_LATEST_HIGHER) {
          logger$1.info(`skip ${packageName}@${packageVersion} publish on ${registryUrl} because latest version is higher (${registryLatestVersion})`);
        } else {
          logger$1.error(`skip ${packageName}@${packageVersion} publish on ${registryUrl} due to error while fetching latest version.
--- error stack ---
${actionReason.stack}`);
        }

        registryReport.actionResult = {
          success: true,
          reason: "nothing-to-do"
        };
        return;
      }

      if (actionReason === PUBLISH_BECAUSE_NEVER_PUBLISHED) {
        logger$1.info(`publish ${packageName}@${packageVersion} on ${registryUrl} because it was never published`);
      } else if (actionReason === PUBLISH_BECAUSE_LATEST_LOWER) {
        logger$1.info(`publish ${packageName}@${packageVersion} on ${registryUrl} because latest version is lower (${registryLatestVersion})`);
      } else if (actionReason === PUBLISH_BECAUSE_TAG_DIFFERS) {
        logger$1.info(`publish ${packageName}@${packageVersion} on ${registryUrl} because latest tag differs (${registryLatestVersion})`);
      }

      const {
        success,
        reason
      } = await publish({
        logger: logger$1,
        logNpmPublishOutput,
        projectDirectoryUrl,
        registryUrl,
        ...registriesConfig[registryUrl]
      });
      registryReport.actionResult = {
        success,
        reason
      };

      if (success) {
        if (reason === "already-published") {
          logger$1.info(`${packageName}@${packageVersion} was already published on ${registryUrl}`);
        } else {
          logger$1.info(`${packageName}@${packageVersion} published on ${registryUrl}`);
        }
      } else {
        logger$1.error(`error when publishing ${packageName}@${packageVersion} in ${registryUrl}
--- error stack ---
${reason.stack}`);

        if (updateProcessExitCode) {
          process.exitCode = 1;
        }
      }
    }, Promise.resolve());
    return report;
  }, {
    catchCancellation: true,
    considerUnhandledRejectionsAsExceptions: true
  });
};

const assertRegistriesConfig = value => {
  if (typeof value !== "object") {
    throw new TypeError(`registriesConfig must be an object.
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

exports.publishPackage = publishPackage;

//# sourceMappingURL=main.cjs.map