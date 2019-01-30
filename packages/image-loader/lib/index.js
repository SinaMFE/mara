const { getOptions } = require('loader-utils')
const fileLoader = require('./fileLoader')
const svgLoader = require('./svgLoader')
const tinifyLoader = require('./tinifyLoader')

module.exports = function loader(content, sourceMap, meta) {
  const defOpts = {
    minify: true,
    tinifyKeys: []
  }
  const options = Object.assign({}, defOpts, getOptions(this))
  const tinifyKeys = options.tinifyKeys
  const isPngOrJpg = /\.(png|jpe?g)$/.test(this.resourcePath)
  const isSvg = /\.svg$/.test(this.resourcePath)

  if (!options.minify) {
    // sync loader
    return fileLoader(this, content, options)
  }

  if (isSvg) {
    // async loader
    svgLoader(this, content, options)
  } else if (isPngOrJpg && tinifyKeys.length) {
    // async loader
    tinifyLoader(this, content, options)
  } else {
    // fallback
    // sync loader
    return fileLoader(this, content, options)
  }
}

module.exports.raw = true
