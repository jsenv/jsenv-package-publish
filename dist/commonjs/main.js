'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var module$1 = require('module');
var url$1 = require('url');
var fs = require('fs');
var crypto = require('crypto');
var path = require('path');
var util = require('util');
require('net');
require('http');
require('https');
require('stream');
var child_process = require('child_process');

var nativeTypeOf = function nativeTypeOf(obj) {
  return typeof obj;
};

var customTypeOf = function customTypeOf(obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? nativeTypeOf : customTypeOf;

var _defineProperty = (function (obj, key, value) {
  // Shortcircuit the slow defineProperty path when possible.
  // We are trying to avoid issues where setters defined on the
  // prototype cause side effects under the fast path of simple
  // assignment. By checking for existence of the property with
  // the in operator, we can optimize most of this overhead away.
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
});

function _objectSpread (target) {
  for (var i = 1; i < arguments.length; i++) {
    // eslint-disable-next-line prefer-rest-params
    var source = arguments[i] === null ? {} : arguments[i];

    if (i % 2) {
      // eslint-disable-next-line no-loop-func
      ownKeys(Object(source), true).forEach(function (key) {
        _defineProperty(target, key, source[key]);
      });
    } else if (Object.getOwnPropertyDescriptors) {
      Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
    } else {
      // eslint-disable-next-line no-loop-func
      ownKeys(Object(source)).forEach(function (key) {
        Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
      });
    }
  }

  return target;
} // This function is different to "Reflect.ownKeys". The enumerableOnly
// filters on symbol properties only. Returned string properties are always
// enumerable. It is good to use in objectSpread.

function ownKeys(object, enumerableOnly) {
  var keys = Object.keys(object);

  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);
    if (enumerableOnly) symbols = symbols.filter(function (sym) {
      return Object.getOwnPropertyDescriptor(object, sym).enumerable;
    }); // eslint-disable-next-line prefer-spread

    keys.push.apply(keys, symbols);
  }

  return keys;
}

// eslint-disable-next-line import/no-unresolved
var nodeRequire = require;
var filenameContainsBackSlashes = __filename.indexOf("\\") > -1;
var url = filenameContainsBackSlashes ? "file:///".concat(__filename.replace(/\\/g, "/")) : "file://".concat(__filename);

var LOG_LEVEL_OFF = "off";
var LOG_LEVEL_DEBUG = "debug";
var LOG_LEVEL_INFO = "info";
var LOG_LEVEL_WARN = "warn";
var LOG_LEVEL_ERROR = "error";

