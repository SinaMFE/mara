'use strict'

const path = require('path')
const fs = require('fs-extra')
const C = require('./const')
const { findProjectRoot } = require('../lib/utils')

// From create-react-app
// Make sure any symlinks in the project folder are resolved:
// https://github.com/facebookincubator/create-react-app/issues/637
const rootDirectory = fs.realpathSync(findProjectRoot(process.cwd()))
const resolveOwn = relativePath => path.resolve(__dirname, '..', relativePath)

function getRootPath(...relativePath) {
  return path.resolve(rootDirectory, ...relativePath)
}

function getRelativePath(filePath) {
  return '.' + path.sep + path.relative(rootDirectory, filePath)
}

module.exports = {
  root: rootDirectory,
  dotenv: getRootPath('.env'),
  entryGlob: `${C.VIEWS_DIR}/*/index.@(ts|tsx|js|jsx)`,
  workspaceEntryGlob: `${C.WORKSPACE_PROJECT_DIR}/*/${C.VIEWS_DIR}/*/index.@(ts|tsx|js|jsx)`,
  proxySetup: getRootPath(`${C.SRC_DIR}/proxySetup.js`),
  src: getRootPath(C.SRC_DIR),
  view: getRootPath(C.VIEW_DIR),
  views: getRootPath(C.VIEWS_DIR),
  public: getRootPath(C.PUBLIC_DIR),
  dist: getRootPath(C.DIST_DIR),
  // 组件打包输出目录
  lib: getRootPath(C.LIB_DIR),
  test: getRootPath('test'),
  tsConfig: getRootPath('tsconfig.json'),
  yarnLock: getRootPath('yarn.lock'),
  nodeModules: getRootPath('node_modules'),
  packageJson: getRootPath(C.PACKAGE_JSON),
  // 配置文件
  marauder: getRootPath(C.MARA_CONF),
  dll: getRootPath(C.DLL_DIR),

  // 脚手架自身相关路径
  marax: resolveOwn('.'),
  maraxNodeModules: resolveOwn('node_modules'),
  maraxPackageJson: resolveOwn(C.PACKAGE_JSON),
  getRootPath,
  getRelativePath
}
