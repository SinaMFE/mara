async function extractMetaData(argv, context) {
  const chalk = require('chalk')
  const { isInstalled } = require('../lib/utils')
  const config = require('../config')

  if (isInstalled('@mara/plugin-extract-comp-meta')) {
    const plugin = require('@mara/plugin-extract-comp-meta')

    return plugin({ config, argv, context })
  } else {
    console.log(chalk.red('Please install @mara/plugin-extract-comp-meta'))
  }
}

module.exports = extractMetaData
