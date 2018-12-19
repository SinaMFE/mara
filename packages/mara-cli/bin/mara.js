#!/usr/bin/env node
'use strict'

const semver = require('semver')
const chalk = require('chalk')
const requiredVersion = require('../package.json').engines.node
const currentNodeVersion = process.versions.node

// node >= 8.0.0
if (!semver.satisfies(currentNodeVersion, requiredVersion)) {
  console.log(
    chalk.red(
      `You are running Node ${currentNodeVersion}.\n` +
        `but @mara/create requires Node ${requiredVersion}.\n` +
        'Please update your version of Node.\n'
    )
  )
  process.exit(1)
}

require('../lib/boot')
