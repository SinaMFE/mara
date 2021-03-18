'use strict'

const fs = require('fs')
const glob = require('glob')
const path = require('path')
const chalk = require('chalk')
const prompts = require('prompts')
const config = require('../config')
const paths = require('../config/paths')
const { GLOB, VIEWS_DIR, WORKSPACE_PROJECT_DIR } = require('../config/const')
const skeleton = require('./skeleton')

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

  if (fs.existsSync(paths.view)) {
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
  if (argv[optField] !== undefined) {
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

function result(entry = '', views, argv) {
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
    argv,
    getEntryArgs(argv, 'ftp'),
    getEntryArgs(argv, 'test')
  )

  let workspace = ''

  if (argv.rootWorkspace) {
    workspace = entry.split('/')[0]
    entry = entry.split('/')[1]
  } else if (argv.workspace) {
    workspace = path.basename(paths.root)
  }

  return Promise.resolve({
    entry,
    views,
    workspace,
    ftpBranch,
    entryArgs
  })
}

async function resolveBuildEntry(views, argv) {
  if (!views.length) return empty()

  if (views.length === 1) {
    return chooseOne(views, argv)
  } else {
    return chooseMany(views, argv)
  }
}

function chooseOne(views, argv) {
  const entry = argv._[1]

  if (entry && !validEntry(views, entry)) {
    return chooseEntry(views, argv, 'Incorrect view, please re-pick')
  } else {
    // 无输入时返回默认页
    return result(views[0], views, argv)
  }
}

function chooseMany(views, argv) {
  const entry = argv.rootWorkspace ? argv._[2] : argv._[1]

  if (validEntry(views, entry)) return result(entry, views, argv)

  return chooseEntry(views, argv, entry && 'Incorrect view, please re-pick')
}

function validEntry(views, entry) {
  return views.includes(entry)
}

async function chooseEntry(views, argv, msg) {
  const list = [...views]
  const initial = list.indexOf('index')

  const question = {
    type: 'autocomplete',
    name: 'entry',
    choices: list.map(view => ({ title: view, value: view })),
    initial: initial < 0 ? 0 : initial,
    // message 不可为空串
    message: msg || '请选择目标页面'
  }

  const { entry } = await prompts(question)

  if (!entry) process.exit(0)
  console.log()

  return result(entry, views, argv)
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
function getEntries(globPath, preDep = [], isRootWorkspace) {
  const files = glob.sync(paths.getRootPath(globPath))
  const hasPreDep = preDep.length > 0
  const getViewName = filepath => {
    if (isRootWorkspace) {
      const projectPath = path.relative(
        `${paths.root}/${WORKSPACE_PROJECT_DIR}/`,
        filepath
      )
      const projectName = projectPath.split('/')[0]
      const viewName = projectPath.split('/')[3]

      // 兼容组件，src/index.js
      return `${projectName}/${viewName}`
    }

    const dirname = path.dirname(
      path.relative(`${paths.root}/${VIEWS_DIR}/`, filepath)
    )
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

function getServantEntry(entry, preDep = []) {
  const files = glob.sync(
    paths.getRootPath(`${VIEWS_DIR}/${entry}/${GLOB.SERVANT_ENTRY}`)
  )
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
 * 获取入口文件名列表
 * @return {Array} 入口名数组
 */
function getViews(entryGlob, isRootWorkspace) {
  const entries = getEntries(entryGlob, [], isRootWorkspace)

  return Object.keys(entries)
}

async function getBuildEntry(argv) {
  let views

  if (argv.rootWorkspace) {
    views = getViews(paths.workspaceEntryGlob, true)
  } else {
    views = getViews(paths.entryGlob)
  }

  // views 正序排列
  views = views.sort()

  return resolveBuildEntry(views, argv)
}

module.exports = { getViews, getBuildEntry, getEntries, getServantEntry }
