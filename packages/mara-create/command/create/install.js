const chalk = require('chalk')
const execa = require('execa')

module.exports = function(root, useYarn, usePnp, dependencies, isOnline) {
  let command, args

  if (useYarn) {
    command = 'yarnpkg'
    args = ['add']

    if (!isOnline) {
      args.push('--offline')
    }

    if (usePnp) {
      args.push('--enable-pnp')
    }

    ;[].push.apply(args, dependencies)

    // Explicitly set cwd() to work around issues like
    // https://github.com/facebook/create-react-app/issues/3326.
    // Unfortunately we can only do this for Yarn because npm support for
    // equivalent --prefix flag doesn't help with this issue.
    // This is why for npm, we run checkThatNpmCanReadCwd() early instead.
    args.push('--cwd')
    args.push(root)

    if (!isOnline) {
      console.log(chalk.yellow('You appear to be offline.'))
      console.log(chalk.yellow('Falling back to the local Yarn cache.'))
      console.log()
    }
  } else {
    command = 'npm'
    args = ['install', '--save', '--loglevel', 'error'].concat(dependencies)

    if (usePnp) {
      console.log(chalk.yellow(`NPM doesn't support PnP.`))
      console.log(chalk.yellow('Falling back to the regular installs.'))
      console.log()
    }
  }

  return new Promise((resolve, reject) => {
    const child = execa(command, args, { stdio: 'inherit' })

    child.on('close', code => {
      if (code !== 0) {
        return reject({
          command: `${command} ${args.join(' ')}`
        })
      }

      resolve()
    })
  })
}
