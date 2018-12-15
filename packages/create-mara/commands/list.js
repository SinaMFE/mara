'use strict'

const ora = require('ora')
const chalk = require('chalk')
const fs = require('fs-extra')
const asyncCommand = require('../lib/async-command')
const { fetch, error, info } = require('../lib/utils')

const REPOS_URL = 'https://api.github.com/users/vuejs-templates/repos'

module.exports = asyncCommand({
  command: ['list', 'ls'],

  desc: '列举官方可用模板',

  async handler() {
    try {
      let repos = await fetch(REPOS_URL)

      process.stdout.write('\n')
      info('Available official templates: \n')

      repos.forEach(repo => {
        console.log(
          '  ' +
            chalk.yellow('★') +
            '  ' +
            chalk.blue(repo.name) +
            ' - ' +
            repo.description
        )
      })

      process.stdout.write('\n')
    } catch (err) {
      error(err, 1)
    }
  },
})
