const chalk = require('chalk')
const TYPE = 'cant-resolve-loader'

function format(errors) {
  return errors
    .filter(e => e.type === TYPE)
    .map(e => {
      return `Failed to resolve loader: ${chalk.yellow(e.loader)}`
    })
    .concat(`\nYou may need to install the missing loader.`)
}

module.exports = format
