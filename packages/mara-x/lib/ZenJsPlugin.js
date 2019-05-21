function removeJsExt(asset) {
  return asset.replace(/\.js$/, '')
}

module.exports = class ZenJsPlugin {
  constructor(htmlWebpackPlugin) {
    this.htmlWebpackPlugin = htmlWebpackPlugin
  }

  genZenJs(compiler) {
    compiler.hooks.emit.tap(this.constructor.name, compilation => {
      const entryNames = Array.from(compilation.entrypoints.keys())

      entryNames.forEach(entryName => {
        const entryPointFiles = compilation.entrypoints
          .get(entryName)
          .getFiles()

        entryPointFiles.forEach(chunkFile => {
          compilation.assets[removeJsExt(chunkFile)] =
            compilation.assets[chunkFile]
        })
      })
    })
  }

  addScriptTypeAttr(compiler) {
    const pluginName = this.constructor.name

    compiler.hooks.compilation.tap(pluginName, compilation => {
      const hooks = this.htmlWebpackPlugin.getHooks(compilation)

      hooks.alterAssetTags.tap(pluginName, ({ assetTags }) => {
        assetTags.scripts.forEach(script => {
          script.attributes = {
            type: 'text/javascript',
            src: removeJsExt(script.attributes.src)
          }
        })
      })
    })
  }

  apply(compiler) {
    this.genZenJs(compiler)
    this.addScriptTypeAttr(compiler)
  }
}
