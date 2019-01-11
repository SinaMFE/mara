const config = require('../config')

module.exports = function(command, webpackConfig, entry) {
  if (config.webpackPluginsHandler) {
    webpackConfig.plugins = config.webpackPluginsHandler(
      command,
      webpackConfig.plugins,
      config.argv,
      entry
    )
  }

  return webpackConfig
}
