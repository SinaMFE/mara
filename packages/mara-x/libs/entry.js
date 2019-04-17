'use strict'

const fs = require('fs')
const chalk = require('chalk')
const prompts = require('prompts')
const config = require('../config')
const { getViews, rootPath } = require('./utils')
const skeleton = require('./skeleton')
const views = getViews(config.paths.entryGlob)

// TL
// 识别 entry, branch
// 兼容 yarn 与 npm
// 可指定输入页面名，或选择页面名

// npm run build
// npm run build --ftp
// npm run build --ftp test
// yarn build
// yarn build index --ftp
// yarn build index --ftp test
// 输入出错

function empty() {
  let msg = '请按如下结构创建页面'

  if (fs.existsSync(rootPath('src/view'))) {
    msg += '，如果您从 marax@1.x 迁移，请将 view 目录重命名为 views'
  }

  console.log(chalk.red(msg))
  console.log(skeleton.project, '\n')
  process.exit(0)
}

function getEntryArgs(argv, optField) {
  let val = null

  config.build[`arg_${optField}`] = process.env[`npm_config_${optField}`]

  // npx marax build --ftp
  // yarn run build --ftp
  if (argv[optField]) {
    val = argv[optField] === true ? '' : argv[optField]
    config.build[`arg_${optField}`] = true
  } else if (config.build[`arg_${optField}`]) {
    // 兼容 npm run build --ftp xxx
    // 默认的 config.build.uploadFtp 为 process.env.npm_config_ftp
    // 当无分支名时，返回 ''
    val = argv._[2] || ''
  }

  return { [optField]: val }
}

function result(entry = '', argv) {
  // 未启用 ftp 上传时，返回 null
  let ftpBranch = null
  let entryArgs = {}

  // npx marax build --ftp
  // npm run build --ftp
  // yarn build --ftp
  if (argv.ftp !== undefined) {
    ftpBranch = argv.ftp === true ? '' : argv.ftp
    config.build.uploadFtp = true
  } else if (config.build.uploadFtp) {
    // 兼容 npm run build --ftp xxx
    // 默认的 config.build.uploadFtp 为 process.env.npm_config_ftp
    // 当无分支名时，返回 ''
    ftpBranch = argv._[2] || ''
  }

  entryArgs = Object.assign(
    {},
    getEntryArgs(argv, 'ftp'),
    getEntryArgs(argv, 'test')
  )

  return Promise.resolve({ entry, ftpBranch, entryArgs })
}

function chooseOne(argv) {
  const entry = argv._[1]

  if (entry && !validEntry(entry)) {
    return chooseEntry('Incorrect view, please re-pick', argv)
  } else {
    // 无输入时返回默认页
    return result(views[0], argv)
  }
}

function chooseMany(argv) {
  const entry = argv._[1]

  if (validEntry(entry)) return result(entry, argv)

  return chooseEntry(entry && 'Incorrect view, please re-pick', argv)
}

function validEntry(entry) {
  return views.includes(entry)
}

async function chooseEntry(msg, argv) {
  const list = [...views]
  const initial = list.indexOf('index')

  const question = {
    type: 'autocomplete',
    name: 'entry',
    choices: list.map(view => ({ title: view, value: view })),
    initial: initial < 0 ? 0 : initial,
    // message 不可为空串
    message: msg || 'Pick target view'
  }

  const { entry } = await prompts(question)

  if (!entry) process.exit(0)
  console.log()

  return result(entry, argv)
}

module.exports = async function getEntry(argv) {
  if (!views.length) {
    empty()
  } else if (views.length === 1) {
    return chooseOne(argv)
  } else {
    return chooseMany(argv)
  }
}
