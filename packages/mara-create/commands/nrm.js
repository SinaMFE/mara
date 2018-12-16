'use strict'

const { prompt } = require('inquirer')
const regConf = require('../config/registry')
const asyncCommand = require('../lib/async-command')
const { info, getNpmConfig, setNpmConfig } = require('../lib/utils')

function valueMap(obj) {
  return new Map(Object.entries(obj).map(e => e.reverse()))
}

async function chooseRegistry(defSource) {
  const choices = [...Object.keys(regConf), 'exit']
  const { registry } = await prompt({
    type: 'list',
    choices,
    default: choices.indexOf(defSource),
    filter: source => regConf[source],
    message: '选择仓库源',
    name: 'registry',
  })

  return registry
}

async function getRegSource(registry) {
  return valueMap(regConf).get(registry)
}

module.exports = asyncCommand({
  command: ['nrm [source]'],
  desc: '切换 npm 仓库地址',
  builder(yargs) {
    yargs
      .positional('source', { describe: '仓库源' })
      .example('$0 r', '交互式选择源')
      .example('$0 r sina', '切换至 sina 源')
  },
  async handler(argv) {
    let { source } = argv
    let registry = ''
    let currReg = ''

    // just for new line
    console.log()

    if (source) {
      if (!regConf[source]) info(`Not find registry: ${source}`, 0)
      registry = regConf[source]
    } else {
      currReg = await getNpmConfig('registry')
      source = await getRegSource(currReg)
      registry = await chooseRegistry(source)
    }

    if (registry) {
      if (registry === currReg) {
        info(`Set registry to: ${registry}`, 0)
      }

      setNpmConfig('registry', registry)
      info(`Set registry to: ${registry}`)
    }
  },
})
