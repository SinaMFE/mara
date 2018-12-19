'use strict'

const chalk = require('chalk')
const request = require('request')
const spawn = require('cross-spawn')

// https://stackoverflow.com/questions/20270973/nodejs-spawn-stdout-string-format
function buffer2String(data) {
  return data.toString().replace(/[\n\r]/g, '')
}

/**
 * 返回指定精度整型随机数
 * @param  {Number} min 左边距
 * @param  {Number} max 右边距
 * @return {Number}   指定范围随机数
 * random(1, 3)  // 1 | 2 | 3
 */
function random(min = 0, max = 1) {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

function fetch(url) {
  return new Promise((resolve, reject) => {
    request(
      { url: url, headers: { 'User-Agent': 'mara-cli' } },
      (err, res, body) => {
        if (err) reject(err)
        const requestBody = JSON.parse(body)
        if (Array.isArray(requestBody)) {
          resolve(requestBody)
        } else {
          reject(requestBody.message)
        }
      }
    )
  })
}

function getPmConfig(name) {
  return async key => {
    const npm = spawn(name, ['config', 'get', key])

    return new Promise((resolve, reject) => {
      npm.stdout.on('data', data => {
        resolve(buffer2String(data))
      })

      npm.stderr.on('data', data => {
        reject(buffer2String(data))
      })
    })
  }
}

const getNpmConfig = getPmConfig('npm')

const setNpmConfig = setPmConfig('npm')

function setPmConfig(name) {
  return async (key, value) => {
    const npm = spawn(name, ['config', 'set', key, value])

    return new Promise((resolve, reject) => {
      npm.stdout.on('data', data => {
        resolve(buffer2String(data))
      })

      npm.stderr.on('data', data => {
        reject(buffer2String(data))
      })
    })
  }
  // return (key, value) =>
  //   Promise.resolve(spawn.sync(name, ['config', 'set', key, value]))
}

function log(text) {
  process.stderr.write(text)
}

function info(text, code = -1) {
  process.stderr.write(chalk.blue(' INFO ') + text + '\n')
  code > -1 && process.exit(code)
}

function warn(text, code = -1) {
  process.stdout.write(chalk.yellow(' WARN ') + text + '\n')
  code > -1 && process.exit(code)
}

function error(text, code = -1) {
  process.stderr.write(chalk.red(' ERROR ') + text + '\n')
  code > -1 && process.exit(code)
}

module.exports = {
  log,
  fetch,
  info,
  warn,
  random,
  error,
  getPmConfig,
  setPmConfig,
  getNpmConfig,
  setNpmConfig
}
