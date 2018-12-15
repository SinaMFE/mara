'use strict'

const ora = require('ora')
const which = require('which')
const chalk = require('chalk')
const ui = require('cliui')({ width: 60 })
const regConf = require('../../config/registry')
const asyncCommand = require('../../lib/async-command')
const { info, error, setPmConfig } = require('../../lib/utils')
const { toolchain } = require('../../config')

function checkDep() {
  const res = toolchain.map(name => {
    // if nothrow option is used, returns null if not found
    const path = which.sync(name, { nothrow: true })
    return path ? `  ${name}\t  ${path}` : chalk.red(`  ${name}\t  ${path}`)
  })

  ui.div(res.join('\n'))
  console.log(ui.toString())
}

async function configEnv() {
  const spinner = ora(`配置依赖环境...`).start()

  // spinner.text = 'aaaaaa'
  await setPmConfig('npm')('registry', regConf.taobao)
    .then(() => console.log('  npm registry', regConf.taobao))
    .catch(err => console.log(err))
  // spinner.text = 'bbbb'
  await setPmConfig('cnpm')('registry', regConf.sina).then(() =>
    console.log('  cnpm registry', regConf.sina)
  )
  // spinner.text = 'cccc'
  await setPmConfig('yarn')('registry', regConf.taobao).then(() =>
    console.log('  yarn registry', regConf.taobao)
  )
  // spinner.text = 'dddd'
  await setPmConfig('yarn')('@mfelibs:registry', regConf.sina).then(() =>
    console.log('  yarn @mfelibs:registry', regConf.sina)
  )

  spinner.succeed('配置成功')
}

module.exports = asyncCommand({
  command: 'env',
  desc: '配置开发环境',
  async handler() {
    checkDep()

    await configEnv()
  },
})
