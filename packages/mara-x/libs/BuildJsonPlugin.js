class BuildJsonPlugin {
  constructor(options) {
    const defOpt = {
      target: '',
      version: '',
      debug: false,
      marax: ''
    }

    this.fileName = 'build.json'
    this.options = Object.assign(defOpt, options)
  }

  apply(compiler) {
    const pluginName = this.constructor.name

    compiler.hooks.make.tap(pluginName, compilation => {
      compilation.hooks.additionalAssets.tap(pluginName, () => {
        compilation.assets[this.fileName] = this.getBuildJson()
      })
    })
  }

  getBuildJson() {
    const source = JSON.stringify(
      {
        target: this.options.target,
        version: this.options.version,
        debug: this.options.debug,
        marax: this.options.marax
      },
      null,
      2
    )

    return {
      source: () => source,
      size: () => source.length
    }
  }
}

module.exports = BuildJsonPlugin
