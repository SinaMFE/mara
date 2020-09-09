'use strict'

const fs = require('fs-extra')
const path = require('path')
const glob = require('glob')
const { execa } = require('@mara/devkit')
const C = require('../config/const')

// 【注意】utils.js 为纯工具库，请不要依赖 config/index.js

// From create-react-app
// Make sure any symlinks in the project folder are resolved:
// https://github.com/facebookincubator/create-react-app/issues/637
const appDirectory = fs.realpathSync(process.cwd())

function rootPath(relativePath) {
  return path.resolve(appDirectory, relativePath)
}

/**
 * 获取入口文件名列表
 * @return {Array} 入口名数组
 */
function getViews(entryGlob, useWorkspace) {
  const entries = getEntries(`${process.cwd()}/${entryGlob}`, [], useWorkspace)
  return Object.keys(entries)
}

/**
 * 获取指定路径下的入口文件
 * @param  {String} globPath 通配符路径
 * @param  {String} preDep 前置模块
 * @return {Object}          入口名:路径 键值对
 * {
 *   viewA: ['a.js'],
 *   viewB: ['b.js']
 * }
 */
function getEntries(globPath, preDep = [], useWorkspace) {
  const files = glob.sync(rootPath(globPath))
  const hasPreDep = preDep.length > 0
  const getViewName = filepath => {
    if (useWorkspace) {
      const projectPath = path.relative(`${process.cwd()}/projects/`, filepath)
      const projectName = projectPath.split('/')[0]
      const dirname = projectPath.split('/')[3]

      // 兼容组件，src/index.js
      return `${projectName}/${dirname}`
    }

    const dirname = path.dirname(path.relative(`${C.VIEWS_DIR}/`, filepath))
    // 兼容组件，src/index.js
    return dirname === '..' ? 'index' : dirname
  }

  // glob 按照字母顺序取 .js 与 .ts 文件
  // 通过 reverse 强制使 js 文件在 ts 之后，达到覆盖目的
  // 保证 index.js 优先原则
  return files.reverse().reduce((entries, filepath) => {
    const name = getViewName(filepath)
    // preDep 支持数组或字符串。所以这里使用 concat 方法
    entries[name] = hasPreDep ? [].concat(preDep, filepath) : filepath

    return entries
  }, {})
}

function getEntryPoints(globPath, preDep = []) {
  const files = glob.sync(rootPath(globPath))
  const getChunkName = filepath => {
    const extname = path.extname(filepath)
    const basename = path.posix.basename(filepath, extname)

    return basename.replace(/^index\./, '') + '.servant'
  }

  return files.reduce((chunks, filepath) => {
    const name = getChunkName(filepath)
    // preDep 支持数组或字符串。所以这里使用 concat 方法
    chunks[name] = [].concat(preDep, filepath)

    return chunks
  }, {})
}

/**
 * 解析日期
 * @param  {Date | Number} target 日期对象或时间戳
 * @return {Object}        结果对象
 */
function parseDate(target) {
  const f = n => (n > 9 ? n : '0' + n)
  const date = target instanceof Date ? target : new Date(target)
  return {
    y: date.getFullYear(),
    M: f(date.getMonth() + 1),
    d: f(date.getDate()),
    h: f(date.getHours()),
    m: f(date.getMinutes()),
    s: f(date.getSeconds())
  }
}

/**
 * 格式化日期为 yyyy-MM-dd 格式
 * @param  {Date | Number} dt 日期对象或时间戳
 * @return {String}    格式化结果
 */
function pubDate(dt) {
  const date = parseDate(dt)
  return `${date.y}-${date.M}-${date.d}`
}

/**
 * 生成 banner
 * @return {String} 包含项目版本号，构建日期
 */
function banner(version, target = '') {
  return (
    `@version ${version}\n` +
    `@date ${pubDate(new Date())}\n` +
    // 对 bundle 文件添加 @generated 标识
    // 在 code review 面板忽略相关 diff
    `@generated ${target}`
  )
}

function isNotEmptyArray(target) {
  return Array.isArray(target) && target.length
}

function isObject(obj) {
  return Object.prototype.toString.call(obj) === '[object Object]'
}

function assetsPath(_path) {
  return path.posix.join('static', _path)
}

function readJson(file) {
  return fs.readJsonSync(file, { throws: false })
}

function sortObject(obj, keyOrder, dontSortByUnicode) {
  if (!obj) return
  const res = {}

  if (keyOrder) {
    keyOrder.forEach(key => {
      res[key] = obj[key]
      delete obj[key]
    })
  }

  const keys = Object.keys(obj)

  !dontSortByUnicode && keys.sort()
  keys.forEach(key => {
    res[key] = obj[key]
  })

  return res
}

function relativePath(filePath) {
  return '.' + path.sep + path.relative(appDirectory, filePath)
}

function bumpProjectVersion(version = 'prerelease') {
  return execa.sync('npm', ['--no-git-tag-version', 'version', version])
}

function isInstalled(name) {
  try {
    require.resolve(name)
    return true
  } catch (e) {
    return false
  }
}

module.exports = {
  assetsPath,
  bumpProjectVersion,
  isObject,
  getViews,
  getEntries,
  getEntryPoints,
  rootPath,
  parseDate,
  pubDate,
  banner,
  isNotEmptyArray,
  isInstalled,
  sortObject,
  readJson,
  relativePath
}
