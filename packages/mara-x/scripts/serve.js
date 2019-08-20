'use strict'

process.env.BABEL_ENV = 'development'
process.env.NODE_ENV = 'development'

process.on('unhandledRejection', err => {
  throw err
})

const ora = require('ora')
const webpack = require('webpack')
const { getFreePort, localIp } = require('@mara/devkit')
const config = require('../config')
const getContext = require('../config/context')
const getEntry = require('../lib/entry')
const getWebpackConfig = require('../webpack/webpack.dev.conf')
const createDevServerConfig = require('../webpack/webpack.devServer.conf')
const prehandleConfig = require('../lib/prehandleConfig')
const DevServerPlugin = require('../lib/DevServerPlugin')
const DEFAULT_PORT = parseInt(process.env.PORT, 10) || config.devServer.port
const PROTOCOL = config.devServer.https === true ? 'https' : 'http'
const spinner = ora('Starting development server...')

function getCompiler(webpackConf) {
  const compiler = webpack(webpackConf)

  addDevClientToEntry(webpackConf, [
    // 使用 CRA 提供的 client，展示更友好的错误信息
    require.resolve('../lib/hotDevClient')
  ])

  return compiler
}

function addDevClientToEntry(config, devClient) {
  const { entry } = config

  if (typeof entry === 'object' && !Array.isArray(entry)) {
    Object.keys(entry).forEach(key => {
      entry[key] = devClient.concat(entry[key])
    })
  } else if (typeof entry === 'function') {
    config.entry = entry(devClient)
  } else {
    config.entry = devClient.concat(entry)
  }
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
  const compiler = getCompiler(webpackConf)

  // 确保在 new DevServer 前执行
  // 避免错过事件钩子
  new DevServerPlugin({
    port: opts.port,
    entry: opts.entry,
    useYarn: config.useYarn,
    spinner,
    protocol: PROTOCOL,
    root: config.paths.app,
    host: host,
    openBrowser: config.devServer.open,
    useTypeScript: config.useTypeScript,
    onTsError(severity, errors) {
      devServer.sockWrite(devServer.sockets, `${severity}s`, errors)
    }
  }).apply(compiler)

  const DevServer = require('webpack-dev-server')
  const devServer = new DevServer(compiler, serverConf)

  return devServer
}

async function setup(entryInput) {
  const context = await getContext({
    version: require(config.paths.packageJson).version,
    view: entryInput.entry
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

  const port = await getFreePort(DEFAULT_PORT)
  const devServer = createDevServer(webpackConfig, {
    entry,
    port,
    publicPath: context.publicPath
  })

  // Ctrl + C 触发
  ;['SIGINT', 'SIGTERM'].forEach(sig => {
    process.on(sig, () => {
      devServer.close()
      process.exit()
    })
  })

  // 指定 listen host 0.0.0.0 允许来自 ip 或 localhost 的访问
  return devServer.listen(port, '0.0.0.0', err => {
    if (err) return console.log(err)
  })
}

module.exports = function runServe(argv) {
  return getEntry(argv)
    .then(setup)
    .then(server)
}
