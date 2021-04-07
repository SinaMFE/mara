'use strict'

const fs = require('fs')
const errorOverlayMiddleware = require('react-dev-utils/errorOverlayMiddleware')
const evalSourceMapMiddleware = require('react-dev-utils/evalSourceMapMiddleware')
const noopServiceWorkerMiddleware = require('react-dev-utils/noopServiceWorkerMiddleware')
const ignoredFiles = require('react-dev-utils/ignoredFiles')
const paths = require('../config/paths')
const SpeedMeasurePlugin = require('speed-measure-webpack-plugin')
const smp = new SpeedMeasurePlugin({
  disable: !process.env.MEASURE
})

module.exports = function({ entry, proxy, protocol, publicPath = '/', host }) {
  const localPublicDir = paths.getRootPath(`${paths.views}/${entry}/public`)

  return smp.wrap({
    // 允许修改 host 模拟跨域
    disableHostCheck: true,
    headers: { 'Access-Control-Allow-Origin': '*' },
    // Enable gzip compression of generated files.
    compress: true,
    // 屏蔽 WebpackDevServer 自身的日志输出
    // 此设置不影响警告与错误信息
    clientLogLevel: 'silent',
    // https://github.com/webpack/webpack-dev-server/pull/2235
    // 由于 WDS #2235 改动，强制指定 logLevel 为 silent，
    // quiet 保持缺省，避免 WDS 打印初始化信息
    // quiet: true,
    logLevel: 'silent',
    // 注意，不要通过 webpack import public 内的资源
    // 对于脚本及样式，应使用 script，link 标签引入
    // <link rel="shortcut icon" href="%PUBLIC_URL%/favicon.ico">
    // 在 js 内，可使用 process.env.PUBLIC_URL 获取路径
    contentBase: [
      // 全局 public
      paths.public,
      // 页面级 public
      localPublicDir
      // @FIXME 监听 html 文件变化，临时措施
      // `${paths.views}/${entry}/*.html`
    ],
    contentBasePublicPath: publicPath,
    // By default files from `contentBase` will not trigger a page reload.
    watchContentBase: true,
    // Enable hot reloading server. It will provide /sockjs-node/ endpoint
    // for the WebpackDevServer client so it can learn when the files were
    // updated. The WebpackDevServer client is included as an entry point
    // in the Webpack development configuration. Note that only changes
    // to CSS are currently hot reloaded. JS changes will refresh the browser.
    hot: true,
    // Use 'ws' instead of 'sockjs-node' on server since we're using native
    // websockets in `webpackHotDevClient`.
    transportMode: 'ws',
    // Prevent a WS client from getting injected as we're already including
    // `webpackHotDevClient`.
    injectClient: false,
    // It is important to tell WebpackDevServer to use the same "root" path
    // as we specified in the config. In development, we always serve from /.
    publicPath: publicPath,
    // Reportedly, this avoids CPU overload on some systems.
    // https://github.com/facebook/create-react-app/issues/293
    // src/node_modules is not ignored to support absolute imports
    // https://github.com/facebook/create-react-app/issues/1065
    watchOptions: {
      ignored: ignoredFiles(paths.src)
    },
    // Enable HTTPS if the HTTPS environment variable is set to 'true'
    https: protocol === 'https',
    host: host,
    overlay: false,
    historyApiFallback: {
      // Paths with dots should still use the history fallback.
      // See https://github.com/facebook/create-react-app/issues/387.
      disableDotRule: true,
      index: publicPath
    },
    proxy,
    before(app, server) {
      // Keep `evalSourceMapMiddleware` and `errorOverlayMiddleware`
      // middlewares before `redirectServedPath` otherwise will not have any effect
      // This lets us fetch source contents from webpack for the error overlay
      app.use(evalSourceMapMiddleware(server))
      // This lets us open files from the runtime error overlay.
      app.use(errorOverlayMiddleware())

      app.use(function removeVueTypeSuffix(req, res, next) {
        if (req.url.startsWith('ws')) {
          console.log(res)
        }

        next()
      })

      if (fs.existsSync(paths.proxySetup)) {
        // This registers user provided middleware for proxy reasons
        require(paths.proxySetup)(app)
      }
    },
    after(app) {
      // This service worker file is effectively a 'no-op' that will reset any
      // previous service worker registered for the same host:port combination.
      // We do this in development to avoid hitting the production cache if
      // it used the same host and port.
      // https://github.com/facebook/create-react-app/issues/2272#issuecomment-302832432
      app.use(noopServiceWorkerMiddleware(publicPath))
    },
    // 自行控制浏览器打开
    open: false
  })
}
