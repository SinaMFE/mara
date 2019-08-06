'use strict'

const fs = require('fs')
const devalue = require('devalue')
const chalk = require('chalk')
const semver = require('semver')
const ConcatSource = require('webpack-sources/lib/ConcatSource')
const { rootPath } = require('../../lib/utils')
const ManifestPlugin = require('./ManifestPlugin')
const { UNI_SNC } = require('../../config/const')

/**
 * 生成版本文件
 * 未来会通过 manifest 中 version 替代
 */
class SinaHybridPlugin {
  constructor(htmlWebpackPlugin, options) {
    this.entry = options.entry
    this.publicPath = options.publicPath
    this.version = options.version || require(rootPath('package.json')).version
    this.htmlWebpackPlugin = htmlWebpackPlugin
    this.shouldSNCHoisting = options.splitSNC
    this.rewriteField = genRewriteFn(ManifestPlugin.getManifestPath(this.entry))

    if (!semver.valid(this.version)) {
      throw new Error(chalk.red(`package.json version 格式错误`))
    }
  }

  apply(compiler) {
    // 确保在 emit 前调用
    // zip plugin 会在 emit 时打包
    compiler.hooks.compilation.tap(this.constructor.name, compilation => {
      const maraCtx = compiler['maraContext'] || {}

      this.splitSNC(compilation)
      this.injectDataSource(compilation, maraCtx.dataSource)
      this.genVersionFile(compilation)
    })
  }

  splitSNC(compilation) {
    if (!this.shouldSNCHoisting) return

    const hooks = this.htmlWebpackPlugin.getHooks(compilation)

    hooks.alterAssetTagGroups.tap(this.constructor.name, assets => {
      const idx = assets.bodyTags.findIndex(tag =>
        tag.attributes.src.includes(`${UNI_SNC}.`)
      )

      if (idx < 0) return

      assets.headTags.push({
        tagName: 'script',
        attributes: { src: assets.bodyTags[idx].attributes.src },
        closeTag: true
      })

      assets.bodyTags.splice(idx, 1)
    })
  }

  genVersionFile(compilation) {
    compilation.assets[this.version] = {
      // both method
      source: () => '',
      size: () => 0
    }
  }

  injectDataSource(compilation, dataSource) {
    if (!dataSource) return

    this.prependEntryCode(
      compilation,
      `var __SP_DATA_SOURCE = ${devalue(dataSource)};`
    )
    this.rewriteField('dataSource', dataSource)
  }

  prependEntryCode(compilation, code) {
    const assets = compilation.assets
    const concatSource = (assets, fileName, code) => {
      assets[fileName] = new ConcatSource(code, assets[fileName])
    }

    compilation.hooks.optimizeChunkAssets.tapAsync(
      this.name,
      (chunks, callback) => {
        chunks.forEach(chunk => {
          if (!chunk.isInitial() || !chunk.name) return

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
}

function genRewriteFn(manPath) {
  return function(field, value) {
    ;[].concat(manPath).forEach(path => {
      try {
        const manifest = require(path)

        manifest[field] = value
        fs.writeFileSync(path, JSON.stringify(manifest, null, 2))
      } catch (e) {}
    })
  }
}

module.exports = SinaHybridPlugin
