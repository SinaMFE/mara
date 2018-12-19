'use strict'

const asyncCommand = require('../lib/async-command')

module.exports = asyncCommand({
  command: 'upgrade',
  desc: 'upgrade @mara/x',
  async handler() {
    console.log('更新模板索引信息')
  }
})
