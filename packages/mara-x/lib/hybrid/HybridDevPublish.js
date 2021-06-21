'use strict'

const fs = require('fs')
const path = require('path')
const Vinyl = require('vinyl')
const chalk = require('chalk')
const { fetch, md5, ensureSlash, getGitRepoName } = require('@mara/devkit')
const config = require('../../config')
const paths = require('../../config/paths')
const C = require('../../config/const')
const { uploadVinylFile, basePath } = require('../ftp')
const ManifestPlugin = require('./ManifestPlugin')
const CONF_DIR = path.posix.join(basePath, 'hybrid', 'config')
const CONF_NAME = getHbConfName(config.ciConfig)
const CONF_URL = `http://wap_front.dev.sina.cn/hybrid/config/${CONF_NAME}`

const publishStep = [
  `${chalk.blue('🐝  [1/3]')} Fetching config...`,
  // ✏️ 后面需要多补充一个空格
  `${chalk.blue('✏️   [2/3]')} Updating config...`,
  `${chalk.blue('🚀  [3/3]')} Pushing config...`,
  `🎉  ${chalk.green('Success!')}\n`
]

function getHbConfName(ciConfig) {
  const confName = ciConfig.zip_config_name || 'sina_news'

  return `${confName}.json`
}

async function updateRemoteHbConf(hbConf) {
  // 创建虚拟文件
  const confFile = new Vinyl({
    path: paths.getRootPath(CONF_NAME),
    contents: Buffer.from(JSON.stringify(hbConf))
  })

  try {
    await uploadVinylFile(confFile, CONF_DIR)
  } catch (e) {
    console.log('Hybrid config 上传失败')
    throw new Error(e)
  }
}

async function getProjectName(project) {
  let repoName = ''

  if (project) return project

  try {
    repoName = await getGitRepoName()
  } catch (e) {
    throw new Error('请设置 git 远程仓库地址')
  }

  return repoName
}

async function getHbConf(confUrl) {
  try {
    const hbConf = await fetch.get(confUrl)
    const initConf = {
      status: 0,
      reqTime: Date.now(),
      data: {
        modules: []
      }
    }

    return hbConf || initConf
  } catch (e) {
    console.log(`请检查网络或联系管理员`)
    throw new Error(e)
  }
}

function logResult(hbMod) {
  console.log(hbMod)
  console.log(`\n${chalk.yellow.inverse(' CONF ')} ${chalk.yellow(CONF_URL)}\n`)
}

module.exports = async function hybridDevPublish({
  entry,
  project,
  remotePath,
  version,
  entryArgs
}) {
  console.log('----------- Hybrid Publish: Dev -----------\n')
  console.log(publishStep[0])

  const hbConf = await getHbConf(CONF_URL)
  const projectName = await getProjectName(project)
  const moduleName = `${projectName}/${entry}`
  const localPkgPath = paths.getRootPath(`${C.DIST_DIR}/${entry}/${entry}.php`)
  const moduleIdx = hbConf.data.modules.findIndex(
    item => item.name === moduleName
  )
  let gkTestIds = []
  let qeTestIds = []
  let downloadRank = 5

  try {
    const manifest = require(ManifestPlugin.getManifestPath(entry))

    // manifest 可能不存在，所以放到 try catch 中避免空指针
    gkTestIds = manifest.display.gkTestIds || []
    qeTestIds = manifest.display.qeTestIds || []
    downloadRank = manifest.rank || 5
  } catch (e) {}

  const hbMod = {
    name: moduleName,
    version: version,
    pkg_url: `${ensureSlash(remotePath) + entry}.php`,
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
