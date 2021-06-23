'use strict'

const fs = require('fs')
const devalue = require('devalue')
const chalk = require('chalk')
const semver = require('semver')
const prependEntryCode = require('../prependEntryCode')
const ManifestPlugin = require('./ManifestPlugin')
const { UNI_SNC, COMMON_PKG_NAME, MANIFEST } = require('../../config/const')
const paths = require('../../config/paths')
const HYBRID_MANIFEST_INJECT_NAME = '__HB_MANIFEST'

/**
 * 生成版本文件
 * 未来会通过 manifest 中 version 替代
 */
class SinaHybridPlugin {
  constructor(htmlWebpackPlugin, options) {
    this.entry = options.entry
    this.publicPath = options.publicPath
    this.version = options.version || require(paths.packageJson).version
    this.htmlWebpackPlugin = htmlWebpackPlugin
    this.useCommonPkg = options.useCommonPkg
    this.isHybridMode = options.isHybridMode
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
      if (this.isHybridMode) {
        const maraCtx = compiler['maraContext'] || {}

        this.injectDataSource(compilation, maraCtx.dataSource)
        this.injectManifest(compilation)
        this.genVersionFile(compilation)
      }

      if (this.useCommonPkg) {
        this.injectCommonAssets(compilation)
      }
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
    let commonPkgPath

    if (this.isHybridMode) {
      const filePath = `static/js/${COMMON_PKG_NAME}.js`

      compilation.hooks.additionalAssets.tap(this.constructor.name, () => {
        compilation.assets[filePath] = this.genCommonAssets()
      })

      commonPkgPath = this.publicPath + filePath
    } else {
      commonPkgPath = this.commonPkgPath
    }

    const hooks = this.htmlWebpackPlugin.getHooks(compilation)

    hooks.alterAssetTagGroups.tap(this.constructor.name, assets => {
      assets.headTags.push({
        tagName: 'script',
        attributes: {
          id: 'COMMON_PKG',
          src: commonPkgPath
        },
        closeTag: true
      })
    })
  }

  injectManifest(compilation) {
    const hooks = this.htmlWebpackPlugin.getHooks(compilation)

    compilation.hooks.afterSeal.tap(this.constructor.name, () => {
      hooks.alterAssetTagGroups.tap(this.constructor.name, assets => {
        const manifest = compilation.assets[MANIFEST].source()
        const tagObject = {
          tagName: 'script',
          attributes: {
            id: 'HB_MANIFEST'
          },
          innerHTML: `var ${HYBRID_MANIFEST_INJECT_NAME} = ${manifest}`,
          closeTag: true
        }

        const commonPkgIdx = assets.headTags.findIndex(
          e => e.attributes.id == 'COMMON_PKG'
        )

        // 确保在 common pkg 资源之前
        assets.headTags.splice(commonPkgIdx, 0, tagObject)
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
