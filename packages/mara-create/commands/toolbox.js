'use strict'

const asyncCommand = require('../lib/async-command')
const { random } = require('../lib/utils')

const wishlist = [
  '罐冰阔乐',
  '袋奥利奥',
  '包辣条',
  '条士力架',
  '杯热咖啡',
  '瓶阿萨姆',
  '张彩票',
  '个红苹果',
  '串糖葫芦',
  '盒特仑苏',
]

module.exports = asyncCommand({
  command: ['tool <order>', 't', 'x'],
  desc: '后备箱',
  builder(yargs) {
    yargs
      .commandDir('./tools')
      .example('$0 t clean', `清理项目依赖`)
      .example(
        '$0 t thx',
        `赞助 wensen 一${wishlist[random(0, wishlist.length - 1)]}`
      )
  },
  async handler(argv) {
    const { order } = argv

    if (order === 'thx') {
      console.log('thanks bro')
    } else {
      console.log('什么都没有发生...')
    }
  },
})
