const { customSerailizeVueFilesWithSinaFormat } = require('sina-meta-serialize')
const { options } = require('./config')

const isVue = mod => /\.vue$/.test(mod.resource)
const globalName = '__CMOP_META'

function getMetaData(files) {
  const { components } = customSerailizeVueFilesWithSinaFormat(files, options)

  Object.keys(components).forEach(stag => {
    const meta = components[stag]

    Object.keys(meta.props).forEach(p => {
      meta.props[p].returnType = meta.props[p].design.dataType

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

      const entry = compilation.chunks.filter(
        c => c.isOnlyInitial() && c.name
      )[0]
      const entryName = entry.files.filter(f => /\.js$/.test(f))[0]
      const assets = compilation.assets[entryName]
      const asset = assets.children ? assets.children[0] : assets
      let code = asset._value

      code = `window["${globalName}"] = ${JSON.stringify(components)};\n` + code

      const newRawSource = {
        source: () => code,
        size: () => code.length
      }

      if (assets.children) {
        compilation.assets[entryName].children[0] = newRawSource
      } else {
        compilation.assets[entryName] = newRawSource
      }
    })
  }
}

module.exports = VueMetaPlugin
