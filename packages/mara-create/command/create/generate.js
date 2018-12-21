const chalk = require('chalk')
const fs = require('fs-extra')
const path = require('path')
const install = require('./install')
const { checkIfOnline, executeNodeScript } = require('../../lib/utils')

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

function checkInstallResult() {
  const packagePath = path.join(process.cwd(), 'package.json')
  const packageJson = require(packagePath)
  const { devDependencies } = packageJson

  if (!devDependencies['@mara/x']) {
    console.error(chalk.red(`Unable to find @mara/x in package.json`))
    process.exit(1)
  }
}

module.exports = async function({
  root,
  appName,
  useYarn,
  usePnp,
  useTs,
  originalDirectory,
  template
}) {
  // const marax = '@mara/x'
  const marax = 'file:/Users/fish/github_pro/marauder/packages/mara-x'
  const dependencies = [marax]

  if (useTs) {
    // TODO: @types/node get user's node version instead of installing latest
    dependencies.push('@types/node', '@types/jest')
  }

  console.log('Installing packages. This might take a couple of minutes.\n')

  try {
    const isOnline = await checkIfOnline(useYarn)

    await install({
      targetDir: root,
      useYarn,
      usePnp,
      saveDev: true,
      dependencies,
      isOnline
    })

    checkInstallResult()

    const pnpPath = path.resolve(process.cwd(), '.pnp.js')
    const nodeArgs = fs.existsSync(pnpPath) ? ['--require', pnpPath] : []

    await executeNodeScript(
      {
        cwd: process.cwd(),
        args: nodeArgs
      },
      [root, appName, originalDirectory, template],
      `
        var generator = require('@mara/x/templates/generator.js');
        generator.apply(null, JSON.parse(process.argv[1]));
      `
    )
  } catch (reason) {
    console.log()
    console.log('Aborting installation.')

    if (reason.command) {
      console.log(`  ${chalk.cyan(reason.command)} has failed.`)
    } else {
      console.log(chalk.red('Unexpected error. Please report it as a bug:'))
      console.log(reason)
    }
    console.log()

    // 回滚
    cleanUp(root, appName)

    console.log('Done.')
    process.exit(1)
  }
}
