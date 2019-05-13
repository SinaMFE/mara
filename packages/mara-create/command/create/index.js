'use strict'

const os = require('os')
const chalk = require('chalk')
const fs = require('fs-extra')
const path = require('path')
const prompts = require('prompts')
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

function upperCaseFirstLetter(str) {
  const toUpperCase = s => s.toUpperCase()
  return str.replace(/^[a-z]/, toUpperCase)
}

async function setBaseDependencies(preset, packageJson, useTs) {
  if (!preset) return ''

  try {
    // choose app preset
    const mainDep = await getNpmLatestVersion(preset)

    if (preset === 'vue') {
      // vue-template-compiler 与 vue 版本号同步
      packageJson.devDependencies['vue-template-compiler'] = `^${mainDep.vue}`

      if (useTs) {
        const tsDep = await getNpmLatestVersion([
          'vue-class-component',
          'vue-property-decorator'
        ])

        packageJson.dependencies['vue-class-component'] = `^${
          tsDep['vue-class-component']
        }`
        packageJson.dependencies['vue-property-decorator'] = `^${
          tsDep['vue-property-decorator']
        }`
      }
    } else if (preset === 'react') {
      // react-dom 与 react 版本号同步
      packageJson.dependencies['react-dom'] = `^${mainDep.react}`
    }

    packageJson.dependencies[preset] = `^${mainDep[preset]}`

    return upperCaseFirstLetter(preset)
  } catch (e) {
    if (e.response && e.response.status == '404') {
      console.log(`Not fond ${preset}\n`)
    } else {
      console.log('网络异常')
    }

    process.exit(1)
  }
}

module.exports = async function(options) {
  const { appDirectory, useNpm, ts = true, preset, template } = options
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
    const { yes } = await prompts({
      name: 'yes',
      type: 'confirm',
      message: chalk.bold('Do you want to overwrite them?'),
      initial: true
    })

    if (!yes) return

    console.log(`\nRemoving ${chalk.cyan(root)}...`)
    await fs.remove(root)
  }

  // 创建项目目录
  fs.ensureDirSync(appDirectory)

  // @TODO 处理组件 package.json
  const packageJson = {
    // 默认以文件夹名作为 name
    name: appName,
    version: '0.1.0',
    private: true,
    dependencies: {},
    devDependencies: {}
  }

  const depBadge = await setBaseDependencies(preset, packageJson, ts)
  const tsBadge = ts ? 'Typescript' : ''
  const badge = [depBadge, tsBadge].filter(Boolean).join(' + ')

  console.log(
    `Creating ${badge ? `${chalk.green(badge)} ` : ''}project in ${chalk.cyan(
      root
    )}.`
  )
  console.log()

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
    preset,
    usePnp,
    useTs: ts,
    originalDirectory,
    template
  })
}
