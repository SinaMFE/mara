const path = require('path')

class BuildJsonPlugin {
  constructor(options) {
    const defOpt = {
      target: '',
      version: '',
      debug: false,
      marax: '',
      env: 'online',
      publicPath: null,
      basePath: '',
      zenJs: false
    }

    this.fileName = 'build.json'
    this.options = Object.assign(defOpt, options)
  }

  apply(compiler) {
    this.moduleAssets = {}

    const pluginOptions = {
      name: this.constructor.name,
      stage: Infinity
    }

    compiler.hooks.compilation.tap(pluginOptions, compilation => {
      compilation.hooks.moduleAsset.tap(
        pluginOptions,
        this.collectModuleAsset.bind(this)
      )
    })

    compiler.hooks.emit.tap(pluginOptions, compilation => {
      const manifest = this.getAssetsManifest(compilation)

      compilation.assets[this.fileName] = this.getBuildJson(manifest)
    })
  }

  getBuildJson(manifest = {}) {
    const source = JSON.stringify(
      {
        // build target
        target: this.options.target,
        // project version
        version: this.options.version,
        // deploy env
        env: this.options.env,
        // debug mode
        debug: this.options.debug,
        // marax version
        marax: this.options.marax,
        // assets manifest
        manifest: manifest
      },
      null,
      2
    )

    return {
      source: () => source,
      size: () => source.length
    }
  }

  sortAssetField(files) {
    const isJS = val => /\.js$/.test(val)
    const isCSS = val => /\.css$/.test(val)

    return files.sort((a, b) => {
      if (isJS(a.name) && isCSS(b.name)) return -1
      if (isCSS(a.name) && isJS(b.name)) return 1

      return 1
    })
  }

  collectModuleAsset(module, file) {
    if (module.userRequest) {
      this.moduleAssets[file] = path.join(
        path.dirname(file),
        path.basename(module.userRequest)
      )
    }
  }

  getAssetsManifest(compilation) {
    const publicPath =
      this.options.publicPath != null
        ? this.options.publicPath
        : compilation.options.output.publicPath
    const stats = compilation.getStats().toJson()

    const getFileType = str => {
      str = str.replace(/\?.*/, '')

      return str.split('.').pop()
    }

    let files = compilation.chunks.reduce((files, chunk) => {
      return chunk.files.reduce((files, path) => {
        let name = chunk.name ? chunk.name : null
        const isInitial = chunk.isOnlyInitial()

        if (name) {
          if (isInitial) {
            name = `static/${getFileType(path)}/` + name
          }

          name += '.' + getFileType(path)
        } else {
          // For nameless chunks, just map the files directly.
          name = path
        }

        if (this.options.zenJs && isInitial) {
          path = path.replace(/\.js$/, '')
        }

        // Webpack 4: .isOnlyInitial()
        // Webpack 3: .isInitial()
        // Webpack 1/2: .initial
        return files.concat({
          path,
          chunk,
          name,
          isInitial,
          isChunk: true,
          isAsset: false,
          isModuleAsset: false
        })
      }, files)
    }, [])

    // module assets don't show up in assetsByChunkName.
    // we're getting them this way;
    files = stats.assets.reduce((files, asset) => {
      const name = this.moduleAssets[asset.name]

      if (name) {
        return files.concat({
          path: asset.name,
          name: name,
          isInitial: false,
          isChunk: false,
          isAsset: true,
          isModuleAsset: true
        })
      }

      const isEntryAsset = asset.chunks.length > 0

      if (isEntryAsset) return files

      return files.concat({
        path: asset.name,
        name: asset.name,
        isInitial: false,
        isChunk: false,
        isAsset: true,
        isModuleAsset: false
      })
    }, files)

    files = files.filter(file => {
      // Don't add hot updates to manifest
      const isUpdateChunk = file.path.indexOf('hot-update') >= 0

      return !isUpdateChunk
    })

    // Append optional basepath onto all references.
    // This allows output path to be reflected in the manifest.
    if (this.options.basePath) {
      files = files.map(file => {
        file.name = this.options.basePath + file.name
        return file
      })
    }

    if (publicPath) {
      // Similar to basePath but only affects the value (similar to how
      // output.publicPath turns require('foo/bar') into '/public/foo/bar', see
      // https://github.com/webpack/docs/wiki/configuration#outputpublicpath
      files = files.map(file => {
        file.path = publicPath + file.path
        return file
      })
    }

    files = files.map(file => {
      file.name = file.name.replace(/\\/g, '/')
      file.path = file.path.replace(/\\/g, '/')

      return file
    })

    files = this.sortAssetField(files)

    return files.reduce((manifest, file) => {
      manifest[file.name] = file.path

      return manifest
    }, {})
  }
}

module.exports = BuildJsonPlugin
