'use strict'

const ora = require('ora')
const fs = require('fs-extra')
const asyncCommand = require('../lib/async-command')

module.exports = asyncCommand({
  command: 'config [command] [option]',
  desc: '设置',
  async handler() {
    console.log('🚧正在建设中...🚧')
  },
})
