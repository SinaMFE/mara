'use strict'

const fs = require('fs')
const Vinyl = require('vinyl')
const chalk = require('chalk')
const axios = require('axios')
const path = require('path')
const execa = require('execa')
const config = require('../../config')
const { uploadVinylFile } = require('../ftp')
const { rootPath, md5 } = require('../utils')
const CONF_DIR = '/wap_front/hybrid/config/'
const CONF_NAME = getHbConfName(config.ciConfig)
const CONF_URL = `http://wap_front.dev.sina.cn/hybrid/config/${CONF_NAME}`

const publishStep = [
  `${chalk.blue('🐝  [1/4]')} Fetching config...`,
  // ✏️ 后面需要多补充一个空格
  `${chalk.blue('✏️   [2/4]')} Updating config...`,
  `${chalk.blue('🚀  [3/4]')} Pushing config...`,
  `${chalk.blue('🎉  [4/4]')} ${chalk.green('Success')}\n`
]

function getHbConfName(ciConfig) {
  const confName = ciConfig.zip_config_name || 'sina_news'

  return `${confName}.json`
}

async function updateRemoteHbConf(hbConf) {
  // 创建虚拟文件
  const confFile = new Vinyl({
    path: rootPath(CONF_NAME),
    contents: Buffer.from(JSON.stringify(hbConf))
  })

  try {
    await uploadVinylFile(confFile, CONF_DIR)
  } catch (e) {
    console.log('Hybrid config 上传失败')
    throw new Error(e)
  }
}

async function getRepoName() {
  let repoName = ''

  try {
    repoName = await getGitRepoName()
  } catch (e) {
    repoName = require(config.paths.packageJson).name
  }

  return repoName
}

async function getGitRepoName() {
  const { stdout: remoteUrl } = await execa('git', [
    'config',
    '--get',
    'remote.origin.url'
  ])

  return path.basename(remoteUrl, '.git')
}

async function getHbConf(confPath) {
  try {
    const hbConf = await axios(confPath)
    const initConf = {
      status: 0,
      reqTime: Date.now(),
      data: {
        modules: []
      }
    }

    return hbConf.data || initConf
  } catch (e) {
    console.log(`请检查网络或联系管理员`)
    throw new Error(e)
  }
}

function logResult(hbMod) {
  console.log(hbMod)
  console.log(`\n${chalk.bgYellow(' CONF ')} ${chalk.yellow(CONF_URL)}\n`)
}

module.exports = async function(entry, remotePath) {
  console.log('----------- Hybrid Publish: Dev -----------\n')
  console.log(publishStep[0])

  const hbConf = await getHbConf(CONF_URL)
  const repoName = await getRepoName()
  const moduleName = `${repoName}/${entry}`
  const localPkgPath = rootPath(`dist/${entry}/${entry}.php`)
  const moduleIdx = hbConf.data.modules.findIndex(
    item => item.name === moduleName
  )
  let gkTestIds = []
  let qeTestIds = []
  let downloadRank = 5

  try {
    const manifest = require(rootPath(`src/view/${entry}/public/manifest.json`))

    gkTestIds = manifest.display.gkTestIds || []
    qeTestIds = manifest.display.qeTestIds || []
    downloadRank = manifest.rank || 5
  } catch (e) {}

  const hbMod = {
    name: moduleName,
    version: process.env.npm_package_version,
    pkg_url: `${remotePath + entry}.php`,
    hybrid: true,
    md5: md5(fs.readFileSync(localPkgPath)),
    gkList: gkTestIds,
    qeList: qeTestIds,
    rank: downloadRank
  }

  console.log(publishStep[1])
  if (moduleIdx > -1) {
    hbConf.data.modules[moduleIdx] = hbMod
  } else {
    hbConf.data.modules.push(hbMod)
  }

  console.log(publishStep[2])
  await updateRemoteHbConf(hbConf)
  console.log(publishStep[3])

  logResult(hbMod)
}
