'use strict'

const fs = require('fs')
const { merge } = require('webpack-merge')
const validateOptions = require('@mara/schema-utils')
const maraxOptionsSchema = require('./maraxOptions')
const paths = require('./paths')
const argv = require('./argv')
const { isObject } = require('@mara/devkit')
const defConf = require('./defaultOptions')
const { DEPLOY_ENV, TARGET } = require('./const')
const maraxVersion = require(paths.maraxPackageJson).version

const maraConf = getMaraConf()
const useTypeScript = fs.existsSync(paths.tsConfig)
const useYarn = fs.existsSync(paths.yarnLock)
// deployEnv: dev 开发环境 | test 测试环境 | online 线上环境
// 默认 online
const deployEnv = getDeployEnv(argv.env)
// app | web
const target = getBuildTarget(maraConf.globalEnv)

function getBuildTarget(globalEnv) {
  const targetMap = {
    web: TARGET.WEB,
    // wap 映射为 web
    wap: TARGET.WEB,
    app: TARGET.APP
  }
  let target = targetMap[argv.target]

  if (target) {
    // 覆盖 globalEnv 配置
    // jsbridgeBuildType 为 hybrid 两端统一依赖变量
    // jsbridgeBuildType 可选值为 wap | app，当 target 为 web 时强制为 wap
    globalEnv.jsbridgeBuildType = target === TARGET.WEB ? TARGET.WAP : target
  } else if (globalEnv.jsbridgeBuildType === TARGET.APP) {
    target = globalEnv.jsbridgeBuildType
  } else {
    // 当 target 缺省且 jsbridgeBuildType 缺省或值为非 app 时，
    // jsbridgeBuildType 默认回退为 wap
    globalEnv.jsbridgeBuildType = TARGET.WAP
    // target 强制指定为 web
    target = TARGET.WEB
  }

  return target
}

function getMaraConf() {
  let maraConf = defConf

  if (fs.existsSync(paths.marauder)) {
    const userOptions = require(paths.marauder)
    let globalConf = {}

    if (fs.existsSync(process.env.maraxGlobalConfig)) {
      globalConf = require(process.env.maraxGlobalConfig)
    }

    try {
      if (validateOptions(maraxOptionsSchema, userOptions, 'mararc', 'Marax')) {
        // use deep merge
        maraConf = merge({}, defConf, globalConf, userOptions)
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
  useWorkspace: !!argv.workspace,
  globalEnv: maraConf.globalEnv,
  tsImportLibs: maraConf.tsImportLibs,
  webpackPluginsHandler: maraConf.webpackPluginsHandler,
  // 编译配置
  compiler: maraConf.compiler,
  // 通知 babel 以项目级配置编译 node_module 里额外的模块
  esm: maraConf.esm,
  // 打包 dll
  vendor: maraConf.vendor,
  paths: paths,
  publicPath: maraConf.publicPath,
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
  zipConf: {
    exclude: [
      /__MACOSX$/,
      /.DS_Store$/,
      /dependencyGraph.json$/,
      /build.json$/,
      /js.map$/,
      /css.map$/
    ],
    // yazl Options
    // OPTIONAL: see https://github.com/thejoshwolfe/yazl#addfilerealpath-metadatapath-options
    fileOptions: {
      mtime: new Date(),
      mode: 0o100664,
      compress: true,
      forceZip64Format: false
    },
    // OPTIONAL: see https://github.com/thejoshwolfe/yazl#endoptions-finalsizecallback
    zipOptions: {
      forceZip64Format: false
    }
  },
  postcss: {
    stage: 3,
    // 允许 flexbox 2009 以支持多行超出省略
    // https://github.com/jonathantneal/postcss-preset-env/blob/master/lib/plugins-by-specification-id.js
    features: {
      // image-set polyfill 与雪碧图使用时存在 bug，在此禁用
      'css-images-image-set-notation': false
    }
  },
  browserslist: [
    '> 1%',
    'last 4 versions',
    'ios >= 8',
    'android >= 4.1',
    'not ie < 9'
  ],
  marax: maraConf.marax
}

const isHybridMode = maraContext.hybrid && target === TARGET.APP

maraContext.isHybridMode = isHybridMode

module.exports = maraContext
