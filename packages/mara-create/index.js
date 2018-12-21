const chalk = require('chalk')
const create = require('./command/create')
const options = require('./command/options')
const { checkNodeVersion } = require('./lib/utils')
const parseArgv = require('./lib/parseArgv')

checkNodeVersion('../package.json')

const argv = parseArgv(options)
const appName = argv._[0]

if (typeof appName === 'undefined') {
  // start with new line
  console.log()

  console.error('Please specify the project directory:')
  console.log(
    `  ${chalk.cyan('mara create')} ${chalk.green('<app-directory>')}`
  )
  console.log()
  console.log('For example:')
  console.log(`  ${chalk.cyan('mara create')} ${chalk.green('my-app')}`)
  console.log()
  console.log(
    `Run ${chalk.cyan(`${'mara create'} --help`)} to see all options.`
  )

  process.exit(1)
}

// mock positional arguments
argv.appDirectory = argv['app-directory'] = appName

create(argv)
