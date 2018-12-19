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
    message: 'choose a registry',
    name: 'registry'
  })

  return registry
}

async function getRegSource(registry) {
  return valueMap(regConf).get(registry)
}

module.exports = asyncCommand({
  command: ['nrm [source]'],
  desc: 'npm registry manager',
  builder(yargs) {
    yargs
      .positional('source', { describe: 'npm registry' })
      .example('$0 r', '交互式选择源')
      .example('$0 r sina', 'switch to sina registry')
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
  }
})
