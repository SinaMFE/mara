#!/usr/bin/env node
'use strict'

const chalk = require('chalk')
const semver = require('semver')
// 引用 config 子模块
// 不引用 config/index 避免 env 过早初始化
const argv = require('../config/argv')
const paths = require('../config/paths')
const pkg = require('../package.json')
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

const notifier = require('update-notifier')({ pkg })

if (notifier.update && notifier.update.latest !== pkg.version) {
  const old = notifier.update.current
  const latest = notifier.update.latest
  let type = notifier.update.type

  if (useColor) {
    switch (type) {
      case 'major':
        type = chalk.red(type)
        break
      case 'minor':
        type = chalk.yellow(type)
        break
      case 'patch':
        type = chalk.green(type)
        break
    }
  }

  notifier.notify({
    message:
      `New ${type} version of ${pkg.name} available! ${
        useColor ? chalk.red(old) : old
      } → ${useColor ? chalk.green(latest) : latest}\n` +
      `Run ${
        useColor
          ? chalk.green(`yarn add -D ${pkg.name}`)
          : `yarn add -D ${pkg.name}`
      } to update!`
  })
}

const cmdMap = {
  dev: 'serve',
  test: 'test',
  build: 'build',
  lib: 'buildLib',
  dll: 'dll',
  hook: 'hook'
}
const cmd = cmdMap[argv._[0]]

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
