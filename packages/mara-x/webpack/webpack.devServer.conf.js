'use strict'

const fs = require('fs')
const errorOverlayMiddleware = require('react-dev-utils/errorOverlayMiddleware')
const evalSourceMapMiddleware = require('react-dev-utils/evalSourceMapMiddleware')
const noopServiceWorkerMiddleware = require('react-dev-utils/noopServiceWorkerMiddleware')
const ignoredFiles = require('react-dev-utils/ignoredFiles')
const { localIp } = require('@mara/devkit')
const { rootPath } = require('../libs/utils')
const paths = require('../config/paths')

module.exports = function({ entry, proxy, protocol, publicPath = '/' }) {
  const localPublicDir = rootPath(`${paths.views}/${entry}/public`)

  return {
    // 允许修改 host 模拟跨域
    disableHostCheck: true,
    headers: { 'Access-Control-Allow-Origin': '*' },
    // Enable gzip compression of generated files.
    compress: true,
    // 屏蔽 WebpackDevServer 自身的日志输出
    // 此设置不影响警告与错误信息
    clientLogLevel: 'none',
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
    // By default files from `contentBase` will not trigger a page reload.
    watchContentBase: true,
    // Enable hot reloading server. It will provide /sockjs-node/ endpoint
    // for the WebpackDevServer client so it can learn when the files were
    // updated. The WebpackDevServer client is included as an entry point
    // in the Webpack development configuration. Note that only changes
    // to CSS are currently hot reloaded. JS changes will refresh the browser.
    hot: true,
    // It is important to tell WebpackDevServer to use the same "root" path
    // as we specified in the config. In development, we always serve from /.
    publicPath: publicPath,
    // WebpackDevServer is noisy by default so we emit custom message instead
    // by listening to the compiler events with `compiler.hooks[...].tap` calls above.
    quiet: true,
    // Reportedly, this avoids CPU overload on some systems.
    // https://github.com/facebook/create-react-app/issues/293
    // src/node_modules is not ignored to support absolute imports
    // https://github.com/facebook/create-react-app/issues/1065
    watchOptions: {
      ignored: ignoredFiles(paths.src)
    },
    // Enable HTTPS if the HTTPS environment variable is set to 'true'
    https: protocol === 'https',
    host: localIp(),
    overlay: false,
    historyApiFallback: {
      // Paths with dots should still use the history fallback.
      // See https://github.com/facebook/create-react-app/issues/387.
      disableDotRule: true
    },
    // proxy,
    before(app, server) {
      if (fs.existsSync(paths.proxySetup)) {
        // This registers user provided middleware for proxy reasons
        require(paths.proxySetup)(app)
      }

      // This lets us fetch source contents from webpack for the error overlay
      app.use(evalSourceMapMiddleware(server))
      // This lets us open files from the runtime error overlay.
      app.use(errorOverlayMiddleware())

      // This service worker file is effectively a 'no-op' that will reset any
      // previous service worker registered for the same host:port combination.
      // We do this in development to avoid hitting the production cache if
      // it used the same host and port.
      // https://github.com/facebook/create-react-app/issues/2272#issuecomment-302832432
      app.use(noopServiceWorkerMiddleware())
    }
  }
}
