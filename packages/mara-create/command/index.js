'use strict'

const create = require('./create')
const options = require('./options')
const asyncCommand = require('../lib/async-command')

module.exports = asyncCommand({
  command: 'create <app-directory> [options]',
  desc: 'create a new project powered by @mara/x',
  builder(yargs) {
    yargs
      .positional('app-directory', {
        describe: 'project directory',
        type: 'string'
      })
      .options(options)
  },
  async handler(argv) {
    create(argv)
    console.log('success')
  }
})
