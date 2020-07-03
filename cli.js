#!/usr/bin/env node

// STOLEN FROM WEBPACK (slightly modified)

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
      shell: true,
      cwd: __dirname
    });
    executedCommand.on("error", error => { reject(error); });
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

const readline = require('readline');

/**
 * Ask a question on stdin
 * @param {string} query question
 * @returns {Promise<string>} answer
 */
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

const argv = require('minimist')(process.argv);

(async () => {
  // build if necessary
  if (!isInstalled('./build/gulpfile')) {
    console.error("Not installed!");
    console.log("This will install dev dependencies and build the project");
    console.log("If you do not want this, consider installing the packed version");
    await askQuestion("Press any key to continue...");
    await runCommand("npm", ["install", "--only=dev"])
      .catch(error => {
        console.error(error);
        process.exit();
      }); // install dev dependencies and trigger compilation
    console.log("Done");
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