const chalk = require('chalk')
const envinfo = require('envinfo')
const asyncCommand = require('../lib/async-command')

module.exports = asyncCommand({
  command: 'info',
  desc: 'print environment debug info',
  async handler() {
    console.log(chalk.bold('\nEnvironment Info:'))

    return envinfo
      .run(
        {
          System: ['OS', 'CPU'],
          Binaries: ['Node', 'npm', 'Yarn'],
          Browsers: [
            'Chrome',
            'Edge',
            'Internet Explorer',
            'Firefox',
            'Safari'
          ],
          npmPackages: ['vue', 'react', 'react-dom', '@mara/x'],
          npmGlobalPackages: ['@mara/cli']
        },
        {
          clipboard: false,
          duplicates: true,
          showNotFound: false
        }
      )
      .then(console.log)
  }
})
