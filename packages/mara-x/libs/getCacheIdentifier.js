const hash = require('hash-sum')
const config = require('../config')
const { readJson } = require('./utils')
const tsConfig = readJson(config.paths.tsConfig)

module.exports = function getCacheIdentifier(packages = []) {
  const pkgNames = ['webpack-marauder', 'cache-loader'].concat(packages)
  const pkgIds = pkgNames.reduce((pkgs, name) => {
    try {
      pkgs[name] = require(`${name}/package.json`).version
    } catch (e) {
      // ignored
    }

    return pkgs
  }, {})

  return hash({
    pkgIds,
    config,
    tsConfig
  })
}
