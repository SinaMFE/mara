'use strict'

const ora = require('ora')
const fs = require('fs-extra')
const asyncCommand = require('../lib/async-command')

module.exports = asyncCommand({
  command: 'new <project-name> [template]',
  desc: '在指定目录创建项目',
  async handler() {
    console.log('在指定目录创建项目')
  },
})
