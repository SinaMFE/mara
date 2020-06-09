const path = require('path')
const execa = require('execa')
const config = require('../config')
const getEntry = require('../lib/entry')
const paths = require('../config/paths')
const pkgJson = require(paths.packageJson)

async function run({ command, cwd, entry }) {
  const rawArgv = process.argv.slice(2)
  const options = {
    stdio: 'inherit',
    cwd: cwd,
    env: {
      maraxGlobalConfig: path.resolve('marauder.config.js')
    }
  }
  // const runDev = require('./serve')
  // const runBuild = require('./build')

  if (command == 'dev') {
    const child = execa('npx', ['marax', 'dev', entry, '--workspace'], options)
  } else if (command == 'build') {
    const child = execa(
      'npx',
      ['marax', 'build', entry, ...rawArgv, '--workspace'],
      options
    )
  } else if (command == 'deploy') {
    const child = execa(
      'npx',
      ['marax', 'build', entry, '--test', '--workspace'],
      options
    )
  }
}

module.exports = async function workspace(argv) {
  const workspaces = pkgJson.workspaces

  if (!workspaces) {
    throw new Error(`workspaceRootNotFound`)
  }

  if (argv.length < 1) {
    throw new Error('workspaceMissingWorkspace')
  }

  if (argv.length < 2) {
    throw new Error('workspaceMissingCommand')
  }

  argv.rootWorkspace = true

  // Make sure to force cancel
  ;['SIGINT', 'SIGTERM'].forEach(sig => {
    process.on(sig, () => {
      process.exit()
    })
  })

  const command = argv._[1]
  const { workspace, entry } = await getEntry(argv)
  const cwd = `${process.cwd()}/projects/${workspace}`

  run({ command, cwd, entry })
}
