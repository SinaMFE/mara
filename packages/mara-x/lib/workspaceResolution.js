const path = require('path')
const paths = require('../config/paths')
const { isInstalled, rootPath } = require('./utils')
const pkgJson = require(paths.packageJson)

function resolvePkgName(pattern) {
  const pkgName = pattern.replace('**/', '').replace('/**', '')

  if (!isInstalled(pkgName)) {
    throw new Error(`workpace.nohoist 配置不合法: ${pattern}`)
  }

  return pkgName
}

function getResolution(baseAlias = {}) {
  // https://classic.yarnpkg.com/blog/2018/02/15/nohoist/
  // https://medium.com/trabe/fine-tune-dependency-versions-in-your-javascript-monorepo-1fa57d81a2de
  const nohoist = (pkgJson.workspaces && pkgJson.workspaces.nohoist) || []

  if (!nohoist.length) return baseAlias

  // 对结果排重
  const pkgs = [...new Set(nohoist.map(resolvePkgName))]
  const confs = pkgs.reduce((target, name) => {
    target[name] = rootPath(paths.nodeModules, name)

    return target
  }, {})

  return Object.assign(baseAlias, confs)
}

module.exports = getResolution
