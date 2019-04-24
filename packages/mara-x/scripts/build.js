'use strict'

// 确保在文件首部设置环境变量
process.env.BABEL_ENV = 'production'
process.env.NODE_ENV = 'production'

process.on('unhandledRejection', err => {
  throw err
})

const fs = require('fs-extra')
const chalk = require('chalk')
const path = require('path')
const ora = require('ora')
const webpack = require('webpack')
const getEntry = require('../libs/entry')
const { bumpProjectVersion } = require('../libs/utils')
const { cliBadge } = require('@mara/devkit')
const config = require('../config')
const getContext = require('../config/context')
const { TARGET, DEPLOY_ENV } = require('../config/const')
const paths = config.paths
const getWebpackConfig = require('../webpack/webpack.prod.conf')
const formatWebpackMessages = require('react-dev-utils/formatWebpackMessages')
const { hybridDevPublish, testDeploy } = require('../libs/hybrid')
const printBuildError = require('../libs/printBuildError')
const {
  getLastBuildSize,
  printBuildResult,
  getBuildSizeOfFileMap
} = require('../libs/buildReporter')
const prehandleConfig = require('../libs/prehandleConfig')
const isHybridMode = config.hybrid && config.target === TARGET.APP

const { name: projectName, version: latestVersion } = require(config.paths
  .packageJson)
// hybrid 模式下 ftp 发布将自动更新 package version
// 此变量记录更新后的版本号
let currentVersion = latestVersion

// These sizes are pretty large. We'll warn for bundles exceeding them.
const WARN_AFTER_BUNDLE_GZIP_SIZE = 512 * 1024
const WARN_AFTER_CHUNK_GZIP_SIZE = 1024 * 1024

const spinner = ora('Building for production...')

// entryInput: {entry, ftpBranch, entryArgs}
async function setup(entryInput) {
  spinner.start()

  const shouldAutoBumpVersion =
    isHybridMode && config.ftp.hybridPublish && entryInput.ftpBranch !== null

  // hybrid dev 发布模式下版本号自动递增
  if (shouldAutoBumpVersion) {
    // e.g. v1.2.3-1
    const { stdout } = bumpProjectVersion('prerelease')

    // 记录最新版本
    currentVersion = stdout.replace(/^v/, '')
  }

  const context = await getContext({
    version: currentVersion,
    view: entryInput.entry
  })

  // Make sure to force cancel
  ;['SIGINT', 'SIGTERM'].forEach(sig => {
    process.on(sig, () => {
      process.exit()
    })
  })

  return { context, ...entryInput }
}

async function clean(options) {
  const dist = path.join(paths.dist, options.entry)
  const preBuildSize = await getLastBuildSize(dist)

  await fs.emptyDir(dist)

  return { options, preBuildSize, dist }
}

function build({ options, preBuildSize, dist }) {
  let webpackConfig = getWebpackConfig(options.context, spinner)

  webpackConfig = prehandleConfig({
    command: 'build',
    webpackConfig,
    entry: options.entry
  })

  const compiler = webpack(webpackConfig)

  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      let messages
      spinner.stop()

      if (err) {
        if (!err.message) return reject(err)

        messages = formatWebpackMessages({
          errors: [err.message],
          warnings: []
        })
      } else {
        messages = formatWebpackMessages(
          stats.toJson({ all: false, warnings: true, errors: true })
        )
      }

      if (messages.errors.length) {
        // Only keep the first error. Others are often indicative
        // of the same problem, but confuse the reader with noise.
        messages.errors.length = 1

        return reject(new Error(messages.errors.join('\n\n')))
      }

      if (
        process.env.CI &&
        (typeof process.env.CI !== 'string' ||
          process.env.CI.toLowerCase() !== 'false') &&
        messages.warnings.length
      ) {
        console.log(
          chalk.yellow(
            '\nTreating warnings as errors because process.env.CI = true.\n' +
              'Most CI servers set it automatically.\n'
          )
        )

        return reject(new Error(messages.warnings.join('\n\n')))
      }

      const tinifyOriginSizes = getBuildSizeOfFileMap(compiler._tinifySourceMap)
      preBuildSize.sizes = Object.assign(preBuildSize.sizes, tinifyOriginSizes)

      return resolve({
        stats,
        options,
        preBuildSize,
        publicPath: webpackConfig.output.publicPath,
        outputPath: webpackConfig.output.path,
        warnings: messages.warnings
      })
    })
  })
}

