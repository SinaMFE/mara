'use strict'

const path = require('path')
const { rootPath } = require('../libs/utils')

const resolveOwn = relativePath => path.resolve(__dirname, '..', relativePath)

module.exports = {
  app: rootPath('.'),
  dotenv: rootPath('.env'),
  entryGlob: 'src/view/*/index.@(ts|tsx|js|jsx)',
  libEntry: 'src/index.@(ts|js)',
  setupProxy: rootPath('src/setupProxy.js'),
  src: rootPath('src'),
  page: rootPath('src/view'),
  public: rootPath('public'),
  dist: rootPath('dist'),
  // 组件打包输出目录
  lib: rootPath('lib'),
  test: rootPath('test'),
  tsConfig: rootPath('tsconfig.json'),
  yarnLock: rootPath('yarn.lock'),
  nodeModules: rootPath('node_modules'),
  packageJson: rootPath('package.json'),
  // 配置文件
  marauder: rootPath('marauder.config.js'),
  dll: rootPath('dll'),

  // 脚手架自身相关路径
  marax: resolveOwn('.'),
  maraxNodeModules: resolveOwn('node_modules'),
  maraxPackageJson: resolveOwn('package.json')
}
