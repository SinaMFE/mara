'use strict'

// 确保在文件首部设置环境变量
process.env.BABEL_ENV = 'production'
process.env.NODE_ENV = 'production'

process.on('unhandledRejection', err => {
  throw err
})

const chalk = require('chalk')
const config = require('../config')
const { isObject, isNotEmptyArray } = require('../lib/utils')
const paths = config.paths
const vendorConf = config.vendor || []

// 在 webpack.dll.conf 引入之前优先执行异常检查
if (!Object.keys(vendorConf).length) {
  console.log(
    chalk.yellow(
      'Build skip, vendor options is empty. Please check marauder.config.js'
    )
  )
  process.exit(0)
} else if (isObject(vendorConf) && !isNotEmptyArray(vendorConf.libs)) {
  console.log(
    chalk.yellow(
      'Build skip, vendor.libs is empty. Please check marauder.config.js'
    )
  )
  process.exit(0)
}

const fs = require('fs-extra')
const ora = require('ora')
const webpack = require('webpack')
const formatWebpackMessages = require('react-dev-utils/formatWebpackMessages')
const printBuildError = require('../lib/printBuildError')
const prehandleConfig = require('../lib/prehandleConfig')
const input = config.argv._
let webpackDllConfig = require('../webpack/webpack.dll.conf')()
const SpeedMeasurePlugin = require('speed-measure-webpack-plugin')
const smp = new SpeedMeasurePlugin({
  disable: !process.env.MEASURE
})

const spinner = ora('Building dll...')
spinner.start()

function build() {
  webpackDllConfig = prehandleConfig({ command: 'dll', webpackDllConfig })
  webpackDllConfig = smp.wrap(webpackDllConfig)
  const compiler = webpack(webpackDllConfig)

  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      spinner.stop()

      if (err) return reject(err)

      const messages = formatWebpackMessages(stats.toJson({}, true))
      if (messages.errors.length) {
        // Only keep the first error. Others are often indicative
        // of the same problem, but confuse the reader with noise.
        if (messages.errors.length > 1) {
          messages.errors.length = 1
        }
        return reject(new Error(messages.errors.join('\n\n')))
      }

      return resolve({
        stats,
        warnings: messages.warnings
      })
    })
  })
}

// 清空 dll 文件夹
fs.emptyDirSync(paths.dll)

// 为多页面准备，生成 xxx_vender 文件夹
const namespace = vendorConf.name ? `${vendorConf.name}_` : ''
const vendorDir = namespace + 'vendor'

// 清空 vendor 文件
fs.emptyDirSync(`${paths.dist}/${vendorDir}`)

function ftp() {
  if (!config.build.uploadFtp) return

  const { name: projectName } = require(config.paths.packageJson)

  require('../lib/ftp').uploadDir({
    project: projectName,
    view: vendorDir,
    namespace: input[0]
  })
}

function errorLog(err) {
  spinner.stop()

  console.log(chalk.red('Failed to compile.\n'))
  printBuildError(err)
  process.exit(1)
}

module.exports = function runDll() {
  return build()
    .then(output => {
      // webpack 打包结果统计
      process.stdout.write(
        output.stats.toString({
          colors: true,
          modules: false,
          children: false,
          chunks: false,
          chunkModules: false
        }) + '\n\n'
      )

      console.log(chalk.green('  DLL Build complete.\n'))
      console.log(
        chalk.yellow(
          '  Vender bundle has been generated, please rebuild your app:\n'
        )
      )
      console.log(chalk.cyan('  $ yarn build <view_name>\n'))
    })
    .then(ftp)
    .catch(errorLog)
}
