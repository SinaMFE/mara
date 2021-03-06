#!/usr/bin/env node
'use strict'

const chalk = require('chalk')
const semver = require('semver')
// 引用 config 子模块
// 不引用 config/index 避免 env 过早初始化
const argv = require('../config/argv')
const paths = require('../config/paths')
const pkg = require('../package.json')
const updateNotifier = require('../lib/updateNotifier')
const requiredVersion = pkg.engines.node
const currentNodeVersion = process.versions.node
const useColor = process.stdout.isTTY && process.env['TERM'] !== 'dumb'

// node >= 8.0.0
if (!semver.satisfies(currentNodeVersion, requiredVersion)) {
  console.log(
    chalk.red(
      `You are running Node ${currentNodeVersion}.\n` +
        `but @mara/x requires Node ${requiredVersion}.\n` +
        'Please update your version of Node.\n'
    )
  )
  process.exit(1)
}

const cmdMap = {
  dev: 'serve',
  test: 'test',
  build: 'build',
  lib: 'buildLib',
  dll: 'dll',
  hook: 'hook',
  workspace: 'workspace'
}
const cmd = cmdMap[argv._[0]]

updateNotifier()

if (argv.v) {
  console.log(require(paths.maraxPackageJson).version)
} else if (!cmd) {
  // rawArgv 是当前 bin 脚本的参数，为 bin 以后的内容
  // 如 marax build index => rawArgv: ['build', 'index']
  const rawArgv = process.argv.slice(2)

  console.log('\nUnknown script "' + rawArgv + '".')
  console.log('Perhaps you need to update @mara/x?')
  console.log('See: https://github.com/SinaMFE/mara/blob/master/README.md')
  process.exit(0)
} else {
  require(`../scripts/${cmd}`)(argv)
}
