module.exports = function prependEntryCode(compilation, code) {
  const ConcatSource = require('webpack-sources/lib/ConcatSource')

  const assets = compilation.assets
  const concatSource = (assets, fileName, code) => {
    assets[fileName] = new ConcatSource(code, assets[fileName])
  }

  compilation.hooks.optimizeChunkAssets.tapAsync(
    'PrependEntryCodePlugin',
    (chunks, callback) => {
      chunks.forEach(chunk => {
        if (!chunk.isOnlyInitial() || !chunk.name) return

        chunk.files
          .filter(fileName => fileName.match(/\.js$/))
          .forEach(fileName => {
            concatSource(assets, fileName, code)
          })
      })

      callback()
    }
  )
}
