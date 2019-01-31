'use strict'

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
  throw err
})

const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')
const execSync = require('child_process').execSync
const execa = require('execa')
const os = require('os')
const { sortObject } = require('../libs/utils')
// const verifyTypeScriptSetup = require('./utils/verifyTypeScriptSetup')

const TMPL_VUE = 'project-vue'
const TMPL_REACT = 'project-react'
const TMPL_GENERAL = 'project-general'
const BASE_DIR = 'base'
const JS_DIR = 'js'
const TS_DIR = 'ts'

function isInGitRepository() {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' })
    return true
  } catch (e) {
    return false
  }
}

function tryGitInit(appPath) {
  let didInit = false

  try {
    execSync('git --version', { stdio: 'ignore' })

    if (isInGitRepository()) return false

    execSync('git init', { stdio: 'ignore' })
    didInit = true

    execSync('git add -A', { stdio: 'ignore' })
    execSync('git commit -m "Initial commit from Create React App"', {
      stdio: 'ignore'
    })

    return true
  } catch (e) {
    if (didInit) {
      // If we successfully initialized but couldn't commit,
      // maybe the commit author config is not set.
      // In the future, we might supply our own committer
      // like Ember CLI does, but for now, let's just
      // remove the Git files to avoid a half-done state.
      try {
        // unlinkSync() doesn't work on directories.
        fs.removeSync(path.join(appPath, '.git'))
      } catch (removeErr) {
        // Ignore.
      }
    }

    return false
  }
}

// Display the most elegant way to cd.
function getCdPath(appName, appPath, originalDirectory) {
  return path.join(originalDirectory, appName) === appPath ? appName : appPath
}

function resetGitignore(appPath) {
  // Rename gitignore after the fact to prevent npm from renaming it to .npmignore
  // See: https://github.com/npm/npm/issues/1862
  try {
    fs.moveSync(
      path.join(appPath, 'gitignore'),
      path.join(appPath, '.gitignore'),
      []
    )
  } catch (err) {
    // Append if there's already a `.gitignore` file there
    if (err.code === 'EEXIST') {
      const data = fs.readFileSync(path.join(appPath, 'gitignore'))

      fs.appendFileSync(path.join(appPath, '.gitignore'), data)
      fs.unlinkSync(path.join(appPath, 'gitignore'))
    } else {
      throw err
    }
  }
}

function copyRootFiles(tmplPath, appPath, filterFn = () => true) {
  fs.copySync(tmplPath, appPath, { filter: filterFn })
  resetGitignore(appPath)
}

function sortPackageJsonField(pkg) {
  // ensure package.json keys has readable order
  pkg.dependencies = sortObject(pkg.dependencies)
  pkg.devDependencies = sortObject(pkg.devDependencies)
  pkg.scripts = sortObject(pkg.scripts, [
    'serve',
    'build',
    'test',
    'e2e',
    'lint',
    'deploy'
  ])
  pkg = sortObject(pkg, [
    'name',
    'version',
    'private',
    'description',
    'author',
    'scripts',
    'dependencies',
    'devDependencies',
    'vue',
    'babel',
    'eslintConfig',
    'prettier',
    'postcss',
    'browserslist',
    'jest'
  ])

  return pkg
}

function getTmplName(type, depName) {
  const isComp = type === 'component'

  switch (depName) {
    case 'react':
      return TMPL_REACT
    case 'vue':
      return TMPL_VUE
    default:
      return isComp ? 'component' : TMPL_GENERAL
  }
}

function copyFiles(src, dest, pathname = '') {
  fs.copySync(path.join(src, pathname), dest)
}

// merge root-files <- project-<dep>/base <- project-<dep>/<js|ts>
function fillProjectContent({ tmplType, preset, useTs, ownPath, appPath }) {
  const templateName = getTmplName(tmplType, preset)
  const templatePath = path.join(ownPath, 'templates', templateName)
  const rootConfigPath = path.join(ownPath, 'templates/root-files')
  const copyProjectFiles = copyFiles.bind(null, templatePath, appPath)

  // @TODO project or component

  if (!fs.existsSync(templatePath)) {
    throw new Error(
      `Could not locate supplied template: ${chalk.green(templatePath)}`
    )
  }

  // 通用共享资源
  copyRootFiles(
    rootConfigPath,
    appPath,
    src => (useTs ? true : !src.includes('tsconfig.json'))
  )

  // 项目共享资源
  copyProjectFiles(BASE_DIR)

  // 项目特定资源
  copyProjectFiles(useTs ? TS_DIR : JS_DIR)
}

function getGitUserInfo() {
  try {
    const { stdout: name } = execa.sync('git', ['config', 'user.name'])
    const { stdout: email } = execa.sync('git', ['config', 'user.email'])

    return `${name} <${email}>`
  } catch (e) {
    return ''
  }
}

module.exports = function({
  appPath,
  appName,
  preset,
  useTs,
  originalDirectory,
  tmplType
}) {
  const ownPath = path.dirname(
    require.resolve(path.join(__dirname, '..', 'package.json'))
  )
  let appPackage = require(path.join(appPath, 'package.json'))
  const useYarn = fs.existsSync(path.join(appPath, 'yarn.lock'))

  // Copy over some of the devDependencies
  appPackage.dependencies = appPackage.dependencies || {}

  // Setup the script rules
  appPackage.scripts = {
    dev: 'marax dev',
    build: 'marax build',
    test: 'marax test'
  }

  // Setup the eslint config
  appPackage.eslintConfig = {
    extends: 'eslint-config-sinamfe'
  }

  appPackage.author = getGitUserInfo()

  appPackage = sortPackageJsonField(appPackage)

  // 补充 package.json 杂项
  fs.writeFileSync(
    path.join(appPath, 'package.json'),
    JSON.stringify(appPackage, null, 2) + os.EOL
  )

  const readmeExists = fs.existsSync(path.join(appPath, 'README.md'))

  if (readmeExists) {
    fs.renameSync(
      path.join(appPath, 'README.md'),
      path.join(appPath, 'README.old.md')
    )
  }

  fillProjectContent({
    tmplType: 'project',
    useTs,
    preset,
    ownPath,
    appPath
  })

  // if (useTs) {
  //   verifyTypeScriptSetup()
  // }

  if (tryGitInit(appPath)) {
    console.log()
    console.log('Initialized a git repository.')
  }

  // Change displayed command to yarn instead of yarnpkg
  const runScript = useYarn ? 'yarn' : 'npm run'

  console.log()
  console.log(`Successfully created project ${chalk.green(appName)}.`)
  console.log('Inside that directory, you can run several commands:\n')

  console.log(chalk.cyan(`  ${runScript} dev`))
  console.log('    Starts the development server.\n')

  console.log(chalk.cyan(`  ${runScript} build`))
  console.log('    Bundles the app into static files for production.\n')

  console.log(chalk.cyan(`  ${runScript} test`))
  console.log('    Starts the test runner.\n')

  console.log('Get started with the following commands:\n')

  console.log(
    chalk.cyan('  cd'),
    chalk.green(getCdPath(appName, appPath, originalDirectory))
  )
  console.log(`  ${chalk.cyan(`${runScript} dev`)}\n`)

  if (readmeExists) {
    console.log(
      chalk.yellow(
        'You had a `README.md` file, we renamed it to `README.old.md`\n'
      )
    )
  }

  console.log('Happy hacking!')
}
