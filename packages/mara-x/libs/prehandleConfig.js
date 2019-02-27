const config = require('../config')

module.exports = function({ command, webpackConfig, entry }) {
  if (config.webpackPluginsHandler) {
    const context = {
      entry,
      command,
      argv: config.argv,
      target: config.target,
      mode: process.env.NODE_ENV,
      webpackPlugins: webpackConfig.plugins
    }

    config.webpackPluginsHandler(context)
  }

  return webpackConfig
}
