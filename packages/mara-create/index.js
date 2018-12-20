const mri = require('mri')
const chalk = require('chalk')
const create = require('./command/create')
const options = require('./command/options')
const { checkNodeVersion } = require('./lib/utils')

checkNodeVersion('../package.json')

const mriOpt = {
  alias: [],
  boolean: [],
  string: [],
  default: {}
}

for (let key in options) {
  const oopt = options[key]

  if (oopt['alias']) {
    mriOpt.alias.push(key)
  }

  if (oopt['type'] == 'boolean') {
    mriOpt.boolean.push(key)
  } else if (oopt['type'] == 'string') {
    mriOpt.string.push(key)
  }

  if (oopt['alias']) {
    mriOpt.alias[key] = oopt['alias']
  }

  // default 可能为布尔值，因此使用属性存在判断
  if ('default' in oopt) {
    mriOpt.default[key] = oopt['default']
  }
}

const argv = mri(process.argv.slice(2), mriOpt)
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
argv.appName = argv['app-name'] = appName

create(argv)
