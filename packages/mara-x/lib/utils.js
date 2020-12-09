'use strict'

// 【注意】utils.js 为纯工具库，请不要依赖 config/index.js

const fs = require('fs-extra')
const path = require('path')
const { execa } = require('@mara/devkit')
const C = require('../config/const')

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

function findProjectRoot(base) {
  let prev = null
  let dir = base

  do {
    if (fs.existsSync(path.join(dir, C.PACKAGE_JSON))) {
      return dir
    }

    prev = dir
    dir = path.dirname(dir)
  } while (dir !== prev)

  return base
}

module.exports = {
  bumpProjectVersion,
  findProjectRoot,
  isObject,
  parseDate,
  pubDate,
  banner,
  isNotEmptyArray,
  isInstalled,
  sortObject,
  readJson
}
