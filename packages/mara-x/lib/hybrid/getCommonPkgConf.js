const path = require('path')
const { getEntries } = require('../entry')
const { UNI_SNC } = require('../../config/const')

function isSNCEntry(context, request) {
  const sncPath = require.resolve('@mfelibs/universal-framework')
  const apiPath = path.join(path.dirname(sncPath), '/libs/apis')

  if (!context.includes(apiPath)) return false

  const filePath = path.resolve(context, request)

  return sncPath.includes(filePath)
}

function getCommonPkgConf(entryGlob, isApp) {
  const commonPkg = require.resolve('@mfelibs/hybridcontainer')
  const moduleMap = require('@mfelibs/hybridcontainer/module-map')
  const { version } = require('@mfelibs/hybridcontainer/package.json')
  const entryConf = getEntries(entryGlob)
  let commonPkgPath

  if (isApp) {
    commonPkgPath = path.join(
      path.dirname(commonPkg),
      '../dist/index.1/static/js/index.1.min.js'
    )
  } else {
    // web 模式使用 cdn 资源
    commonPkgPath = `https://mjs.sinaimg.cn//wap/project/hybridcontainer/${version}/index.1/static/js/index.1.min.js`
  }

  // 从主入口中排除 SNC 依赖
  const externals = [
    moduleMap,
    (context, request, callback) => {
      // 排除 universal 内部 apis 对自身的引用
      if (isSNCEntry(context, request)) {
        return callback(null, moduleMap['@mfelibs/universal-framework'])
      }

      callback()
    }
  ]

  return { entry: entryConf, externals, commonPkgPath }
}

module.exports = getCommonPkgConf
