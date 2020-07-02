#!/usr/bin/env node

// STOLEN FROM WEBPACK

/**
 * @param {string} command process to run
 * @param {string[]} args command line arguments
 * @returns {Promise<void>} promise
 */
const runCommand = (command, args) => {
  const cp = require("child_process");
  return new Promise((resolve, reject) => {
    const executedCommand = cp.spawn(command, args, {
      stdio: "inherit",
      shell: true
    });

    executedCommand.on("error", error => {
      reject(error);
    });

    executedCommand.on("exit", code => {
      if (code === 0) {
        resolve();
      } else {
        reject();
      }
    });
  });
};

/**
 * @param {string} packageName name of the package
 * @returns {boolean} is the package installed?
 */
const isInstalled = packageName => {
  try {
    require.resolve(packageName);

    return true;
  } catch (err) {
    return false;
  }
};

// END THEFT

const argv = require('minimist')(process.argv);

(async () => {
  // build if necessary
  if (!isInstalled('./build/gulpfile')) {
    console.log("Building CLI...");
    await runCommand("npm", ["install", "--only=dev"])
      .catch(error => {
        console.error(error);
        process.exitCode = 1;
      });
    await runCommand("npm", ["run", "prepublish"])
      .catch(error => {
        console.error(error);
        process.exitCode = 1;
      });
    console.log('Done');
  }

  const { Watch, Build, error } = require('./build/gulpfile');

  try {
    if (argv.watch) {
      Watch();
    } else {
      Build();
    }
  } catch (err) {
    error(err);
  }
})();