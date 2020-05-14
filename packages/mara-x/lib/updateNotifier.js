const chalk = require('chalk')
const pkg = require('../package.json')
const useColor = process.stdout.isTTY && process.env['TERM'] !== 'dumb'

function updateNotifier(options = {}) {
  const notifier = require('update-notifier')({
    pkg,
    shouldNotifyInNpmScript: true,
    updateCheckInterval: options.interval || 1000 * 60 * 60 * 12
  })

  if (notifier.update && notifier.update.latest !== pkg.version) {
    const old = notifier.update.current
    const latest = notifier.update.latest
    let type = notifier.update.type

    updateNotifier.hasUpdate = true

    if (useColor) {
      switch (type) {
        case 'major':
          type = chalk.red(type)
          break
        case 'minor':
          type = chalk.yellow(type)
          break
        case 'patch':
          type = chalk.green(type)
          break
      }
    }

    notifier.notify({
      defer: options.defer === undefined ? true : options.defer,
      message:
        `New ${type} version of ${pkg.name} available! ${
          useColor ? chalk.red(old) : old
        } → ${useColor ? chalk.green(latest) : latest}\n` +
        `Run ${
          useColor
            ? chalk.green(`yarn add -D ${pkg.name}`)
            : `yarn add -D ${pkg.name}`
        } to update!`
    })

    if (options.forceCheck) {
      process.exit(0)
    }
  }
}

module.exports = updateNotifier
