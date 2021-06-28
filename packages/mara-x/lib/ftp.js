'use strict'

const vfs = require('vinyl-fs')
const Ftp = require('vinyl-ftp')
const openBrowser = require('react-dev-utils/openBrowser')
const path = require('path')
const chalk = require('chalk')
const config = require('../config')
const C = require('../config/const')
const { rootPath } = require('./utils')
const basePath = '/data0/ftproot/wap_front'

const isInteractive = process.stdout.isTTY
const ftpConf = config.ftp
const uploadStep = [
  `${chalk.blue('🌝  [1/2]')} Connecting ${chalk.yellow(config.ftp.host)}...`,
  `${chalk.blue('🚀  [2/2]')} Uploading package...`,
  `🎉  ${chalk.green('Success!')}\n`
]

async function upload(filePath, remotePath) {
  console.log('------------- Ftp uploading -------------\n')
  console.log(uploadStep[0])
  const conn = new Ftp(ftpConf)

  return new Promise((resolve, reject) => {
    console.log(uploadStep[1])

    vfs.src([filePath], { buffer: false }).pipe(
      conn
        .dest(remotePath)
        .on('end', resolve)
        .on('error', reject)
    )
  })
}

function getRemotePath({ project, view, namespace, target, version }) {
  namespace = namespace ? `branch_${namespace}` : ''

  return path.posix.join(
    basePath,
    'marauder',
    project,
    ftpConf.remotePath.version ? version : '',
    namespace,
    // 添加构建类型标识，隔离环境
    target || '',
    view
  )
}

module.exports.uploadVinylFile = async function(vinylFile, remoteFolder) {
  const conn = new Ftp(ftpConf)
  const remotePath = path
    .join('/', remoteFolder, vinylFile.relative)
    .replace(/\\/g, '/')

  return new Promise((resolve, reject) => {
    // vinyl-ftp 私有方法，接受一个 Vinyl 文件
    conn.upload(vinylFile, remotePath, (err, file) => {
      if (err) {
        reject(err)
      } else {
        resolve(file)
      }
    })
  })
}

/**
 * 文件夹上传
 * @param  {object} options
 * @param  {string} options.project      项目名
 * @param  {string} options.view         页面名
 * @param  {string} [options.namespace]  命名空间
 * @param  {string} [options.target]     页面类型
 * @return {Promise}
 */
module.exports.uploadDir = async function(options) {
  const HOST = 'http://wap_front.dev.sina.cn'
  const view = `${options.view}/` || ''

  // /wap_front/marauder/hdphoto/1.1.0/wensen/index
  const remotePath = getRemotePath(options)
  const localPath = rootPath(`${C.DIST_DIR}/${view}`) + '/**'

  try {
    await upload(localPath, remotePath)
    console.log(uploadStep[2])

    const url = HOST + remotePath.replace(basePath, '')
    console.log(`${chalk.yellow.inverse(' URL ')} ${chalk.yellow(url)}\n`)

    ftpConf.openBrowser && isInteractive && openBrowser(url)

    return url
  } catch (err) {
    const errMsg =
      `🌚  ${err}\n` +
      '    1) 请检查网络和 VPN 连接\n' +
      '    2) 请检查 marauder.config ftp 配置'

    throw new Error(chalk.red(errMsg))
  }
}

module.exports.getFile = async function(remotePath) {
  const conn = new Ftp(ftpConf)

  return new Promise((resolve, reject) => {
    conn
      .src(remotePath, { buffer: true })
      .on('data', file => resolve(file.contents))
      .on('error', reject)
  })
}

module.exports.basePath = basePath
