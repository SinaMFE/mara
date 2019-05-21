const { DEPLOY_ENV, PUBLIC_PATH } = require('../config/const')
const { ensureSlash } = require('@mara/devkit')

// ('a{{b}}c', {b: 1}) => a1c
function template(str, replaceMap) {
  return Object.keys(replaceMap).reduce((res, k) => {
    const reg = new RegExp(`{{${k}}}`, 'ig')

    return res.replace(reg, replaceMap[k])
  }, str)
}

module.exports = function resolvePublicPath(publicPath, deployEnv, replaceMap) {
  function format(str) {
    const path = ensureSlash(str)

    return replaceMap ? template(path, replaceMap) : path
  }

  if (typeof publicPath === 'string') {
    return format(publicPath)
  }

  const isEmptyPath =
    publicPath === undefined || !Object.keys(publicPath).length
  let defaultPath = PUBLIC_PATH

  if (isEmptyPath) {
    return format(defaultPath)
  }

  if (!deployEnv) {
    deployEnv = DEPLOY_ENV.ONLINE
  }

  defaultPath =
    publicPath.default === undefined ? defaultPath : publicPath.default

  return format(
    publicPath[deployEnv] === undefined ? defaultPath : publicPath[deployEnv]
  )
}
