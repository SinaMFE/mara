const chalk = require('chalk')
const execa = require('execa')
const readline = require('readline')

function toStartOfLine(stream) {
  if (!chalk.supportsColor) {
    stream.write('\r')
    return
  }
  readline.cursorTo(stream, 0)
}

function renderProgressBar(curr, total) {
  const ratio = Math.min(Math.max(curr / total, 0), 1)
  const bar = ` ${curr}/${total}`
  const availableSpace = Math.max(0, process.stderr.columns - bar.length - 3)
  const width = Math.min(total, availableSpace)
  const completeLength = Math.round(width * ratio)
  const complete = `#`.repeat(completeLength)
  const incomplete = `-`.repeat(width - completeLength)
  toStartOfLine(process.stderr)
  process.stderr.write(`[${complete}${incomplete}]${bar}`)
}

module.exports = async function({
  targetDir,
  useYarn,
  usePnp,
  packages = [],
  saveDev,
  isOnline
}) {
  let command, args

  if (useYarn) {
    command = 'yarnpkg'
    args = packages.length ? ['add', ...packages] : []

    if (!isOnline) {
      args.push('--offline')
    }

    if (usePnp) {
      args.push('--enable-pnp')
    }

    // Explicitly set cwd() to work around issues like
    // https://github.com/facebook/create-react-app/issues/3326.
    // Unfortunately we can only do this for Yarn because npm support for
    // equivalent --prefix flag doesn't help with this issue.
    // This is why for npm, we run checkThatNpmCanReadCwd() early instead.
    args.push('--cwd')
    args.push(targetDir)

    if (!isOnline) {
      console.log(chalk.yellow('You appear to be offline.'))
      console.log(chalk.yellow('Falling back to the local Yarn cache.'))
      console.log()
    }
  } else {
    command = 'npm'
    args = ['install', '--loglevel', 'error'].concat(packages)

    if (usePnp) {
      console.log(chalk.yellow(`Npm doesn't support PnP.`))
      console.log(chalk.yellow('Falling back to the regular installs.'))
      console.log()
    }
  }

  if (saveDev) {
    args.push('-D')
  }

  return new Promise((resolve, reject) => {
    const child = execa(command, args, {
      stdio: ['inherit', 'inherit', command === 'yarnpkg' ? 'pipe' : 'inherit']
    })

    // filter out unwanted yarn output
    if (command === 'yarnpkg') {
      child.stderr.on('data', buf => {
        const str = buf.toString()
        if (/warning/.test(str)) {
          return
        }

        // progress bar
        const progressBarMatch = str.match(/\[.*\] (\d+)\/(\d+)/)
        if (progressBarMatch) {
          // since yarn is in a child process, it's unable to get the width of
          // the terminal. reimplement the progress bar ourselves!
          renderProgressBar(progressBarMatch[1], progressBarMatch[2])
          return
        }

        process.stderr.write(buf)
      })
    }

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
