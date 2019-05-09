'use strict'

const path = require('path')
const C = require('./const')
const { rootPath } = require('../libs/utils')

const resolveOwn = relativePath => path.resolve(__dirname, '..', relativePath)

module.exports = {
  app: rootPath('.'),
  dotenv: rootPath('.env'),
  entryGlob: `${C.VIEWS_DIR}/*/index.@(ts|tsx|js|jsx)`,
  setupProxy: rootPath(`src/setupProxy.js`),
  src: rootPath('src'),
  views: rootPath(C.VIEWS_DIR),
  public: rootPath('public'),
  dist: rootPath(C.DIST_DIR),
  // 组件打包输出目录
  lib: rootPath(C.LIB_DIR),
  test: rootPath('test'),
  tsConfig: rootPath('tsconfig.json'),
  yarnLock: rootPath('yarn.lock'),
  nodeModules: rootPath('node_modules'),
  packageJson: rootPath('package.json'),
  // 配置文件
  marauder: rootPath('marauder.config.js'),
  dll: rootPath(C.DLL_DIR),

  // 脚手架自身相关路径
  marax: resolveOwn('.'),
  maraxNodeModules: resolveOwn('node_modules'),
  maraxPackageJson: resolveOwn('package.json')
}
