'use strict'

const ui = require('cliui')({ width: 60 })
const asyncCommand = require('../../lib/async-command')
const { fetch, error, info } = require('../../lib/utils')

const queryAddress =
  'http://sias.erp.sina.com.cn/sias/index.php/system/person_select/queryByName?username=wensen'

module.exports = asyncCommand({
  command: 'find',
  desc: '查找某人',
  async handler() {
    try {
      const res = await fetch(queryAddress + 'wensen')
      console.log(res)
    } catch (e) {
      error(e, 1)
    }
  },
})
