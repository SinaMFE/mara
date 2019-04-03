'use strict'

const fs = require('fs')
const merge = require('webpack-merge')
const validateOptions = require('@mara/schema-utils')
const maraxOptionsSchema = require('./maraxOptions')
const paths = require('./paths')
const argv = require('./argv')
const { isObject } = require('../libs/utils')
const defConf = require('./defaultOptions')
const { DEPLOY_ENV, TARGET } = require('./const')
const maraxVersion = require(paths.maraxPackageJson).version

const maraConf = getMaraConf()
const useTypeScript = fs.existsSync(paths.tsConfig)
const useYarn = fs.existsSync(paths.yarnLock)
// deployEnv: dev 开发环境 | test 测试环境 | online 线上环境
// 默认 online
const deployEnv = getDeployEnv(argv.env)
const target = getBuildTarget(maraConf.globalEnv)

function getBuildTarget(globalEnv) {
  const targetMap = {
    web: TARGET.WEB,
    wap: TARGET.WEB,
    app: TARGET.APP
  }
  // 未解析时指定 null
  const target = targetMap[argv.target]

  if (target) {
    // 覆盖 globalEnv 配置
    globalEnv.jsbridgeBuildType = target
  } else if (globalEnv.jsbridgeBuildType !== TARGET.APP) {
    globalEnv.jsbridgeBuildType = TARGET.WEB
  }

  // 优先获取 CLI 传递的 target，其次以 jsbridgeBuildType 回退
  return target || globalEnv.jsbridgeBuildType
}

function getMaraConf() {
  let maraConf = defConf

  if (fs.existsSync(paths.marauder)) {
    const userOptions = require(paths.marauder)

    try {
      if (validateOptions(maraxOptionsSchema, userOptions, 'mararc', 'Marax')) {
        // use deep merge
        maraConf = merge({}, defConf, userOptions)
      }
    } catch (e) {
      console.log(e.message)
      process.exit(1)
    }
  }

  return maraConf
}

function getDeployEnv(env) {
  switch (env) {
    case 'dev':
      return DEPLOY_ENV.DEV
    case 'test':
      return DEPLOY_ENV.TEST
    case 'online':
      return DEPLOY_ENV.ONLINE
    default:
      return DEPLOY_ENV.ONLINE
  }
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
  argv,
  target,
  // 为了防止不同文件夹下的同名资源文件冲突
  // 资源文件不提供 hash 修改权限
  hash: getHashConf(maraConf.hash),
  deployEnv,
  version: maraxVersion,
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
  publicPath: maraConf.publicPath,
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
