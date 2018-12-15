'use strict'

const ora = require('ora')
const fs = require('fs-extra')
const asyncCommand = require('../lib/async-command')

module.exports = asyncCommand({
  command: ['update', 'up'],
  desc: '更新模板索引信息',
  async handler() {
    console.log('更新模板索引信息')
  },
})