var createLogger = function createLogger() {
  var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      _ref$logLevel = _ref.logLevel,
      logLevel = _ref$logLevel === void 0 ? LOG_LEVEL_INFO : _ref$logLevel;

  if (logLevel === LOG_LEVEL_DEBUG) {
    return {
      debug: debug,
      info: info,
      warn: warn,
      error: error
    };
  }

  if (logLevel === LOG_LEVEL_INFO) {
    return {
      debug: debugDisabled,
      info: info,
      warn: warn,
      error: error
    };
  }

  if (logLevel === LOG_LEVEL_WARN) {
    return {
      debug: debugDisabled,
      info: infoDisabled,
      warn: warn,
      error: error
    };
  }

  if (logLevel === LOG_LEVEL_ERROR) {
    return {
      debug: debugDisabled,
      info: infoDisabled,
      warn: warnDisabled,
      error: error
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

  throw new Error("unexpected logLevel.\n--- logLevel ---\n".concat(logLevel, "\n--- allowed log levels ---\n").concat(LOG_LEVEL_OFF, "\n").concat(LOG_LEVEL_ERROR, "\n").concat(LOG_LEVEL_WARN, "\n").concat(LOG_LEVEL_INFO, "\n").concat(LOG_LEVEL_DEBUG));
};
var debug = console.debug;

var debugDisabled = function debugDisabled() {};

var info = console.info;

var infoDisabled = function infoDisabled() {};

var warn = console.warn;

var warnDisabled = function warnDisabled() {};

var error = console.error;

var errorDisabled = function errorDisabled() {};

var objectWithoutPropertiesLoose = (function (source, excluded) {
  if (source === null) return {};
  var target = {};
  var sourceKeys = Object.keys(source);
  var key;
  var i;

  for (i = 0; i < sourceKeys.length; i++) {
    key = sourceKeys[i];
    if (excluded.indexOf(key) >= 0) continue;
    target[key] = source[key];
  }

  return target;
});

var _objectWithoutProperties = (function (source, excluded) {
  if (source === null) return {};
  var target = objectWithoutPropertiesLoose(source, excluded);
  var key;
  var i;

  if (Object.getOwnPropertySymbols) {
    var sourceSymbolKeys = Object.getOwnPropertySymbols(source);

    for (i = 0; i < sourceSymbolKeys.length; i++) {
      key = sourceSymbolKeys[i];
      if (excluded.indexOf(key) >= 0) continue;
      if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue;
      target[key] = source[key];
    }
  }

  return target;
});

var ensureUrlTrailingSlash = function ensureUrlTrailingSlash(url) {
  return url.endsWith("/") ? url : "".concat(url, "/");
};

var isFileSystemPath = function isFileSystemPath(value) {
  if (typeof value !== "string") {
    throw new TypeError("isFileSystemPath first arg must be a string, got ".concat(value));
  }

  if (value[0] === "/") return true;
  return startsWithWindowsDriveLetter(value);
};

var startsWithWindowsDriveLetter = function startsWithWindowsDriveLetter(string) {
  var firstChar = string[0];
  if (!/[a-zA-Z]/.test(firstChar)) return false;
  var secondChar = string[1];
  if (secondChar !== ":") return false;
  return true;
};

var fileSystemPathToUrl = function fileSystemPathToUrl(value) {
  if (!isFileSystemPath(value)) {
    throw new Error("received an invalid value for fileSystemPath: ".concat(value));
  }

  return String(url$1.pathToFileURL(value));
};

var assertAndNormalizeDirectoryUrl = function assertAndNormalizeDirectoryUrl(value) {
  var urlString;

  if (value instanceof URL) {
    urlString = value.href;
  } else if (typeof value === "string") {
    if (isFileSystemPath(value)) {
      urlString = fileSystemPathToUrl(value);
    } else {
      try {
        urlString = String(new URL(value));
      } catch (e) {
        throw new TypeError("directoryUrl must be a valid url, received ".concat(value));
      }
    }
  } else {
    throw new TypeError("directoryUrl must be a string or an url, received ".concat(value));
  }

  if (!urlString.startsWith("file://")) {
    throw new Error("directoryUrl must starts with file://, received ".concat(value));
  }

  return ensureUrlTrailingSlash(urlString);
};

var assertAndNormalizeFileUrl = function assertAndNormalizeFileUrl(value, baseUrl) {
  var urlString;

  if (value instanceof URL) {
    urlString = value.href;
  } else if (typeof value === "string") {
    if (isFileSystemPath(value)) {
      urlString = fileSystemPathToUrl(value);
    } else {
      try {
        urlString = String(new URL(value, baseUrl));
      } catch (e) {
        throw new TypeError("fileUrl must be a valid url, received ".concat(value));
      }
    }
  } else {
    throw new TypeError("fileUrl must be a string or an url, received ".concat(value));
  }

  if (!urlString.startsWith("file://")) {
    throw new Error("fileUrl must starts with file://, received ".concat(value));
  }

  return urlString;
};

var statsToType = function statsToType(stats) {
  if (stats.isFile()) return "file";
  if (stats.isDirectory()) return "directory";
  if (stats.isSymbolicLink()) return "symbolic-link";
  if (stats.isFIFO()) return "fifo";
  if (stats.isSocket()) return "socket";
  if (stats.isCharacterDevice()) return "character-device";
  if (stats.isBlockDevice()) return "block-device";
  return undefined;
};

var urlToFileSystemPath = function urlToFileSystemPath(fileUrl) {
  if (fileUrl[fileUrl.length - 1] === "/") {
    // remove trailing / so that nodejs path becomes predictable otherwise it logs
    // the trailing slash on linux but does not on windows
    fileUrl = fileUrl.slice(0, -1);
  }

  var fileSystemPath = url$1.fileURLToPath(fileUrl);
  return fileSystemPath;
};

// https://github.com/coderaiser/cloudcmd/issues/63#issuecomment-195478143
// https://nodejs.org/api/fs.html#fs_file_modes
// https://github.com/TooTallNate/stat-mode
// cannot get from fs.constants because they are not available on windows
var S_IRUSR = 256;
/* 0000400 read permission, owner */

var S_IWUSR = 128;
/* 0000200 write permission, owner */

var S_IXUSR = 64;
/* 0000100 execute/search permission, owner */

var S_IRGRP = 32;
/* 0000040 read permission, group */

var S_IWGRP = 16;
/* 0000020 write permission, group */

var S_IXGRP = 8;
/* 0000010 execute/search permission, group */

var S_IROTH = 4;
/* 0000004 read permission, others */

var S_IWOTH = 2;
/* 0000002 write permission, others */

var S_IXOTH = 1;
var permissionsToBinaryFlags = function permissionsToBinaryFlags(_ref) {
  var owner = _ref.owner,
      group = _ref.group,
      others = _ref.others;
  var binaryFlags = 0;
  if (owner.read) binaryFlags |= S_IRUSR;
  if (owner.write) binaryFlags |= S_IWUSR;
  if (owner.execute) binaryFlags |= S_IXUSR;
  if (group.read) binaryFlags |= S_IRGRP;
  if (group.write) binaryFlags |= S_IWGRP;
  if (group.execute) binaryFlags |= S_IXGRP;
  if (others.read) binaryFlags |= S_IROTH;
  if (others.write) binaryFlags |= S_IWOTH;
  if (others.execute) binaryFlags |= S_IXOTH;
  return binaryFlags;
};

function _async(f) {
  return function () {
    for (var args = [], i = 0; i < arguments.length; i++) {
      args[i] = arguments[i];
    }

    try {
      return Promise.resolve(f.apply(this, args));
    } catch (e) {
      return Promise.reject(e);
    }
  };
}

var writeFileSystemNodePermissions = _async(function (source, permissions) {
  var sourceUrl = assertAndNormalizeFileUrl(source);
  var sourcePath = urlToFileSystemPath(sourceUrl);
  var binaryFlags;

  if (_typeof(permissions) === "object") {
    permissions = {
      owner: {
        read: getPermissionOrComputeDefault("read", "owner", permissions),
        write: getPermissionOrComputeDefault("write", "owner", permissions),
        execute: getPermissionOrComputeDefault("execute", "owner", permissions)
      },
      group: {
        read: getPermissionOrComputeDefault("read", "group", permissions),
        write: getPermissionOrComputeDefault("write", "group", permissions),
        execute: getPermissionOrComputeDefault("execute", "group", permissions)
      },
      others: {
        read: getPermissionOrComputeDefault("read", "others", permissions),
        write: getPermissionOrComputeDefault("write", "others", permissions),
        execute: getPermissionOrComputeDefault("execute", "others", permissions)
      }
    };
    binaryFlags = permissionsToBinaryFlags(permissions);
  } else {
    binaryFlags = permissions;
  }

  return chmodNaive(sourcePath, binaryFlags);
});

var chmodNaive = function chmodNaive(fileSystemPath, binaryFlags) {
  return new Promise(function (resolve, reject) {
    fs.chmod(fileSystemPath, binaryFlags, function (error) {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
};

var actionLevels = {
  read: 0,
  write: 1,
  execute: 2
};
var subjectLevels = {
  others: 0,
  group: 1,
  owner: 2
};

var getPermissionOrComputeDefault = function getPermissionOrComputeDefault(action, subject, permissions) {
  if (subject in permissions) {
    var subjectPermissions = permissions[subject];

    if (action in subjectPermissions) {
      return subjectPermissions[action];
    }

    var actionLevel = actionLevels[action];
    var actionFallback = Object.keys(actionLevels).find(function (actionFallbackCandidate) {
      return actionLevels[actionFallbackCandidate] > actionLevel && actionFallbackCandidate in subjectPermissions;
    });

    if (actionFallback) {
      return subjectPermissions[actionFallback];
    }
  }

  var subjectLevel = subjectLevels[subject]; // do we have a subject with a stronger level (group or owner)
  // where we could read the action permission ?

  var subjectFallback = Object.keys(subjectLevels).find(function (subjectFallbackCandidate) {
    return subjectLevels[subjectFallbackCandidate] > subjectLevel && subjectFallbackCandidate in permissions;
  });

  if (subjectFallback) {
    var _subjectPermissions = permissions[subjectFallback];
    return action in _subjectPermissions ? _subjectPermissions[action] : getPermissionOrComputeDefault(action, subjectFallback, permissions);
  }

  return false;
};

function _async$1(f) {
  return function () {
    for (var args = [], i = 0; i < arguments.length; i++) {
      args[i] = arguments[i];
    }

    try {
      return Promise.resolve(f.apply(this, args));
    } catch (e) {
      return Promise.reject(e);
    }
  };
}

var isWindows = process.platform === "win32";

function _await(value, then, direct) {
  if (direct) {
    return then ? then(value) : value;
  }

  if (!value || !value.then) {
    value = Promise.resolve(value);
  }

  return then ? value.then(then) : value;
}

function _catch(body, recover) {
  try {
    var result = body();
  } catch (e) {
    return recover(e);
  }

  if (result && result.then) {
    return result.then(void 0, recover);
  }

  return result;
}

var readFileSystemNodeStat = _async$1(function (source) {
  var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
      _ref$nullIfNotFound = _ref.nullIfNotFound,
      nullIfNotFound = _ref$nullIfNotFound === void 0 ? false : _ref$nullIfNotFound,
      _ref$followLink = _ref.followLink,
      followLink = _ref$followLink === void 0 ? true : _ref$followLink;

  if (source.endsWith("/")) source = source.slice(0, -1);
  var sourceUrl = assertAndNormalizeFileUrl(source);
  var sourcePath = urlToFileSystemPath(sourceUrl);
  var handleNotFoundOption = nullIfNotFound ? {
    handleNotFoundError: function handleNotFoundError() {
      return null;
    }
  } : {};
  return readStat(sourcePath, _objectSpread({
    followLink: followLink
  }, handleNotFoundOption, {}, isWindows ? {
    // Windows can EPERM on stat
    handlePermissionDeniedError: _async$1(function (error) {
      // unfortunately it means we mutate the permissions
      // without being able to restore them to the previous value
      // (because reading current permission would also throw)
      return _catch(function () {
        return _await(writeFileSystemNodePermissions(sourceUrl, 438), function () {
          return _await(readStat(sourcePath, _objectSpread({
            followLink: followLink
          }, handleNotFoundOption, {
            // could not fix the permission error, give up and throw original error
            handlePermissionDeniedError: function handlePermissionDeniedError() {
              throw error;
            }
          })));
        });
      }, function () {
        // failed to write permission or readState, throw original error as well
        throw error;
      });
    })
  } : {}));
});

var readStat = function readStat(sourcePath) {
  var _ref2 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
      followLink = _ref2.followLink,
      _ref2$handleNotFoundE = _ref2.handleNotFoundError,
      handleNotFoundError = _ref2$handleNotFoundE === void 0 ? null : _ref2$handleNotFoundE,
      _ref2$handlePermissio = _ref2.handlePermissionDeniedError,
      handlePermissionDeniedError = _ref2$handlePermissio === void 0 ? null : _ref2$handlePermissio;

  var nodeMethod = followLink ? fs.stat : fs.lstat;
  return new Promise(function (resolve, reject) {
    nodeMethod(sourcePath, function (error, statsObject) {
      if (error) {
        if (handlePermissionDeniedError && (error.code === "EPERM" || error.code === "EACCES")) {
          resolve(handlePermissionDeniedError(error));
        } else if (handleNotFoundError && error.code === "ENOENT") {
          resolve(handleNotFoundError(error));
        } else {
          reject(error);
        }
      } else {
        resolve(statsObject);
      }
    });
  });
};

var ETAG_FOR_EMPTY_CONTENT = '"0-2jmj7l5rSw0yVb/vlWAYkK/YBwk"';
var bufferToEtag = function bufferToEtag(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError("buffer expected, got ".concat(buffer));
  }

  if (buffer.length === 0) {
    return ETAG_FOR_EMPTY_CONTENT;
  }

  var hash = crypto.createHash("sha1");
  hash.update(buffer, "utf8");
  var hashBase64String = hash.digest("base64");
  var hashBase64StringSubset = hashBase64String.slice(0, 27);
  var length = buffer.length;
  return "\"".concat(length.toString(16), "-").concat(hashBase64StringSubset, "\"");
};

function _async$2(f) {
  return function () {
    for (var args = [], i = 0; i < arguments.length; i++) {
      args[i] = arguments[i];
    }

    try {
      return Promise.resolve(f.apply(this, args));
    } catch (e) {
      return Promise.reject(e);
    }
  };
}

var readDirectory = _async$2(function (url) {
  var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
      _ref$emfileMaxWait = _ref.emfileMaxWait,
      emfileMaxWait = _ref$emfileMaxWait === void 0 ? 1000 : _ref$emfileMaxWait;

  var directoryUrl = assertAndNormalizeDirectoryUrl(url);
  var directoryPath = urlToFileSystemPath(directoryUrl);
  var startMs = Date.now();
  var attemptCount = 0;

  var attempt = function attempt() {
    return readdirNaive(directoryPath, {
      handleTooManyFilesOpenedError: _async$2(function (error) {
        attemptCount++;
        var nowMs = Date.now();
        var timeSpentWaiting = nowMs - startMs;

        if (timeSpentWaiting > emfileMaxWait) {
          throw error;
        }

        return new Promise(function (resolve) {
          setTimeout(function () {
            resolve(attempt());
          }, attemptCount);
        });
      })
    });
  };

  return attempt();
});

var readdirNaive = function readdirNaive(directoryPath) {
  var _ref2 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
      _ref2$handleTooManyFi = _ref2.handleTooManyFilesOpenedError,
      handleTooManyFilesOpenedError = _ref2$handleTooManyFi === void 0 ? null : _ref2$handleTooManyFi;

  return new Promise(function (resolve, reject) {
    fs.readdir(directoryPath, function (error, names) {
      if (error) {
        // https://nodejs.org/dist/latest-v13.x/docs/api/errors.html#errors_common_system_errors
        if (handleTooManyFilesOpenedError && (error.code === "EMFILE" || error.code === "ENFILE")) {
          resolve(handleTooManyFilesOpenedError(error));
        } else {
          reject(error);
        }
      } else {
        resolve(names);
      }
    });
  });
};

function _empty() {}

var mkdir = fs.promises.mkdir;

function _awaitIgnored(value, direct) {
  if (!direct) {
    return value && value.then ? value.then(_empty) : Promise.resolve();
  }
}

function _catch$1(body, recover) {
  try {
    var result = body();
  } catch (e) {
    return recover(e);
  }

  if (result && result.then) {
    return result.then(void 0, recover);
  }

  return result;
}

function _await$1(value, then, direct) {
  if (direct) {
    return then ? then(value) : value;
  }

  if (!value || !value.then) {
    value = Promise.resolve(value);
  }

  return then ? value.then(then) : value;
}

function _async$3(f) {
  return function () {
    for (var args = [], i = 0; i < arguments.length; i++) {
      args[i] = arguments[i];
    }

    try {
      return Promise.resolve(f.apply(this, args));
    } catch (e) {
      return Promise.reject(e);
    }
  };
}

var writeDirectory = _async$3(function (destination) {
  var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
      _ref$recursive = _ref.recursive,
      recursive = _ref$recursive === void 0 ? true : _ref$recursive,
      _ref$allowUseless = _ref.allowUseless,
      allowUseless = _ref$allowUseless === void 0 ? false : _ref$allowUseless;

  var destinationUrl = assertAndNormalizeDirectoryUrl(destination);
  var destinationPath = urlToFileSystemPath(destinationUrl);
  return _await$1(readFileSystemNodeStat(destinationUrl, {
    nullIfNotFound: true,
    followLink: false
  }), function (destinationStats) {
    if (destinationStats) {
      if (destinationStats.isDirectory()) {
        if (allowUseless) {
          return;
        }

        throw new Error("directory already exists at ".concat(destinationPath));
      }

      var destinationType = statsToType(destinationStats);
      throw new Error("cannot write directory at ".concat(destinationPath, " because there is a ").concat(destinationType));
    }

    return _catch$1(function () {
      return _awaitIgnored(mkdir(destinationPath, {
        recursive: recursive
      }));
    }, function (error) {
      if (allowUseless && error.code === "EEXIST") {
        return;
      }

      throw error;
    });
  });
});

var resolveUrl = function resolveUrl(specifier, baseUrl) {
  if (typeof baseUrl === "undefined") {
    throw new TypeError("baseUrl missing to resolve ".concat(specifier));
  }

  return String(new URL(specifier, baseUrl));
};

var isWindows$1 = process.platform === "win32";
var baseUrlFallback = fileSystemPathToUrl(process.cwd());

function _async$4(f) {
  return function () {
    for (var args = [], i = 0; i < arguments.length; i++) {
      args[i] = arguments[i];
    }

    try {
      return Promise.resolve(f.apply(this, args));
    } catch (e) {
      return Promise.reject(e);
    }
  };
}

var ensureParentDirectories = _async$4(function (destination) {
  var destinationUrl = assertAndNormalizeFileUrl(destination);
  var destinationPath = urlToFileSystemPath(destinationUrl);
  var destinationParentPath = path.dirname(destinationPath);
  return writeDirectory(destinationParentPath, {
    recursive: true,
    allowUseless: true
  });
});

var symlink = fs.promises.symlink;

var isWindows$2 = process.platform === "win32";

var stat = fs.promises.stat;

function _await$2(value, then, direct) {
  if (direct) {
    return then ? then(value) : value;
  }

  if (!value || !value.then) {
    value = Promise.resolve(value);
  }

  return then ? value.then(then) : value;
}

var readFilePromisified = util.promisify(fs.readFile);

function _async$5(f) {
  return function () {
    for (var args = [], i = 0; i < arguments.length; i++) {
      args[i] = arguments[i];
    }

    try {
      return Promise.resolve(f.apply(this, args));
    } catch (e) {
      return Promise.reject(e);
    }
  };
}

var readFile = _async$5(function (value) {
  var fileUrl = assertAndNormalizeFileUrl(value);
  var filePath = urlToFileSystemPath(fileUrl);
  return _await$2(readFilePromisified(filePath), function (buffer) {
    return buffer.toString();
  });
});

var isWindows$3 = process.platform === "win32";

var isLinux = process.platform === "linux"; // linux does not support recursive option

var access = fs.promises.access;

var R_OK = fs.constants.R_OK,
    W_OK = fs.constants.W_OK,
    X_OK = fs.constants.X_OK;

function _empty$1() {}

var writeFileNode = fs.promises.writeFile;

function _awaitIgnored$1(value, direct) {
  if (!direct) {
    return value && value.then ? value.then(_empty$1) : Promise.resolve();
  }
}

function _await$3(value, then, direct) {
  if (direct) {
    return then ? then(value) : value;
  }

  if (!value || !value.then) {
    value = Promise.resolve(value);
  }

  return then ? value.then(then) : value;
}

function _invoke(body, then) {
  var result = body();

  if (result && result.then) {
    return result.then(then);
  }

  return then(result);
}

function _catch$2(body, recover) {
  try {
    var result = body();
  } catch (e) {
    return recover(e);
  }

  if (result && result.then) {
    return result.then(void 0, recover);
  }

  return result;
}

function _async$6(f) {
  return function () {
    for (var args = [], i = 0; i < arguments.length; i++) {
      args[i] = arguments[i];
    }

    try {
      return Promise.resolve(f.apply(this, args));
    } catch (e) {
      return Promise.reject(e);
    }
  };
}

var writeFile = _async$6(function (destination) {
  var content = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "";
  var destinationUrl = assertAndNormalizeFileUrl(destination);
  var destinationPath = urlToFileSystemPath(destinationUrl);
  return _catch$2(function () {
    return _awaitIgnored$1(writeFileNode(destinationPath, content));
  }, function (error) {
    var _exit = false;
    return _invoke(function () {
      if (error.code === "ENOENT") {
        return _await$3(ensureParentDirectories(destinationUrl), function () {
          return _await$3(writeFileNode(destinationPath, content), function () {
            _exit = true;
          });
        });
      }
    }, function (_result2) {
      if (_exit) return _result2;
      throw error;
    });
  });
});

var convertFileSystemErrorToResponseProperties = function convertFileSystemErrorToResponseProperties(error) {
  // https://iojs.org/api/errors.html#errors_eacces_permission_denied
  if (isErrorWithCode(error, "EACCES")) {
    return {
      status: 403,
      statusText: "no permission to read file"
    };
  }

  if (isErrorWithCode(error, "EPERM")) {
    return {
      status: 403,
      statusText: "no permission to read file"
    };
  }

  if (isErrorWithCode(error, "ENOENT")) {
    return {
      status: 404,
      statusText: "file not found"
    };
  } // file access may be temporarily blocked
  // (by an antivirus scanning it because recently modified for instance)


  if (isErrorWithCode(error, "EBUSY")) {
    return {
      status: 503,
      statusText: "file is busy",
      headers: {
        "retry-after": 0.01 // retry in 10ms

      }
    };
  } // emfile means there is too many files currently opened


  if (isErrorWithCode(error, "EMFILE")) {
    return {
      status: 503,
      statusText: "too many file opened",
      headers: {
        "retry-after": 0.1 // retry in 100ms

      }
    };
  }

  if (isErrorWithCode(error, "EISDIR")) {
    return {
      status: 500,
      statusText: "Unexpected directory operation"
    };
  }

  return Promise.reject(error);
};

var isErrorWithCode = function isErrorWithCode(error, code) {
  return _typeof(error) === "object" && error.code === code;
};

if ("observable" in Symbol === false) {
  Symbol.observable = Symbol.for("observable");
}

var createCancellationToken = function createCancellationToken() {
  var register = function register(callback) {
    if (typeof callback !== "function") {
      throw new Error("callback must be a function, got ".concat(callback));
    }

    return {
      callback: callback,
      unregister: function unregister() {}
    };
  };

  var throwIfRequested = function throwIfRequested() {
    return undefined;
  };

  return {
    register: register,
    cancellationRequested: false,
    throwIfRequested: throwIfRequested
  };
};

var createOperation = function createOperation(_ref) {
  var _ref$cancellationToke = _ref.cancellationToken,
      cancellationToken = _ref$cancellationToke === void 0 ? createCancellationToken() : _ref$cancellationToke,
      start = _ref.start,
      rest = _objectWithoutProperties(_ref, ["cancellationToken", "start"]);

  var unknownArgumentNames = Object.keys(rest);

  if (unknownArgumentNames.length) {
    throw new Error("createOperation called with unknown argument names.\n--- unknown argument names ---\n".concat(unknownArgumentNames, "\n--- possible argument names ---\ncancellationToken\nstart"));
  }

  cancellationToken.throwIfRequested();
  var promise = new Promise(function (resolve) {
    resolve(start());
  });
  var cancelPromise = new Promise(function (resolve, reject) {
    var cancelRegistration = cancellationToken.register(function (cancelError) {
      cancelRegistration.unregister();
      reject(cancelError);
    });
    promise.then(cancelRegistration.unregister, function () {});
  });
  var operationPromise = Promise.race([promise, cancelPromise]);
  return operationPromise;
};

var jsenvContentTypeMap = {
  "application/javascript": {
    extensions: ["js", "mjs", "ts", "jsx"]
  },
  "application/json": {
    extensions: ["json"]
  },
  "application/octet-stream": {},
  "application/pdf": {
    extensions: ["pdf"]
  },
  "application/xml": {
    extensions: ["xml"]
  },
  "application/x-gzip": {
    extensions: ["gz"]
  },
  "application/wasm": {
    extensions: ["wasm"]
  },
  "application/zip": {
    extensions: ["zip"]
  },
  "audio/basic": {
    extensions: ["au", "snd"]
  },
  "audio/mpeg": {
    extensions: ["mpga", "mp2", "mp2a", "mp3", "m2a", "m3a"]
  },
  "audio/midi": {
    extensions: ["midi", "mid", "kar", "rmi"]
  },
  "audio/mp4": {
    extensions: ["m4a", "mp4a"]
  },
  "audio/ogg": {
    extensions: ["oga", "ogg", "spx"]
  },
  "audio/webm": {
    extensions: ["weba"]
  },
  "audio/x-wav": {
    extensions: ["wav"]
  },
  "font/ttf": {
    extensions: ["ttf"]
  },
  "font/woff": {
    extensions: ["woff"]
  },
  "font/woff2": {
    extensions: ["woff2"]
  },
  "image/png": {
    extensions: ["png"]
  },
  "image/gif": {
    extensions: ["gif"]
  },
  "image/jpeg": {
    extensions: ["jpg"]
  },
  "image/svg+xml": {
    extensions: ["svg", "svgz"]
  },
  "text/plain": {
    extensions: ["txt"]
  },
  "text/html": {
    extensions: ["html"]
  },
  "text/css": {
    extensions: ["css"]
  },
  "text/cache-manifest": {
    extensions: ["appcache"]
  },
  "video/mp4": {
    extensions: ["mp4", "mp4v", "mpg4"]
  },
  "video/mpeg": {
    extensions: ["mpeg", "mpg", "mpe", "m1v", "m2v"]
  },
  "video/ogg": {
    extensions: ["ogv"]
  },
  "video/webm": {
    extensions: ["webm"]
  }
};

var urlToContentType = function urlToContentType(url) {
  var contentTypeMap = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : jsenvContentTypeMap;
  var contentTypeDefault = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "application/octet-stream";

  if (_typeof(contentTypeMap) !== "object") {
    throw new TypeError("contentTypeMap must be an object, got ".concat(contentTypeMap));
  }

  var pathname = new URL(url).pathname;
  var extensionWithDot = path.extname(pathname);

  if (!extensionWithDot || extensionWithDot === ".") {
    return contentTypeDefault;
  }

  var extension = extensionWithDot.slice(1);
  var availableContentTypes = Object.keys(contentTypeMap);
  var contentTypeForExtension = availableContentTypes.find(function (contentTypeName) {
    var contentType = contentTypeMap[contentTypeName];
    return contentType.extensions && contentType.extensions.indexOf(extension) > -1;
  });
  return contentTypeForExtension || contentTypeDefault;
};

function _await$4(value, then, direct) {
  if (direct) {
    return then ? then(value) : value;
  }

  if (!value || !value.then) {
    value = Promise.resolve(value);
  }

  return then ? value.then(then) : value;
}

var readFile$1 = fs.promises.readFile;

function _invoke$1(body, then) {
  var result = body();

  if (result && result.then) {
    return result.then(then);
  }

  return then(result);
} // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toUTCString


function _catch$3(body, recover) {
  try {
    var result = body();
  } catch (e) {
    return recover(e);
  }

  if (result && result.then) {
    return result.then(void 0, recover);
  }

  return result;
}

function _async$7(f) {
  return function () {
    for (var args = [], i = 0; i < arguments.length; i++) {
      args[i] = arguments[i];
    }

    try {
      return Promise.resolve(f.apply(this, args));
    } catch (e) {
      return Promise.reject(e);
    }
  };
}

var serveFile = _async$7(function (source) {
  var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
      _ref$cancellationToke = _ref.cancellationToken,
      cancellationToken = _ref$cancellationToke === void 0 ? createCancellationToken() : _ref$cancellationToke,
      _ref$method = _ref.method,
      method = _ref$method === void 0 ? "GET" : _ref$method,
      _ref$headers = _ref.headers,
      headers = _ref$headers === void 0 ? {} : _ref$headers,
      _ref$canReadDirectory = _ref.canReadDirectory,
      canReadDirectory = _ref$canReadDirectory === void 0 ? false : _ref$canReadDirectory,
      _ref$cacheStrategy = _ref.cacheStrategy,
      cacheStrategy = _ref$cacheStrategy === void 0 ? "etag" : _ref$cacheStrategy,
      _ref$contentTypeMap = _ref.contentTypeMap,
      contentTypeMap = _ref$contentTypeMap === void 0 ? jsenvContentTypeMap : _ref$contentTypeMap;

  if (method !== "GET" && method !== "HEAD") {
    return {
      status: 501
    };
  }

  var sourceUrl = assertAndNormalizeFileUrl(source);
  var clientCacheDisabled = headers["cache-control"] === "no-cache";
  return _catch$3(function () {
    var cacheWithMtime = !clientCacheDisabled && cacheStrategy === "mtime";
    var cacheWithETag = !clientCacheDisabled && cacheStrategy === "etag";
    var cachedDisabled = clientCacheDisabled || cacheStrategy === "none";
    return _await$4(createOperation({
      cancellationToken: cancellationToken,
      start: function start() {
        return readFileSystemNodeStat(sourceUrl);
      }
    }), function (sourceStat) {
      var _exit = false;
      return _invoke$1(function () {
        if (sourceStat.isDirectory()) {
          if (canReadDirectory === false) {
            _exit = true;
            return {
              status: 403,
              statusText: "not allowed to read directory",
              headers: _objectSpread({}, cachedDisabled ? {
                "cache-control": "no-store"
              } : {})
            };
          }

          return _await$4(createOperation({
            cancellationToken: cancellationToken,
            start: function start() {
              return readDirectory(sourceUrl);
            }
          }), function (directoryContentArray) {
            var directoryContentJson = JSON.stringify(directoryContentArray);
            _exit = true;
            return {
              status: 200,
              headers: _objectSpread({}, cachedDisabled ? {
                "cache-control": "no-store"
              } : {}, {
                "content-type": "application/json",
                "content-length": directoryContentJson.length
              }),
              body: directoryContentJson
            };
          });
        }
      }, function (_result) {
        var _exit2 = false;
        if (_exit) return _result;
        return sourceStat.isFile() ? _invoke$1(function () {
          if (cacheWithETag) {
            return _await$4(createOperation({
              cancellationToken: cancellationToken,
              start: function start() {
                return readFile$1(urlToFileSystemPath(sourceUrl));
              }
            }), function (fileContentAsBuffer) {
              var fileContentEtag = bufferToEtag(fileContentAsBuffer);

              if ("if-none-match" in headers && headers["if-none-match"] === fileContentEtag) {
                _exit2 = true;
                return {
                  status: 304,
                  headers: _objectSpread({}, cachedDisabled ? {
                    "cache-control": "no-store"
                  } : {})
                };
              }

              _exit2 = true;
              return {
                status: 200,
                headers: _objectSpread({}, cachedDisabled ? {
                  "cache-control": "no-store"
                } : {}, {
                  "content-length": sourceStat.size,
                  "content-type": urlToContentType(sourceUrl, contentTypeMap),
                  "etag": fileContentEtag
                }),
                body: fileContentAsBuffer
              };
            });
          }
        }, function (_result2) {
          if (_exit2) return _result2;

          if (cacheWithMtime && "if-modified-since" in headers) {
            var cachedModificationDate;

            try {
              cachedModificationDate = new Date(headers["if-modified-since"]);
            } catch (e) {
              return {
                status: 400,
                statusText: "if-modified-since header is not a valid date"
              };
            }

            var actualModificationDate = dateToSecondsPrecision(sourceStat.mtime);

            if (Number(cachedModificationDate) >= Number(actualModificationDate)) {
              return {
                status: 304
              };
            }
          }

          return {
            status: 200,
            headers: _objectSpread({}, cachedDisabled ? {
              "cache-control": "no-store"
            } : {}, {}, cacheWithMtime ? {
              "last-modified": dateToUTCString(sourceStat.mtime)
            } : {}, {
              "content-length": sourceStat.size,
              "content-type": urlToContentType(sourceUrl, contentTypeMap)
            }),
            body: fs.createReadStream(urlToFileSystemPath(sourceUrl))
          };
        }) : {
          status: 404,
          headers: _objectSpread({}, cachedDisabled ? {
            "cache-control": "no-store"
          } : {})
        };
      }); // not a file, give up
    });
  }, function (e) {
    return convertFileSystemErrorToResponseProperties(e);
  });
});

var dateToUTCString = function dateToUTCString(date) {
  return date.toUTCString();
};

var dateToSecondsPrecision = function dateToSecondsPrecision(date) {
  var dateWithSecondsPrecision = new Date(date);
  dateWithSecondsPrecision.setMilliseconds(0);
  return dateWithSecondsPrecision;
};

function _await$5(value, then, direct) {
  if (direct) {
    return then ? then(value) : value;
  }

  if (!value || !value.then) {
    value = Promise.resolve(value);
  }

  return then ? value.then(then) : value;
}

var require$1 = module$1.createRequire(url);

function _invoke$2(body, then) {
  var result = body();

  if (result && result.then) {
    return result.then(then);
  }

  return then(result);
}

var nodeFetch = require$1("node-fetch");

function _async$8(f) {
  return function () {
    for (var args = [], i = 0; i < arguments.length; i++) {
      args[i] = arguments[i];
    }

    try {
      return Promise.resolve(f.apply(this, args));
    } catch (e) {
      return Promise.reject(e);
    }
  };
}

var AbortController = require$1("abort-controller");

var Response = nodeFetch.Response;
var fetchUrl = _async$8(function (url) {
  var _exit = false;

  var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  var _ref$cancellationToke = _ref.cancellationToken,
      cancellationToken = _ref$cancellationToke === void 0 ? createCancellationToken() : _ref$cancellationToke,
      _ref$standard = _ref.standard,
      standard = _ref$standard === void 0 ? false : _ref$standard,
      canReadDirectory = _ref.canReadDirectory,
      contentTypeMap = _ref.contentTypeMap,
      cacheStrategy = _ref.cacheStrategy,
      options = _objectWithoutProperties(_ref, ["cancellationToken", "standard", "canReadDirectory", "contentTypeMap", "cacheStrategy"]);

  try {
    url = String(new URL(url));
  } catch (e) {
    throw new Error("fetchUrl first argument must be an absolute url, received ".concat(url));
  }

  return _invoke$2(function () {
    if (url.startsWith("file://")) {
      return _await$5(serveFile(url, _objectSpread({
        cancellationToken: cancellationToken,
        cacheStrategy: cacheStrategy,
        canReadDirectory: canReadDirectory,
        contentTypeMap: contentTypeMap
      }, options)), function (_ref2) {
        var status = _ref2.status,
            statusText = _ref2.statusText,
            headers = _ref2.headers,
            body = _ref2.body;
        var response = new Response(typeof body === "string" ? Buffer.from(body) : body, {
          url: url,
          status: status,
          statusText: statusText,
          headers: headers
        });
        _exit = true;
        return standard ? response : standardResponseToSimplifiedResponse(response);
      });
    }
  }, function (_result) {
    return _exit ? _result : _await$5(createOperation({
      cancellationToken: cancellationToken,
      start: function start() {
        return nodeFetch(url, _objectSpread({
          signal: cancellationTokenToAbortSignal(cancellationToken)
        }, options));
      }
    }), function (response) {
      return standard ? response : standardResponseToSimplifiedResponse(response);
    });
  });
}); // https://github.com/bitinn/node-fetch#request-cancellation-with-abortsignal

var cancellationTokenToAbortSignal = function cancellationTokenToAbortSignal(cancellationToken) {
  var abortController = new AbortController();
  cancellationToken.register(function (reason) {
    abortController.abort(reason);
  });
  return abortController.signal;
};

var standardResponseToSimplifiedResponse = _async$8(function (response) {
  return _await$5(response.text(), function (text) {
    return {
      url: response.url,
      status: response.status,
      statusText: response.statusText,
      headers: responseToHeaders(response),
      body: text
    };
  });
});

var responseToHeaders = function responseToHeaders(response) {
  var headers = {};
  response.headers.forEach(function (value, name) {
    headers[name] = value;
  });
  return headers;
};

var require$2 = module$1.createRequire(url);

var killPort = require$2("kill-port");

function _await$6(value, then, direct) {
  if (direct) {
    return then ? then(value) : value;
  }

  if (!value || !value.then) {
    value = Promise.resolve(value);
  }

  return then ? value.then(then) : value;
}

function _invoke$3(body, then) {
  var result = body();

  if (result && result.then) {
    return result.then(then);
  }

  return then(result);
}

function _async$9(f) {
  return function () {
    for (var args = [], i = 0; i < arguments.length; i++) {
      args[i] = arguments[i];
    }

    try {
      return Promise.resolve(f.apply(this, args));
    } catch (e) {
      return Promise.reject(e);
    }
  };
}

var fetchLatestInRegistry = _async$9(function (_ref) {
  var registryUrl = _ref.registryUrl,
      packageName = _ref.packageName,
      token = _ref.token;
  var requestUrl = "".concat(registryUrl, "/").concat(packageName);
  return _await$6(fetchUrl(requestUrl, {
    standard: true,
    headers: _objectSpread({
      // "user-agent": "jsenv",
      accept: "application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*"
    }, token ? {
      authorization: "token ".concat(token)
    } : {}),
    method: "GET"
  }), function (response) {
    var responseStatus = response.status;
    return responseStatus === 404 ? null : _invoke$3(function () {
      if (responseStatus !== 200) {
        return _await$6(response.text(), function (_response$text) {
          throw new Error(writeUnexpectedResponseStatus({
            requestUrl: requestUrl,
            responseStatus: responseStatus,
            responseText: _response$text
          }));
        });
      }
    }, function (_result) {
      return  _await$6(response.json(), function (packageObject) {
        return packageObject.versions[packageObject["dist-tags"].latest];
      });
    });
  });
});

var writeUnexpectedResponseStatus = function writeUnexpectedResponseStatus(_ref2) {
  var requestUrl = _ref2.requestUrl,
      responseStatus = _ref2.responseStatus,
      responseText = _ref2.responseText;
  return "package registry response status should be 200.\n--- request url ----\n".concat(requestUrl, "\n--- response status ---\n").concat(responseStatus, "\n--- response text ---\n").concat(responseText);
};

var setNpmConfig = function setNpmConfig(configString, configObject) {
  return Object.keys(configObject).reduce(function (previous, key) {
    return setOrUpdateNpmConfig(previous, key, configObject[key]);
  }, configString);
};

var setOrUpdateNpmConfig = function setOrUpdateNpmConfig(config, key, value) {
  var assignmentIndex = config.indexOf("".concat(key, "="));

  if (assignmentIndex === -1) {
    if (config === "") {
      return "".concat(key, "=").concat(value);
    }

    return "".concat(config, "\n").concat(key, "=").concat(value);
  }

  var beforeAssignment = config.slice(0, assignmentIndex);
  var nextLineIndex = config.indexOf("\n", assignmentIndex);

  if (nextLineIndex === -1) {
    return "".concat(beforeAssignment).concat(key, "=").concat(value);
  }

  var afterAssignment = config.slice(nextLineIndex);
  return "".concat(beforeAssignment).concat(key, "=").concat(value).concat(afterAssignment);
};

function _await$7(value, then, direct) {
  if (direct) {
    return then ? then(value) : value;
  }

  if (!value || !value.then) {
    value = Promise.resolve(value);
  }

  return then ? value.then(then) : value;
}

function _catch$4(body, recover) {
  try {
    var result = body();
  } catch (e) {
    return recover(e);
  }

  if (result && result.then) {
    return result.then(void 0, recover);
  }

  return result;
}

function _rethrow(thrown, value) {
  if (thrown) throw value;
  return value;
}

function _finallyRethrows(body, finalizer) {
  try {
    var result = body();
  } catch (e) {
    return finalizer(true, e);
  }

  if (result && result.then) {
    return result.then(finalizer.bind(null, false), finalizer.bind(null, true));
  }

  return finalizer(false, result);
}

function _continue(value, then) {
  return value && value.then ? value.then(then) : then(value);
}

function _async$a(f) {
  return function () {
    for (var args = [], i = 0; i < arguments.length; i++) {
      args[i] = arguments[i];
    }

    try {
      return Promise.resolve(f.apply(this, args));
    } catch (e) {
      return Promise.reject(e);
    }
  };
}

var publish = _async$a(function (_ref) {
  var logger = _ref.logger,
      logNpmPublishOutput = _ref.logNpmPublishOutput,
      projectDirectoryUrl = _ref.projectDirectoryUrl,
      registryUrl = _ref.registryUrl,
      token = _ref.token;
  return _catch$4(function () {
    var promises = [];
    var previousValue = process.env.NODE_AUTH_TOKEN;

    var restoreProcessEnv = function restoreProcessEnv() {
      process.env.NODE_AUTH_TOKEN = previousValue;
    };

    process.env.NODE_AUTH_TOKEN = token;
    var projectPackageFileUrl = resolveUrl("./package.json", projectDirectoryUrl);
    return _await$7(readFile(projectPackageFileUrl), function (projectPackageString) {
      var _exit = false;

      var restoreProjectPackageFile = function restoreProjectPackageFile() {
        return writeFile(projectPackageFileUrl, projectPackageString);
      };

      var projectPackageObject = JSON.parse(projectPackageString);
      projectPackageObject.publishConfig = projectPackageObject.publishConfig || {};
      projectPackageObject.publishConfig.registry = registryUrl;
      promises.push(writeFile(projectPackageFileUrl, JSON.stringify(projectPackageObject, null, "  ")));
      var projectNpmConfigFileUrl = resolveUrl("./.npmrc", projectDirectoryUrl);
      var projectNpmConfigString;
      return _continue(_catch$4(function () {
        return _await$7(readFile(projectNpmConfigFileUrl), function (_readFile) {
          projectNpmConfigString = _readFile;
        });
      }, function (e) {
        if (e.code === "ENOENT") {
          projectNpmConfigString = "";
        } else {
          throw e;
        }
      }), function (_result2) {
        var _setNpmConfig;

        if (_exit) return _result2;

        var restoreProjectNpmConfigFile = function restoreProjectNpmConfigFile() {
          return writeFile(projectNpmConfigFileUrl, projectNpmConfigString);
        };

        promises.push(writeFile(projectNpmConfigFileUrl, setNpmConfig(projectNpmConfigString, (_setNpmConfig = {}, _defineProperty(_setNpmConfig, computeRegistryTokenKey(registryUrl), token), _defineProperty(_setNpmConfig, computeRegistryKey(projectPackageObject.name), registryUrl), _setNpmConfig))));
        return _await$7(Promise.all(promises), function () {
          return _finallyRethrows(function () {
            return _await$7(new Promise(function (resolve, reject) {
              var command = child_process.exec("npm publish", {
                cwd: urlToFileSystemPath(projectDirectoryUrl),
                stdio: "silent"
              }, function (error) {
                if (error) {
                  // publish conflict generally occurs because servers
                  // returns 200 after npm publish
                  // but returns previous version if asked immediatly
                  // after for the last published version.
                  // npm publish conclit
                  if (error.message.includes("EPUBLISHCONFLICT")) {
                    resolve({
                      success: true,
                      reason: "published"
                    });
                  } // github publish conflict
                  else if (error.message.includes("ambiguous package version in package.json")) {
                      resolve({
                        success: true,
                        reason: "published"
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
                command.stdout.on("data", function (data) {
                  logger.debug(data);
                });
                command.stderr.on("data", function (data) {
                  // debug because this output is part of
                  // the error message generated by a failing npm publish
                  logger.debug(data);
                });
              }
            }));
          }, function (_wasThrown, _result3) {
            return _await$7(Promise.all([restoreProcessEnv(), restoreProjectPackageFile(), restoreProjectNpmConfigFile()]), function () {
              return _rethrow(_wasThrown, _result3);
            });
          });
        });
      });
    });
  }, function (e) {
    return {
      success: false,
      reason: e
    };
  });
});

var computeRegistryTokenKey = function computeRegistryTokenKey(registryUrl) {
  if (registryUrl.startsWith("http://")) {
    return "".concat(registryUrl.slice("http:".length), "/:_authToken");
  }

  if (registryUrl.startsWith("https://")) {
    return "".concat(registryUrl.slice("https:".length), "/:_authToken");
  }

  if (registryUrl.startsWith("//")) {
    return "".concat(registryUrl, "/:_authToken");
  }

  throw new Error("registryUrl must start with http or https, got ".concat(registryUrl));
};

var computeRegistryKey = function computeRegistryKey(packageName) {
  if (packageName[0] === "@") {
    var packageScope = packageName.slice(0, packageName.indexOf("/"));
    return "".concat(packageScope, ":registry");
  }

  return "registry";
};

function _await$8(value, then, direct) {
  if (direct) {
    return then ? then(value) : value;
  }

  if (!value || !value.then) {
    value = Promise.resolve(value);
  }

  return then ? value.then(then) : value;
}

function _catch$5(body, recover) {
  try {
    var result = body();
  } catch (e) {
    return recover(e);
  }

  if (result && result.then) {
    return result.then(void 0, recover);
  }

  return result;
}

function _continue$1(value, then) {
  return value && value.then ? value.then(then) : then(value);
}

function _async$b(f) {
  return function () {
    for (var args = [], i = 0; i < arguments.length; i++) {
      args[i] = arguments[i];
    }

    try {
      return Promise.resolve(f.apply(this, args));
    } catch (e) {
      return Promise.reject(e);
    }
  };
}

var readProjectPackage = _async$b(function (_ref) {
  var projectDirectoryUrl = _ref.projectDirectoryUrl;
  var packageFileUrl = resolveUrl("./package.json", projectDirectoryUrl);
  var packageObject;
  return _continue$1(_catch$5(function () {
    return _await$8(readFile(packageFileUrl), function (packageString) {
      try {
        packageObject = JSON.parse(packageString);
      } catch (e) {
        if (e.name === "SyntaxError") {
          throw new Error("syntax error while parsing project package.json\n--- syntax error stack ---\n".concat(e.stack, "\n--- package.json path ---\n").concat(urlToFileSystemPath(packageFileUrl)));
        }

        throw e;
      }
    });
  }, function (e) {
    if (e.code === "ENOENT") {
      throw new Error("cannot find project package.json\n--- package.json path ---\n".concat(urlToFileSystemPath(packageFileUrl)));
    }

    throw e;
  }), function (_result) {
    return  packageObject;
  });
});

function _await$9(value, then, direct) {
  if (direct) {
    return then ? then(value) : value;
  }

  if (!value || !value.then) {
    value = Promise.resolve(value);
  }

  return then ? value.then(then) : value;
}

var require$3 = module$1.createRequire(url); // https://github.com/npm/node-semver#readme


function _async$c(f) {
  return function () {
    for (var args = [], i = 0; i < arguments.length; i++) {
      args[i] = arguments[i];
    }

    try {
      return Promise.resolve(f.apply(this, args));
    } catch (e) {
      return Promise.reject(e);
    }
  };
}

var _require = require$3("semver"),
    versionGreaterThan = _require.gt;

function _catch$6(body, recover) {
  try {
    var result = body();
  } catch (e) {
    return recover(e);
  }

  if (result && result.then) {
    return result.then(void 0, recover);
  }

  return result;
}

function _empty$2() {}

function _continueIgnored(value) {
  if (value && value.then) {
    return value.then(_empty$2);
  }
}

var publishPackage = _async$c(function () {
  var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      projectDirectoryUrl = _ref.projectDirectoryUrl,
      logLevel = _ref.logLevel,
      registriesConfig = _ref.registriesConfig,
      _ref$logNpmPublishOut = _ref.logNpmPublishOutput,
      logNpmPublishOutput = _ref$logNpmPublishOut === void 0 ? true : _ref$logNpmPublishOut;

  var logger = createLogger({
    logLevel: logLevel
  });
  logger.debug("publishPackage(".concat(JSON.stringify({
    projectDirectoryUrl: projectDirectoryUrl,
    logLevel: logLevel,
    registriesConfig: registriesConfig
  }, null, "  "), ")"));
  projectDirectoryUrl = assertAndNormalizeDirectoryUrl(projectDirectoryUrl);
  assertRegistriesConfig(registriesConfig);
  logger.debug("reading project package.json");
  return _await$9(readProjectPackage({
    projectDirectoryUrl: projectDirectoryUrl
  }), function (packageInProject) {
    var packageName = packageInProject.name,
        packageVersion = packageInProject.version;
    logger.debug("".concat(packageName, "@").concat(packageVersion, " found in package.json"));
    var report = {};
    return _await$9(Promise.all(Object.keys(registriesConfig).map(_async$c(function (registryUrl) {
      var registryReport = {
        packageName: packageName,
        packageVersion: packageVersion,
        registryLatestVersion: undefined,
        action: undefined,
        actionReason: undefined,
        actionResult: undefined
      };
      report[registryUrl] = registryReport;
      logger.debug("check latest version for ".concat(packageName, " in ").concat(registryUrl));
      var registryConfig = registriesConfig[registryUrl];

      var decide = function decide(action, actionReason) {
        registryReport.action = action;
        registryReport.actionReason = actionReason;
      };

      return _continueIgnored(_catch$6(function () {
        return _await$9(fetchLatestInRegistry(_objectSpread({
          registryUrl: registryUrl,
          packageName: packageName
        }, registryConfig)), function (latestPackageInRegistry) {
          var registryLatestVersion = latestPackageInRegistry === null ? null : latestPackageInRegistry.version;
          registryReport.registryLatestVersion = registryLatestVersion;

          if (registryLatestVersion === null) {
            logger.debug("".concat(packageName, "@").concat(packageVersion, " needs to be published on ").concat(registryUrl, " because it was never published"));
            decide("needs-publish", "never-published");
          } else if (registryLatestVersion === packageVersion) {
            logger.info("skip ".concat(packageName, "@").concat(packageVersion, " publish on ").concat(registryUrl, " because already published"));
            decide("nothing", "already-published");
          } else if (versionGreaterThan(registryLatestVersion, packageVersion)) {
            logger.info("skip ".concat(packageName, "@").concat(packageVersion, " publish on ").concat(registryUrl, " because latest version is higher (").concat(registryLatestVersion, ")"));
            decide("nothing", "latest-higher");
          } else {
            logger.debug("".concat(packageName, "@").concat(packageVersion, " needs to be published on ").concat(registryUrl, " because latest version is lower (").concat(registryLatestVersion, ")"));
            decide("needs-publish", "latest-lower");
          }
        });
      }, function (e) {
        logger.error(e.message);
        decide("nothing", e);
        process.exitCode = 1;
      }));
    }))), function () {
      // we have to publish in serie because we don't fully control
      // npm publish, we have to enforce where the package gets published
      return _await$9(Object.keys(report).reduce(function (previous, registryUrl) {
        return _await$9(previous, function () {
          var registryReport = report[registryUrl];

          if (registryReport.action !== "needs-publish") {
            registryReport.actionResult = {
              success: true,
              reason: "nothing-to-do"
            };
            return;
          }

          logger.info("publishing ".concat(packageName, "@").concat(packageVersion, " on ").concat(registryUrl));
          return _await$9(publish(_objectSpread({
            logger: logger,
            logNpmPublishOutput: logNpmPublishOutput,
            projectDirectoryUrl: projectDirectoryUrl,
            registryUrl: registryUrl
          }, registriesConfig[registryUrl])), function (_ref2) {
            var success = _ref2.success,
                reason = _ref2.reason;
            registryReport.actionResult = {
              success: success,
              reason: reason
            };

            if (success) {
              logger.info("".concat(packageName, "@").concat(packageVersion, " published on ").concat(registryUrl));
            } else {
              logger.error("error when publishing ".concat(packageName, "@").concat(packageVersion, " in ").concat(registryUrl, "\n--- error stack ---\n").concat(reason.stack));
              process.exitCode = 1;
            }
          });
        });
      }, Promise.resolve()), function () {
        return report;
      });
    });
  });
});

var assertRegistriesConfig = function assertRegistriesConfig(value) {
  if (_typeof(value) !== "object") {
    throw new TypeError("registriesConfig must be an object.\n--- registryMap ---\n".concat(value));
  }

  Object.keys(value).forEach(function (registryUrl) {
    var registryMapValue = value[registryUrl];

    if (_typeof(registryMapValue) !== "object") {
      throw new TypeError("found unexpected registryMap value: it must be an object.\n--- registryMap value ---\n".concat(registryMapValue, "\n--- registryMap key ---\n").concat(registryUrl));
    }

    if ("token" in registryMapValue === false) {
      throw new TypeError("missing token in registryMap.\n--- registryMap key ---\n".concat(registryUrl));
    }

    if (typeof registryMapValue.token !== "string") {
      throw new TypeError("unexpected token found in registryMap: it must be a string.\n--- token ---\n".concat(registryMapValue.token, "\n--- registryMap key ---\n").concat(registryUrl));
    }
  });
};

exports.publishPackage = publishPackage;
//# sourceMappingURL=main.js.map
