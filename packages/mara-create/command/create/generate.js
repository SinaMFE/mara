const chalk = require('chalk')
const fs = require('fs-extra')
const path = require('path')
const install = require('./install')
const {
  getPackageName,
  checkNodeVersion,
  setCaretRangeForRuntimeDeps,
  checkIfOnline,
  executeNodeScript
} = require('../../lib/utils')

function cleanUp(root, appName) {
  // On 'exit' we will delete these files from target directory.
  const knownGeneratedFiles = ['package.json', 'yarn.lock', 'node_modules']
  const currentFiles = fs.readdirSync(path.join(root))

  currentFiles.forEach(file => {
    knownGeneratedFiles.forEach(fileToMatch => {
      // This remove all of knownGeneratedFiles.
      if (file === fileToMatch) {
        console.log(`Deleting generated file... ${chalk.cyan(file)}`)
        fs.removeSync(path.join(root, file))
      }
    })
  })

  const remainingFiles = fs.readdirSync(path.join(root))

  if (!remainingFiles.length) {
    // Delete target folder if empty
    console.log(
      `Deleting ${chalk.cyan(`${appName}/`)} from ${chalk.cyan(
        path.resolve(root, '..')
      )}`
    )
    process.chdir(path.resolve(root, '..'))
    fs.removeSync(path.join(root))
  }
}

module.exports = function(
  root,
  appName,
  useYarn,
  usePnp,
  useTypescript,
  template
) {
  const originalDirectory = process.cwd()
  const allDependencies = ['vue', 'vue-template-compiler', '@mara/x']

  if (useTypescript) {
    // TODO: get user's node version instead of installing latest
    allDependencies.push('@types/node', '@types/jest', 'typescript')
  }

  console.log('Installing packages. This might take a couple of minutes.')

  getPackageName('@mara/x')
    .then(packageName =>
      checkIfOnline(useYarn).then(isOnline => ({
        isOnline,
        packageName
      }))
    )
    .then(info => {
      const { isOnline, packageName } = info

      console.log(
        `Installing ${chalk.cyan('vue')}, ${chalk.cyan(
          'vue-template-compiler'
        )}, and ${chalk.cyan(packageName)}...`
      )
      console.log()

      return install(root, useYarn, usePnp, allDependencies, isOnline).then(
        () => packageName
      )
    })
    .then(async packageName => {
      const packageJsonPath = path.resolve(
        process.cwd(),
        'node_modules',
        packageName,
        'package.json'
      )

      checkNodeVersion(packageJsonPath)
      setCaretRangeForRuntimeDeps(packageName)

      const pnpPath = path.resolve(process.cwd(), '.pnp.js')
      const nodeArgs = fs.existsSync(pnpPath) ? ['--require', pnpPath] : []

      await executeNodeScript(
        {
          cwd: process.cwd(),
          args: nodeArgs
        },
        [root, appName, originalDirectory, template],
        `
        var init = require('${packageName}/templates/init.js');
        init.apply(null, JSON.parse(process.argv[1]));
      `
      )
    })
    .catch(reason => {
      console.log()
      console.log('Aborting installation.')

      if (reason.command) {
        console.log(`  ${chalk.cyan(reason.command)} has failed.`)
      } else {
        console.log(chalk.red('Unexpected error. Please report it as a bug:'))
        console.log(reason)
      }
      console.log()

      cleanUp(root, appName)

      console.log('Done.')
      process.exit(1)
    })
}
