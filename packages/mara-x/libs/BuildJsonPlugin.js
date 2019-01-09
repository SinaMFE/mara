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
    compiler.hooks.compilation.tap(this.constructor.name, compilation => {
      this.genBuildJson(compilation)
    })
  }

  genBuildJson(compilation) {
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

    compilation.assets[this.fileName] = {
      source: () => source,
      size: () => source.length
    }
  }
}

module.exports = BuildJsonPlugin
