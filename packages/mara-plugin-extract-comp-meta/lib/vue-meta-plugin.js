const { customSerailizeVueFilesWithSinaFormat } = require('sina-meta-serialize')
const { extractOptions } = require('./config')

const isVue = mod => /\.vue$/.test(mod.resource)
const globalName = '__CMOP_META'

function getMetaData(files) {
  const { components = {} } =
    customSerailizeVueFilesWithSinaFormat(files, extractOptions) || {}

  // drop design field
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
    this.injectVueMetaLoader(compiler)
    // 由于缓存优化，某些情况不经过 loader，因此静态收集
    this.collectVueComps(compiler)
    this.genMetaData(compiler)
  }

  injectVueMetaLoader(compiler) {
    compiler.options.module.rules
      .filter(r => {
        // vue-loader/lib/plugin.js
        return r.use && r.use.some(i => i.ident === 'vue-loader-options')
      })
      .forEach(r => {
        r.use.push({
          ident: 'vue-scomp-meta-loader',
          loader: require.resolve('./vue-meta-loader.js'),
          options: {}
        })
      })
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

  genMetaData(compiler) {
    compiler.hooks.emit.tap('VueMetaPlugin', compilation => {
      // 避免掩盖原始错误
      if (compilation.errors.length) return

      let components = {}

      try {
        components = getMetaData(this.vueDeps)
      } catch (e) {
        compilation.errors.push(e)

        return
      }

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
