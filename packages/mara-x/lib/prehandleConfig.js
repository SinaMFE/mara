const config = require('../config')

module.exports = function preHandleConfig({ command, webpackConfig, entry }) {
  if (config.webpackPluginsHandler) {
    config.webpackPluginsHandler({
      entry: entry,
      command,
      argv: config.argv,
      target: config.target,
      mode: process.env.NODE_ENV,
      webpackPlugins: webpackConfig.plugins
    })
  }

  return webpackConfig
}
