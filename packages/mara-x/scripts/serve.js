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
const useYarn = fs.existsSync(config.paths.yarnLock)
const spinner = ora('Starting development server...')

async function getCompiler(webpackConf, devServerConf, { entry, port } = {}) {
  const compiler = webpack(webpackConf)

  new DevServerPlugin({
    port,
    entry,
    useYarn,
    spinner,
    protocol: PROTOCOL,
    host: devServerConf.host,
    publicPath: config.assetsPublicPath,
    openBrowser: config.devServer.open
  }).apply(compiler)

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

async function createDevServer(webpackConf, opts) {
  const DevServer = require('webpack-dev-server')
  const proxyConfig = config.devServer.proxy
  const serverConf = createDevServerConfig({
    entry: opts.entry,
    proxy: proxyConfig,
    protocol: PROTOCOL
  })
  const compiler = await getCompiler(webpackConf, serverConf, opts)

  return new DevServer(compiler, serverConf)
}

async function server(entryInput) {
  spinner.start()

  const webpackConf = prehandleConfig(
    'dev',
    getWebpackConfig({ spinner, ...entryInput })
  )
  const port = await getFreePort(DEFAULT_PORT)
  const devServer = await createDevServer(webpackConf, {
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
