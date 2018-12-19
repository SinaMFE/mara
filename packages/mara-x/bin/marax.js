#!/usr/bin/env node
'use strict'

const chalk = require('chalk')
const semver = require('semver')
const paths = require('../config/paths')
const requiredVersion = require('../package.json').engines.node
const currentNodeVersion = process.versions.node

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

// rawArgv 是当前 bin 脚本的参数，为 bin 以后的内容
// 如 marax build index => rawArgv: ['build', 'index']
const rawArgv = process.argv.slice(2)

// npm run dev page_a => {"_":["dev","page_a"]}
// npm run dev page_a --ftp => {"_":["dev","page_a"]}
// npm run dev page_a --ftp sss => {"_":["dev","page_a","ssss"]}
// marax dev page_a => {"_":["dev","page_a"]}
// marax dev page_a --ftp => {"_":["dev","page_a"],"ftp":true}
// npx marax dev page_a --ftp sss => {"_":["dev","page_a"],"ftp":"sss"}
const args = require('minimist')(rawArgv)
const cmdMap = {
  dev: 'serve',
  test: 'test',
  build: 'build',
  lib: 'buildLib',
  dll: 'dll'
}
const cmd = cmdMap[args._[0]]

// load build type from cli
// 保留缺省场景(undefined)，方便识别
if (args.wap || args.web) {
  process.env.jsbridgeBuildType = 'web'
} else if (args.app) {
  process.env.jsbridgeBuildType = 'app'
}

process.env.MARA_compileModel = 'build'
if (args.dev) {
  process.env.MARA_compileModel = 'dev'
}

if (args.v) {
  console.log(require(paths.maraPackageJson).version, '\n')
} else if (!cmd) {
  console.log('\nUnknown script "' + rawArgv + '".')
  console.log('Perhaps you need to update @mara/x?')
  console.log('See: https://github.com/SinaMFE/marauder/blob/master/README.md')
  process.exit(0)
} else {
  require(`../build/${cmd}`)(args)
}
