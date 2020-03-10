const serverTest = require("../lib/hybrid").serverTest;
const config = require('../config')

const { name: projectName, version: latestVersion } = require(config.paths.packageJson)

module.exports = function runTest(argv) {
  if (argv["ci-test"]) {
    testTagAndPush(latestVersion)
  }
}

function testTagAndPush(latestVersion) {
  serverTest(latestVersion)
}