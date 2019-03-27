'use strict'

process.env.BABEL_ENV = 'development'
process.env.NODE_ENV = 'development'

process.on('unhandledRejection', err => {
  throw err
})

const ora = require('ora')
const fs = require('fs-extra')
const webpack = require('webpack')
const config = require('../config')
const getEntry = require('../libs/entry')
const { getFreePort } = require('../libs/utils')
const getWebpackConfig = require('../webpack/webpack.dev.conf')
const createDevServerConfig = require('../webpack/webpack.devServer.conf')
const prehandleConfig = require('../libs/prehandleConfig')
const DevServerPlugin = require('../libs/DevServerPlugin')
const DEFAULT_PORT = parseInt(process.env.PORT, 10) || config.devServer.port
const PROTOCOL = config.devServer.https === true ? 'https' : 'http'
const spinner = ora('Starting development server...')

function getCompiler(webpackConf) {
  const compiler = webpack(webpackConf)

  // 为每一个入口文件添加 webpack-dev-server 客户端
  Object.values(webpackConf.entry).forEach(addHotDevClient)

  return compiler
}

function addHotDevClient(entry) {
  // client 在业务模块之前引入，以捕获初始化错误
  ;[].unshift.apply(entry, [
    // 使用 CRA 提供的 client，展示更友好的错误信息
    require.resolve('react-dev-utils/webpackHotDevClient')
    // 以下为官方 dev server client
    // require.resolve('webpack-dev-server/client') + '?/',
    // require.resolve('webpack/hot/dev-server')
  ])
}

function createDevServer(webpackConf, opts) {
  const DevServer = require('webpack-dev-server')
  const proxyConfig = config.devServer.proxy
  const serverConf = createDevServerConfig({
    entry: opts.entry,
    proxy: proxyConfig,
    protocol: PROTOCOL
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
    host: serverConf.host,
    publicPath: config.assetsPublicPath,
    openBrowser: config.devServer.open,
    useTypeScript: config.useTypeScript,
    onTsError(severity, errors) {
      devServer.sockWrite(devServer.sockets, `${severity}s`, errors)
    }
  }).apply(compiler)

  const devServer = new DevServer(compiler, serverConf)

  return devServer
}

async function server(entryInput) {
  spinner.start()

  let webpackConfig = getWebpackConfig({ spinner, ...entryInput })

  webpackConfig = prehandleConfig({
    command: 'dev',
    webpackConfig,
    entry: entryInput.entry
  })

  const port = await getFreePort(DEFAULT_PORT)
  const devServer = createDevServer(webpackConfig, {
    entry: entryInput.entry,
    port
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
  return getEntry(argv).then(server)
}
