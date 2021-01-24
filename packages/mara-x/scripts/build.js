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
const { getBuildEntry } = require('../lib/entry')
const updateNotifier = require('../lib/updateNotifier')
const { bumpProjectVersion, isInstalled } = require('../lib/utils')
const { cliBadge } = require('@mara/devkit')
const config = require('../config')
const getBuildContext = require('../config/context')
const { TARGET, DEPLOY_ENV } = require('../config/const')
const paths = config.paths
const getWebpackConfig = require('../webpack/webpack.prod.conf')
const formatWebpackMessages = require('react-dev-utils/formatWebpackMessages')
const { hybridDevPublish, testDeploy } = require('../lib/hybrid')
const printBuildError = require('../lib/printBuildError')
const {
  getLastBuildSize,
  printBuildAssets,
  getBuildSizeOfFileMap
} = require('../lib/buildReporter')
const prehandleConfig = require('../lib/prehandleConfig')
const zip = require('../lib/zip')
const isHybridMode = config.isHybridMode
const useCommonPkg = config.useCommonPkg

const { name: pkgJsonName, version: latestVersion } = require(config.paths
  .packageJson)
// hybrid 模式下 ftp 发布将自动更新 package version
// 此变量记录更新后的版本号
let currentVersion = latestVersion

// These sizes are pretty large. We'll warn for bundles exceeding them.
const WARN_AFTER_BUNDLE_GZIP_SIZE = 512 * 1024
const WARN_AFTER_CHUNK_GZIP_SIZE = 1024 * 1024

const spinner = ora('Building for production...')

// entryInput: {entry, ftpBranch, entryArgs}
async function createContext(entryInput) {
  const isHybridPublish =
    config.ftp.hybridPublish && entryInput.ftpBranch !== null
  const enableAutoVersion = config.ftp.hybridAutoVersion
  const isWorkspaceDeploy =
    config.workspace && entryInput.entryArgs.test != undefined
  const shouldBumpVersion =
    isWorkspaceDeploy || (enableAutoVersion && isHybridMode && isHybridPublish)

  // hybrid dev 发布模式下版本号自动递增
  if (shouldBumpVersion) {
    // e.g. v1.2.3-1
    const { stdout } = bumpProjectVersion(
      isWorkspaceDeploy ? 'patch' : 'prerelease'
    )

    // 记录最新版本
    currentVersion = stdout.replace(/^v/, '')
  }

  return getBuildContext({
    version: currentVersion,
    view: entryInput.entry,
    project: entryInput.workspace
  })

  // return { context, ...entryInput }
}

async function clean(dist) {
  if (useCommonPkg) {
    fs.remove(dist + '.lite')
  }

  return fs.emptyDir(dist)
}

function build(context) {
  let webpackConfig = getWebpackConfig(context, spinner)

  webpackConfig = prehandleConfig({
    command: 'build',
    webpackConfig,
    entry: context.entry
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

      return resolve({
        stats,
        sizes: tinifyOriginSizes,
        publicPath: webpackConfig.output.publicPath,
        outputPath: webpackConfig.output.path,
        warnings: messages.warnings
      })
    })
  })
}

function printResult(
  { stats, sizes, publicPath, outputPath, warnings },
  context,
  preBuildSize
) {
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
  preBuildSize.sizes = Object.assign({}, preBuildSize.sizes, sizes)

  printBuildAssets(
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
      'dist/' + context.entry
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
}

async function ftpUpload(entryInput, context) {
  if (entryInput.ftpBranch === null) return ''

  const workspace = entryInput.workspace
  const remotePath = await require('../lib/ftp').uploadDir({
    // workspace 模式下取工作区文件夹
    project: workspace || pkgJsonName,
    version: context.version,
    view: entryInput.entry,
    namespace: entryInput.ftpBranch,
    target: config.target
  })

  return remotePath
}

async function deploy({ entry, workspace, entryArgs }, remotePath) {
  const target = config.target
  const version = currentVersion

  // hybrid deplpy 需提供 hybrid 配置
  // 并且为 app 模式
  if (isHybridMode && config.ftp.hybridPublish && remotePath) {
    await hybridDevPublish({
      entry,
      remotePath,
      project: workspace,
      version,
      target,
      entryArgs
    })
  } else if (entryArgs.test !== null) {
    await testDeploy({
      entry,
      version,
      project: workspace,
      target,
      argv: entryArgs
    })
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

function printError(err) {
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

async function loadHook(argv, context) {
  const hookName = argv.hook

  if (hookName && isInstalled(`../hooks/${hookName}`)) {
    const mod = require(`../hooks/${hookName}`)

    console.log(`Execute hook - ${hookName}...\n`)

    if (typeof mod === 'function') await mod(argv, context)
  } else if (hookName !== undefined) {
    console.log(chalk.red('Can not find hook', hookName))
  }
}

async function run(argv) {
  // Make sure to force cancel
  ;['SIGINT', 'SIGTERM'].forEach(sig => {
    process.on(sig, () => {
      process.exit()
    })
  })

  const entryInput = await getBuildEntry(argv)
  const dist = path.join(paths.dist, entryInput.entry)

  // @TODO dev 发布检查脚手架版本
  // if (entryInput.ftpBranch != null) {
  //   if (updateNotifier.hasUpdate) {
  //     process.exit(0)
  //   } else {
  //     updateNotifier({ interval: 1, forceCheck: true })
  //   }
  // }

  spinner.start()

  const context = await createContext(entryInput)
  const preBuildSize = await getLastBuildSize(dist)

  await clean(dist)

  const buildResult = await build(context)

  printResult(buildResult, context, preBuildSize)

  if (useCommonPkg) {
    await buildCommonPkg(dist)
  }

  await loadHook(argv, context)

  const remotePath = await ftpUpload(entryInput, context)
  await deploy(entryInput, remotePath)
}

async function buildCommonPkg(dist) {
  const cDist = dist + '.lite'
  const commonPkgReg = /[\w./-_]+__SINA_COMMON_PKG__\.js/

  fs.copySync(dist, cDist)
  fs.remove(`${cDist}/static/js/__SINA_COMMON_PKG__.js`)
  fs.remove(`${cDist}/${path.basename(dist)}.php`)

  const htmlPath = `${cDist}/index.html`
  const html = fs.readFileSync(htmlPath, 'utf8')
  const repHtml = html.replace(
    commonPkgReg,
    'http://wap_front.dev.sina.cn/marauder/@mfelibs/hybridcontainer/1.1.4/app/index/static/js/index.min.js'
  )

  fs.writeFileSync(htmlPath, repHtml)

  return zip({
    src: cDist,
    filename: path.basename(dist),
    extension: 'php',
    ...config.zipConf
  })
}

module.exports = async function runBuild(argv) {
  try {
    await run(argv).then(done)
  } catch (e) {
    printError(e)
  }
}