function success({
  stats,
  options,
  preBuildSize,
  publicPath,
  outputPath,
  warnings
}) {
  const result = stats.toJson({
    hash: false,
    chunks: false,
    modules: false,
    chunkModules: false
  })

  if (warnings.length) {
    console.log(chalk.yellow('Compiled with warnings:\n'))
    console.log(warnings.join('\n\n'))
    // add new line
    console.log()
  }

  let buildTime = result.time

  if (buildTime < 1000) {
    buildTime += 'ms'
  } else {
    buildTime = buildTime / 1000 + 's'
  }

  console.log(chalk.green(`Compiled successfully in ${buildTime}\n`))
  console.log('File sizes after gzip:\n')

  result.assets['__dist'] = outputPath

  printBuildResult(
    // view 为数组
    { view: [result.assets] },
    preBuildSize,
    WARN_AFTER_BUNDLE_GZIP_SIZE,
    WARN_AFTER_CHUNK_GZIP_SIZE
  )

  // just new line
  console.log()
  const targetBadge = cliBadge('target', config.target)
  const envBadge = cliBadge(
    'env',
    config.deployEnv,
    config.deployEnv === DEPLOY_ENV.ONLINE ? 'info' : 'warning'
  )
  console.log(`${targetBadge} ${envBadge}`)

  console.log()
  console.log(
    `The ${chalk.cyan(
      'dist/' + options.entry
    )} folder is ready to be deployed.\n`
  )

  if (publicPath === '/') {
    console.log(
      chalk.yellow(
        `The app is built assuming that it will be deployed at the root of a domain.`
      )
    )
    console.log(
      chalk.yellow(
        `If you intend to deploy it under a subpath, update the ${chalk.green(
          'publicPath'
        )} option in your project config (${chalk.cyan(
          `marauder.config.js`
        )}).\n`
      )
    )
  }

  return options
}

async function ftp(options) {
  if (options.ftpBranch === null) return options

  const remotePath = await require('../libs/ftp').uploadDir({
    project: projectName,
    view: options.entry,
    namespace: options.ftpBranch,
    target: config.target
  })

  return { ...options, remotePath }
}

async function deploy({ entry, entryArgs, remotePath }) {
  // hybrid deplpy 需提供 hybrid 配置
  // 并且为 app 模式
  if (isHybridMode && config.ftp.hybridPublish && remotePath) {
    await hybridDevPublish(entry, remotePath, currentVersion)
  } else if (entryArgs.test !== null) {
    await testDeploy(entry, currentVersion, entryArgs.test)
  }
}

// finally fn
function done() {
  const date = new Date()
  const hour = date.getHours()

  if (config.marax.inspire || hour >= 21) {
    const { inspire } = require('@mara/devkit')
    const quote = inspire.random()

    console.log(chalk.magenta('☕️ ' + quote))
  }
}

function error(err) {
  // 构建中途报错将直接被 error 捕获
  // 这里确保 spinner 被及时关闭
  spinner.stop()

  if (currentVersion !== latestVersion) {
    // 回滚自动设置的版本号
    bumpProjectVersion(latestVersion)
  }

  console.log(chalk.red('\n🕳   Failed to compile.\n'))
  printBuildError(err)
  process.exit(1)
}

module.exports = function runBuild(argv) {
  return getEntry(argv)
    .then(setup)
    .then(clean)
    .then(build)
    .then(success)
    .then(ftp)
    .then(deploy)
    .then(done)
    .catch(error)
}
