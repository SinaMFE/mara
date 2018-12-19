'use strict'

const ora = require('ora')
const path = require('path')
const download = require('download-git-repo')
const fs = require('fs-extra')
const { prompt } = require('inquirer')
const asyncCommand = require('../lib/async-command')
const home = require('os').homedir()
const tmp = path.join(home, '.mara')

async function destCheck(dest, inPlace) {
  if (!(await fs.exists(dest))) return true

  const { aware } = await prompt({
    type: 'confirm',
    message: inPlace
      ? 'Generate project in current directory?'
      : 'Target directory exists. Continue?',
    name: 'aware'
  })

  return aware
}

function run() {
  console.log('have fun')
}

module.exports = asyncCommand({
  command: 'init <template> [project-name]',
  desc: '在当前目录初始化项目',
  builder(yargs) {
    yargs
      .positional('template', { describe: '模板名称' })
      .positional('project-name', {
        describe: '项目目录，缺省时为当前目录',
        default: '.'
      })
      .example('$0 init app my-project', 'create a new project')
      .example('$0 init spkg my-component', 'create a new component')
  },
  async handler(argv) {
    const { template, projectName: dest } = argv
    const inPlace = dest === '.'

    const aware = await destCheck(dest, inPlace)

    if (aware) run()
  }
})
