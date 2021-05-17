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

function getCommonPkgConf(entryGlob, isHybrid) {
  const commonPkg = require.resolve('@mfelibs/hybridcontainer')
  const commonPkgPath = path.join(
    path.dirname(commonPkg),
    '../dist/index.1/static/js/index.1.min.js'
  )
  const moduleMap = require('@mfelibs/hybridcontainer/module-map')
  let entryConf

  if (isHybrid) {
    entryConf = getEntries(entryGlob)
  } else {
    // 非 hb 模式将依赖包注入至主入口
    entryConf = getEntries(entryGlob, commonPkgPath)
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

  // 拆分 SNC，由于依赖 Promise，因此一并添加 polyfills
  // entryConf[UNI_SNC] = [
  //   require.resolve('../polyfills'),
  //   path.join(commonFile)
  // ]

  return { entry: entryConf, externals, commonPkgPath }
}

module.exports = getCommonPkgConf
