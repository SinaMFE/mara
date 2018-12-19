const yargs = require('yargs')
const chalk = require('chalk')
const create = require('@mara/create/command')
const config = require('../commands/config')
const nrm = require('../commands/nrm')
const info = require('../commands/info')
const toolbox = require('../commands/toolbox')
const upgrade = require('../commands/upgrade')

yargs
  .usage('Usage: $0 <command> [options]')
  .alias('v', 'version')
  .help()
  .alias('h', 'help')
  .command(create)
  .command(config)
  .command(nrm)
  .command(info)
  .command(upgrade)
  .command(toolbox)
  .epilogue(
    `Run ${chalk.cyan(
      `mara <command> --help`
    )} for detailed usage of given command.`
  )
  .demandCommand().argv
