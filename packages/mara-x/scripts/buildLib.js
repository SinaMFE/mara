'use strict'

// 确保在文件首部设置环境变量
process.env.BABEL_ENV = 'production'
process.env.NODE_ENV = 'production'

process.on('unhandledRejection', err => {
  throw err
})

const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')
const ora = require('ora')
const glob = require('glob')
const webpack = require('webpack')
const { getViews } = require('../lib/utils')
const config = require('../config')
const { GLOB } = require('../config/const')
const getContext = require('../config/context')
const paths = config.paths
const getWebpackProdConf = require('../webpack/webpack.prod.conf')
const getWebpackLibConf = require('../webpack/webpack.lib.conf')
const formatWebpackMessages = require('react-dev-utils/formatWebpackMessages')
const printBuildError = require('../lib/printBuildError')
const skeleton = require('../lib/skeleton')
const {
  getLastBuildSize,
  printBuildResult,
  getBuildSizeOfFileMap
} = require('../lib/buildReporter')
const prehandleConfig = require('../lib/prehandleConfig')
const { Stopwatch } = require('@mara/devkit')
let shouldBuildDemos = false

const spinner = ora()

const libs = [
  {
    format: 'commonjs2',
    mode: 'production',
    filename: 'index.cjs.js'
  },
  {
    format: 'umd',
    mode: 'production',
    filename: 'index.min.js',
    minify: true
  },
  {
    format: 'umd',
    mode: 'production',
    filename: 'index.js'
  }
]

async function build(options) {
  // @TODO 多配置应用 prehandleConfig
  // const webpackConfig = prehandleConfig('lib', webpackConfig);
  const ticker = new Stopwatch()
  const demos = shouldBuildDemos ? getViews(config.paths.entryGlob) : []

  const baseCtx = await getContext({
    version: require(config.paths.packageJson).version
  })

  const webpackConfs = libs.concat(demos).map(target => {
    return typeof target === 'object'
      ? getWebpackLibConf(target, { ...baseCtx, entry: '__LIB__' })
      : getWebpackProdConf({ ...baseCtx, entry: target })
  })
  const compiler = webpack(webpackConfs)

  return new Promise((resolve, reject) => {
    ticker.start()
    compiler.run((err, stats) => {
      const buildTime = ticker.check()
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

      const tinifyOriginSizes = getBuildSizeOfFileMap(compiler._tinifySourceMap)
      options.preBuildSize.sizes = Object.assign(
        options.preBuildSize.sizes,
        tinifyOriginSizes
      )

      return resolve({
        stats,
        options,
        buildTime,
        demos,
        warnings: messages.warnings
      })
    })
  })
}

function clean(options) {
  const distArr = [options.libDir]

  if (shouldBuildDemos) distArr.push(options.distDir)

  return Promise.all(distArr.map(dir => fs.emptyDir(dir))).then(() => options)
}

function success({ warnings, buildTime, stats, demos, options }) {
  if (warnings.length) {
    console.log(chalk.yellow('Compiled with warnings:\n'))
    console.log(warnings.join('\n\n'))
  }

  if (buildTime < 1000) {
    buildTime += 'ms'
  } else {
    buildTime = buildTime / 1000 + 's'
  }

  console.log(chalk.green(`Compiled successfully in ${buildTime}\n`))
  console.log('File sizes after gzip:\n')

  const { children } = stats.toJson({
    hash: false,
    chunks: false,
    modules: false,
    chunkModules: false
  })
  const compAssets = {
    lib: children.slice(0, libs.length),
    demos: children.slice(libs.length)
  }

  compAssets.lib = compAssets.lib.map((stats, i) => {
    return stats.assets.map(a => {
      a['__dist'] = paths.lib
      a['__format'] = libs[i].format
      return a
    })
  })

  compAssets.demos = compAssets.demos.map((stats, i) => {
    // 拼接完整路径
    stats.assets['__dist'] = path.join(paths.dist, demos[i])
    return stats.assets
  })

  printBuildResult(compAssets, options.preBuildSize)

  console.log()
  console.log(`The ${chalk.cyan('lib')} folder is ready to be published.\n`)
}

function error(err) {
  spinner.stop()

  console.log(chalk.red('Failed to compile.\n'))
  printBuildError(err)
  process.exit(1)
}

async function setup(distDir, libDir) {
  if (!glob.sync(GLOB.LIB_ENTRY).length) {
    console.log(chalk.red('请按如下结构创建入口文件'))
    console.log(skeleton.library, '\n')
    process.exit(0)
  }

  spinner.start(
    shouldBuildDemos
      ? 'Building library & demos...'
      : 'Building library (commonjs + umd)...'
  )

  const preBuildSize = await getLastBuildSize(libDir)

  return {
    distDir,
    preBuildSize,
    libDir
  }
}

module.exports = args => {
  shouldBuildDemos = args.all

  return setup(paths.dist, paths.lib)
    .then(clean)
    .then(build)
    .then(success)
    .catch(error)
}
