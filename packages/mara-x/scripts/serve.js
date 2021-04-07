'use strict'

process.env.BABEL_ENV = 'development'
process.env.NODE_ENV = 'development'

process.on('unhandledRejection', err => {
  if (err.signal == 'SIGINT') return

  throw err
})

const ora = require('ora')
const webpack = require('webpack')
const DevServer = require('webpack-dev-server')
const { getFreePort, localIp } = require('@mara/devkit')
const config = require('../config')
const getContext = require('../config/getContext')
const { getBuildEntry } = require('../lib/entry')
const getWebpackConfig = require('../webpack/webpack.dev.conf')
const createDevServerConfig = require('../webpack/webpack.devServer.conf')
const prehandleConfig = require('../lib/prehandleConfig')
const DevServerPlugin = require('../lib/DevServerPlugin')
const DEFAULT_PORT = parseInt(process.env.PORT, 10) || config.devServer.port
const PROTOCOL = config.devServer.https === true ? 'https' : 'http'
const spinner = ora('Starting development server...')
const SpeedMeasurePlugin = require('speed-measure-webpack-plugin')
const smp = new SpeedMeasurePlugin({
  disable: !process.env.MEASURE
})

function getDevCompiler(entry, webpackConf) {
  const confEntry = webpackConf.entry
  const devClient = require.resolve('react-dev-utils/webpackHotDevClient')

  if (typeof confEntry === 'object' && !Array.isArray(confEntry)) {
    confEntry[entry] = [devClient].concat(confEntry[entry])
  } else if (typeof confEntry === 'function') {
    webpackConf.entry = confEntry(devClient)
  } else {
    webpackConf.entry = [devClient].concat(confEntry)
  }

  return webpack(webpackConf)
}

function createDevServer(webpackConf, opts) {
  const host = localIp()
  const proxyConfig = config.devServer.proxy
  const serverConf = createDevServerConfig({
    entry: opts.entry,
    host: host,
    proxy: proxyConfig,
    protocol: PROTOCOL,
    publicPath: opts.publicPath
  })
  const compiler = getDevCompiler(opts.entry, webpackConf)
  let devServer

  // 确保在 new DevServer 前执行
  // 避免错过事件钩子
  new DevServerPlugin({
    port: opts.port,
    entry: opts.entry,
    useYarn: config.useYarn,
    spinner,
    protocol: PROTOCOL,
    root: config.paths.root,
    noTsTypeError: config.compiler.noTsTypeError,
    host: host,
    clearConsole: true,
    openBrowser: config.devServer.open,
    useTypeScript: config.useTypeScript,
    onTsCheckEnd(severity, messages) {
      devServer.sockWrite(devServer.sockets, severity, messages)
    }
  }).apply(compiler)

  devServer = new DevServer(compiler, serverConf)

  return devServer
}

async function setup(entryInput) {
  const context = await getContext({
    version: require(config.paths.packageJson).version,
    view: entryInput.entry,
    views: entryInput.views
  })

  return { context, ...entryInput }
}

async function server({ context, entry }) {
  spinner.start()

  let webpackConfig = getWebpackConfig(context, spinner)

  webpackConfig = prehandleConfig({
    command: 'dev',
    webpackConfig,
    entry: entry
  })

  webpackConfig = smp.wrap(webpackConfig)

  const port = await getFreePort(DEFAULT_PORT)
  const devServer = createDevServer(webpackConfig, {
    entry,
    port,
    publicPath: context.publicPath
  })

  // Ctrl + C 触发
  ;['SIGINT', 'SIGTERM'].forEach(sig => {
    process.on(sig, () => {
      spinner.stop()

      devServer.close(() => {
        process.exit(0)
      })
    })
  })

  // 指定 listen host 0.0.0.0 允许来自 ip 或 localhost 的访问
  return devServer.listen(port, '0.0.0.0', err => {
    if (err) return console.log(err)
  })
}

module.exports = function runServe(argv) {
  return getBuildEntry(argv)
    .then(setup)
    .then(server)
}
