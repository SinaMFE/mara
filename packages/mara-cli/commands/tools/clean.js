'use strict'

const fs = require('fs-extra')
const asyncCommand = require('../../lib/async-command')
const cleanDep = require('../../lib/clean-dep')
const { error } = require('../../lib/utils')

const TARGETS = ['yarn.lock', 'package-lock.json', 'node_modules']

module.exports = asyncCommand({
  command: 'clean',
  desc: '清理项目依赖',
  async handler() {
    const hasPkgJson = await fs.exists('package.json')

    if (!hasPkgJson) return console.log('什么都没有发生...')

    try {
      await cleanDep(TARGETS)
      console.log('\n清理完毕，执行 yarn 重建依赖')
    } catch (e) {
      error(e)
    }
  }
})
