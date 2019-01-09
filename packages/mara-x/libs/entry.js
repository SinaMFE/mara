'use strict'

const chalk = require('chalk')
const { prompt } = require('inquirer')
const config = require('../config')
const { getPageList } = require('./utils')
const pages = getPageList(config.paths.entryGlob)

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
  console.log(`😶 ${chalk.red('请按如下结构创建入口文件')}`)
  console.log(
    `
  src
  └── view
      ├── page1
      │   ├── ${chalk.green('index.html')}
      │   └── ${chalk.green('index.(js|ts)')}
      └── page2
          ├── ${chalk.green('index.html')}
          └── ${chalk.green('index.(js|ts)')}`,
    '\n'
  )
  process.exit(1)
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
  // yarn run build --ftp
  if (argv.ftp) {
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

  return Promise.resolve({ entry, ftpBranch, entryArgs, argv })
}

function chooseOne(argv) {
  const entry = argv._[1]

  if (entry && !validEntry(entry)) {
    return chooseEntry('您输入的页面有误, 请选择:', argv)
  } else {
    // 无输入时返回默认页
    return result(pages[0], argv)
  }
}

function chooseMany(argv) {
  const entry = argv._[1]

  if (validEntry(entry)) return result(entry, argv)

  return chooseEntry(entry && '您输入的页面有误, 请选择:', argv)
}

function validEntry(entry) {
  return pages.includes(entry)
}

async function chooseEntry(msg, argv) {
  const list = [...pages]
  // const list = [...pages, new Separator(), { name: 'exit', value: '' }]
  const question = {
    type: 'list',
    name: 'entry',
    choices: list,
    default: list.indexOf('index'),
    // message 不可为空串
    message: msg || '请选择目标页面:'
  }
  const { entry } = await prompt(question)

  if (!entry) process.exit(0)
  console.log()

  return result(entry, argv)
}

module.exports = async function getEntry(argv) {
  if (!pages.length) {
    empty()
  } else if (pages.length === 1) {
    return chooseOne(argv)
  } else {
    return chooseMany(argv)
  }
}
