const { customSerailizeVueFilesWithSinaFormat } = require('sina-meta-serialize')
const { options } = require('./config')

const isVue = mod => /\.vue$/.test(mod.resource)
const globalName = '__CMOP_META'

function getMetaData(files) {
  const { components } = customSerailizeVueFilesWithSinaFormat(files, options)

  Object.keys(components).forEach(stag => {
    const meta = components[stag]

    Object.keys(meta.props).forEach(p => {
      delete meta.props[p].design
    })
  })

  return components
}

class VueMetaPlugin {
  constructor(opt) {
    this.vueDeps = []
    this.entry = opt.entry
  }

  apply(compiler) {
    this.collectVueComps(compiler)
    this.injectMetaData(compiler)
  }

  collectVueComps(compiler) {
    compiler.hooks.compilation.tap('VueMetaPlugin', compilation => {
      compilation.hooks.afterOptimizeModules.tap('VueMetaPlugin', modules => {
        modules.filter(isVue).forEach(mod => {
          this.vueDeps.push(mod.resource)
        })
      })
    })
  }

  injectMetaData(compiler) {
    compiler.hooks.emit.tap('VueMetaPlugin', compilation => {
      const components = getMetaData(this.vueDeps)
      const mainJs = `static/js/${this.entry}.min.js`
      let code = compilation.assets[mainJs]._value

      code = `window["${globalName}"] = ${JSON.stringify(components)};\n` + code

      compilation.assets[mainJs] = {
        source: () => code,
        size: () => code.length
      }
    })
  }
}

module.exports = VueMetaPlugin
