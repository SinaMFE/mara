#!/usr/bin/env node

'use strict'

const yargs = require('yargs')
const init = require('../commands/init')
const config = require('../commands/config')
const list = require('../commands/list')
const nrm = require('../commands/nrm')
const toolbox = require('../commands/toolbox')

yargs
  .usage('Usage: $0 <command> [options]')
  .alias('v', 'version')
  .help('h')
  .alias('h', 'help')
  .command(init)
  .command(config)
  .command(list)
  .command(nrm)
  .command(toolbox)
  // .epilogue('for more information, find our manual at http://marauder.com')
  .demandCommand().argv
