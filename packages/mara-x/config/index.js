'use strict'

const fs = require('fs')
const merge = require('webpack-merge')
const validateOptions = require('@mara/schema-utils')
const maraxOptionsSchema = require('./maraxOptions')
const paths = require('./paths')
const getEnv = require('./env')
const argv = require('./argv')
const { ensureSlash, isObject } = require('../libs/utils')
const defConf = require('./defaultOptions')
const { TARGET } = require('./const')
const maraxVer = require(paths.maraxPackageJson).version
const isProd = process.env.NODE_ENV === 'production'

const maraConf = getMaraConf()
const target = getBuildTarget()
const useTypeScript = fs.existsSync(paths.tsConfig)
const useYarn = fs.existsSync(paths.yarnLock)
const publicPath = isProd ? maraConf.publicPath : maraConf.publicDevPath
const env = getEnv(publicPath.slice(0, -1), maraConf.globalEnv, target)

function getMaraConf() {
  let maraConf = defConf

  if (fs.existsSync(paths.marauder)) {
    const userOptions = require(paths.marauder)

    try {
      if (validateOptions(maraxOptionsSchema, userOptions, 'mararc', 'Marax')) {
        maraConf = merge({}, defConf, userOptions)
      }
    } catch (e) {
      console.log(e.message)
      process.exit(1)
    }
  }

  return maraConf
}

function getBuildTarget(globalEnv) {
  switch (argv.target) {
    case 'web':
    case 'wap':
      // 兼容 wap 值, wap -> web
      return TARGET.WEB
    case 'app':
      return TARGET.APP
    default:
      // 其他 target 视为无效值
      return null
  }
}

function getServedPath(publicUrl) {
  // 强制以 / 结尾，为了兼容 publicPath: '.'
  return publicUrl ? ensureSlash(publicUrl) : '/'
}

function getCLIBooleanOptions(field, defVal = false) {
  const val = argv[field] || process.env[`npm_config_${field}`]

  return !!(typeof val === 'undefined' ? defVal : val)
}

function getHashConf(hash) {
  let { main, chunk } = defConf.hash

  if (typeof hash === 'boolean') {
    main = chunk = hash
  } else if (isObject(hash)) {
    main = hash.main === undefined ? main : hash.main
    chunk = hash.chunk === undefined ? chunk : hash.chunk
  }

  return { main, chunk }
}

const maraContext = {
  argv: argv,
  // 为了防止不同文件夹下的同名资源文件冲突
  // 资源文件不提供 hash 修改权限
  hash: getHashConf(maraConf.hash),
  env: env,
  // 优先读取 target，其次以 jsbridgeBuildType 回退
  target: target || env.raw.jsbridgeBuildType,
  version: maraxVer,
  debug: argv.debug,
  library: maraConf.library,
  parallel: false,
  globalEnv: maraConf.globalEnv,
  tsImportLibs: maraConf.tsImportLibs,
  webpackPluginsHandler: maraConf.webpackPluginsHandler,
  // 编译配置
  compiler: maraConf.compiler,
  // 通知 babel 以项目级配置编译 node_module 里额外的模块
  esm: ['@mfelibs'],
  // 打包 dll
  vendor: maraConf.vendor,
  paths: paths,
  assetsPublicPath: getServedPath(publicPath),
  prerender: maraConf.prerender,
  build: {
    sourceMap: maraConf.sourceMap,
    report: getCLIBooleanOptions('report'),
    writeStatsJson: getCLIBooleanOptions('stats'),
    // upload bundle use ftp
    // `npm run build <view> --ftp [namespace]`
    // Set to `true` or `false` to always turn it on or off
    uploadFtp: process.env.npm_config_ftp,
    testDeploy: process.env.npm_config_test
  },
  tinifyKeys: maraConf.tinifyKeys,
  devServer: maraConf.devServer,
  useYarn,
  useTypeScript,
  ftp: maraConf.ftp,
  ciConfig: maraConf.ciConfig,
  // hybrid 项目配置，存在此属性时，将会生成 zip 包
  hybrid: maraConf.hybrid,
  babelPlugins: maraConf.babelPlugins,
  postcss: {
    stage: 3,
    // 允许 flexbox 2009 以支持多行超出省略
    // https://github.com/jonathantneal/postcss-preset-env/blob/master/lib/plugins-by-specification-id.js
    features: {
      // image-set polyfill 与雪碧图使用时存在 bug，在此禁用
      'css-images-image-set-notation': false
    }
  },
  marax: maraConf.marax
}

module.exports = maraContext
