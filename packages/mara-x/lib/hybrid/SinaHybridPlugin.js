'use strict'

const fs = require('fs')
const path = require('path')
const devalue = require('devalue')
const chalk = require('chalk')
const semver = require('semver')
const prependEntryCode = require('../prependEntryCode')
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
    this.useCommonPkg = options.useCommonPkg
    this.commonPkgPath = options.commonPkgPath
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

      this.injectCommonAssets(compilation)
      this.injectDataSource(compilation, maraCtx.dataSource)
      this.genVersionFile(compilation)
    })
  }

  genCommonAssets() {
    const source = fs.readFileSync(this.commonPkgPath, 'utf8')

    return {
      source: () => source,
      size: () => source.length
    }
  }

  injectCommonAssets(compilation) {
    if (!this.useCommonPkg) return

    const filePath = 'static/js/__SINA_COMMON_PKG__.js'

    compilation.hooks.additionalAssets.tap(this.constructor.name, () => {
      compilation.assets[filePath] = this.genCommonAssets()
    })

    const hooks = this.htmlWebpackPlugin.getHooks(compilation)

    hooks.alterAssetTagGroups.tap(this.constructor.name, assets => {
      assets.headTags.push({
        tagName: 'script',
        attributes: {
          src: this.publicPath + filePath
        },
        closeTag: true
      })
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

    prependEntryCode(
      compilation,
      `var __SP_DATA_SOURCE = ${devalue(dataSource)};`
    )
    this.rewriteField('dataSource', dataSource)
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
