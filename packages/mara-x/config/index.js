'use strict'

const fs = require('fs')
const paths = require('./paths')
const getEnv = require('./env')
const argv = require('./argv')
const { ensureSlash } = require('../libs/utils')
const defConf = require('./default')
const maraConf = require(paths.marauder)
const pkgName = require(paths.packageJson).name
const maraxVer = require(paths.maraxPackageJson).version

function getBuildTarget() {
  switch (argv.target) {
    case 'web':
    case 'wap':
      process.env.jsbridgeBuildType = 'web'
      return 'web'
    case 'mf':
      return 'sub-mod'
    case 'lib':
      return 'library'
    case 'app':
      process.env.jsbridgeBuildType = 'app'
      return 'app'
    default:
      return process.env.jsbridgeBuildType || 'web'
  }
}

function getServedPath(publicUrl) {
  // 强制以 / 结尾，为了兼容 publicPath: '.'
  return publicUrl ? ensureSlash(publicUrl, true) : '/'
}

function getCLIBooleanOptions(field) {
  const val = argv[field] || process.env[`npm_config_${field}`]

  return !!val
}

const publicPath = getServedPath(maraConf.publicPath)
const publicDevPath = getServedPath(maraConf.publicDevPath)
const useTypeScript = fs.existsSync(paths.tsConfig)

module.exports = {
  argv: argv,
  // 为了防止不同文件夹下的同名资源文件冲突
  // 资源文件不提供 hash 修改权限
  hash: {
    main: true,
    chunk: true,
    assets: true
  },
  target: getBuildTarget(),
  version: maraxVer,
  debug: getCLIBooleanOptions('debug') || !!maraConf.debug,
  library: {
    root: 'MyLibrary',
    amd: pkgName,
    commonjs: pkgName
  },
  parallel: false,
  assetsDir: 'static',
  // 编译配置
  compiler: Object.assign({}, defConf.compiler, maraConf.compiler),
  entry: defConf.esm.entry,
  // 通知 babel 编译 node_module 里额外的模块
  esm: defConf.esm,
  // 打包 dll
  vendor: [],
  paths: paths,
  build: {
    env: getEnv(publicPath.slice(0, -1)),
    assetsPublicPath: publicPath,
    // Run the build command with an extra argument to
    // View the bundle analyzer report after build finishes:
    // `npm run build --report`
    // Set to `true` or `false` to always turn it on or off
    bundleAnalyzerReport: process.env.npm_config_report,
    // upload bundle use ftp
    // `npm run build <page> --ftp [namespace]`
    // Set to `true` or `false` to always turn it on or off
    uploadFtp: process.env.npm_config_ftp,
    testDeploy: process.env.npm_config_test
  },
  dev: {
    env: getEnv(publicDevPath.slice(0, -1)),
    port: defConf.dev.port,
    assetsPublicPath: publicDevPath,
    proxyTable: {},
    // CSS Sourcemaps off by default because relative paths are "buggy"
    // with this option, according to the CSS-Loader README
    // (https://github.com/webpack/css-loader#sourcemaps)
    // In our experience, they generally work as expected,
    // just be aware of this issue when enabling this option.
    cssSourceMap: false
  },
  useTypeScript,
  ftp: Object.assign({}, defConf.ftp, maraConf.ftp),
  ciConfig: Object.assign({}, defConf.ciConfig, maraConf.ciConfig),
  // hybrid 项目配置，存在此属性时，将会生成 zip 包
  hybrid: defConf.hybrid,
  postcss: defConf.postcss
}
