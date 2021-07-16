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
  const entryConf = getEntries(entryGlob)
  let dir = path.dirname(entryConf.index)

  let { dependencies } = require(`${dir}/public/manifest.json`)

  let commonPkgPath = []
  let moduleMaps = {}
  let pkgMaps = []

  let sncFunc

  for (const key in dependencies) {
    if (Object.hasOwnProperty.call(dependencies, key)) {
      let matchArr = key.match(/([^\/]*)\/(\w*)/)
      let moduleName = matchArr[1]
      let view = matchArr[2]

      const commonPkg = require.resolve(`@mfelibs/${moduleName}`)
      const moduleMap = require(`@mfelibs/${moduleName}/module-map`)
      const { version } = require(`@mfelibs/${moduleName}/package.json`)
      const mainVer = version.match(/(\d{0,1})(\.\d{0,1})*/)[1]
      if (moduleMap['@mfelibs/universal-framework'])
        sncFunc = moduleMap['@mfelibs/universal-framework']

      let commonPath

      pkgMaps.push({
        moduleName,
        view,
        mainVer
      })

      if (isApp) {
        commonPath = path.join(
          path.dirname(commonPkg),
          `../dist/${view}.${mainVer}/static/js/${view}.${mainVer}.min.js`
        )
      } else {
        // web 模式使用 cdn 资源
        commonPath = `https://mjs.sinaimg.cn//wap/project/${moduleName}/${version}/${view}.${mainVer}/static/js/${view}.${mainVer}.min.js`
      }

      commonPkgPath.push(commonPath)
      Object.assign(moduleMaps, moduleMap)
    }
  }

  // 从主入口中排除 SNC 依赖
  console.log('sncFunc---------', sncFunc)
  console.log('moduleMaps: ', moduleMaps)
  const externals = [
    moduleMaps,
    (context, request, callback) => {
      // 排除 universal 内部 apis 对自身的引用
      if (isSNCEntry(context, request)) {
        return callback(null, sncFunc)
      }

      callback()
    }
  ]

  return { entry: entryConf, externals, commonPkgPath, pkgMaps }
}

module.exports = getCommonPkgConf
