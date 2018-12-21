'use strict'

const ora = require('ora')
const os = require('os')
const chalk = require('chalk')
const fs = require('fs-extra')
const path = require('path')
const inquirer = require('inquirer')
const validateProjectName = require('validate-npm-package-name')
const getNpmLatestVersion = require('../../lib/getNpmLatestVersion')
const generate = require('./generate')
const {
  execSync,
  isSafeToCreateProjectIn,
  checkNpmInCmd,
  checkYarnVersion
} = require('../../lib/utils')

function checkAppName(appName) {
  const validationResult = validateProjectName(appName)

  function printValidationResults(results) {
    if (typeof results !== 'undefined') {
      results.forEach(error => {
        console.error(chalk.red(`  *  ${error}`))
      })
    }
  }

  if (!validationResult.validForNewPackages) {
    console.error(
      `Could not create a project called ${chalk.red(
        `"${appName}"`
      )} because of npm naming restrictions:`
    )
    printValidationResults(validationResult.errors)
    printValidationResults(validationResult.warnings)

    process.exit(1)
  }
}

function couldUseYarn() {
  try {
    execSync('yarnpkg --version', { stdio: 'ignore' })
    return true
  } catch (e) {
    return false
  }
}

async function setFramework(framework, packageJson) {
  if (framework === 'none') return

  try {
    // choose app framework
    if (framework === 'vue') {
      const ver = await getNpmLatestVersion('vue')

      packageJson.dependencies['vue'] = `^${ver}`
      packageJson.devDependencies['vue-template-compiler'] = `^${ver}`
    } else if (framework === 'react') {
      const ver = await getNpmLatestVersion('react')

      packageJson.dependencies['react'] = `^${ver}`
      packageJson.dependencies['react-dom'] = `^${ver}`
    } else {
      const ver = await getNpmLatestVersion(framework)

      packageJson.dependencies[framework] = `^${ver}`
    }
  } catch (e) {
    if (e.response && e.response.status == '404') {
      console.log(`Not fond framework ${framework}\n`)
    }
  }
}

module.exports = async function(options) {
  const { appDirectory, useNpm, noTs, framework, template } = options
  let usePnp = options.usePnp
  const root = path.resolve(appDirectory)
  const inCurrent = appDirectory === '.'
  const originalDirectory = process.cwd()
  const appName = path.basename(root)

  checkAppName(appName)

  if (options.force) {
    await fs.remove(appDirectory)
  }

  // 验证项目目录是否可安全初始化
  if (
    fs.existsSync(appDirectory) &&
    !isSafeToCreateProjectIn(root, appDirectory)
  ) {
    const { yes } = await inquirer.prompt([
      {
        name: 'yes',
        type: 'confirm',
        message: `Do you want to overwrite them?`
      }
    ])

    if (!yes) return

    console.log(`\nRemoving ${chalk.cyan(root)}...`)
    await fs.remove(root)
  }

  // 创建项目目录
  fs.ensureDirSync(appDirectory)

  console.log(`Creating project in ${chalk.green(root)}.`)
  console.log()

  // @TODO 处理组件 package.json
  const packageJson = {
    // 默认以文件夹名作为 name
    name: appName,
    version: '0.1.0',
    private: true,
    dependencies: {},
    devDependencies: {}
  }

  await setFramework(framework, packageJson)

  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify(packageJson, null, 2) + os.EOL
  )

  const useYarn = useNpm ? false : couldUseYarn()

  process.chdir(root)

  if (!useYarn && !checkNpmInCmd()) {
    process.exit(1)
  }

  if (useYarn && usePnp) {
    const yarnInfo = checkYarnVersion()

    if (!yarnInfo.hasMinYarnPnp) {
      if (yarnInfo.yarnVersion) {
        chalk.yellow(
          `You are using Yarn ${
            yarnInfo.yarnVersion
          } together with the --use-pnp flag, but Plug'n'Play is only supported starting from the 1.12 release.\n\n` +
            `Please update to Yarn 1.12 or higher for a better, fully supported experience.\n`
        )
      }
      // 1.11 had an issue with webpack-dev-middleware, so better not use PnP with it (never reached stable, but still)
      usePnp = false
    }
  }

  return generate({
    root,
    appName,
    useYarn,
    usePnp,
    useTs: !noTs,
    originalDirectory,
    template
  })
}
