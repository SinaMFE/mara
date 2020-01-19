const fs = require('fs')
const chalk = require('chalk')
const validator = require('@mara/schema-utils')
const ConcatSource = require('webpack-sources/lib/ConcatSource')
const maraManifestSchema = require('./maraManifestSchema')
const { rootPath, isObject, relativePath } = require('../utils')
const { VIEWS_DIR, TARGET } = require('../../config/const')

const MANIFEST_FILE_NAME = 'manifest.json'
const HYBRID_MANIFEST_INJECT_NAME = '__HB_MANIFEST'

function readJsonFile(filePath) {
  if (typeof filePath !== 'string') throw new Error('manifest 路径错误')

  const fileText = fs.readFileSync(filePath, 'utf8')

  try {
    return JSON.parse(fileText)
  } catch (e) {
    throw new Error('manifest json 解析错误')
  }
}

/**
 * 对象属性过滤器生成函数
 * @memberof utils
 * @param  {Array}  props  目标属性集
 * @param  {Boolean | Function} isDrop 对目标属性过滤模式
 * Boolean|自定义断言函数，默认为去除模式
 * @return {Function}        过滤器
 */
function filterObjProps(props, isPick = true) {
  const exclude = key => props.indexOf(key) < 0
  const include = key => !exclude(key)
  const filter = isPick ? include : exclude

  return obj => {
    // ES5 Object.keys 参数必须为对象
    if (!isObject(obj)) return {}

    const assign = (data, key) => ((data[key] = obj[key]), data)

    return Object.keys(obj)
      .filter(filter)
      .reduce(assign, {})
  }
}

function getPathOrThrowConflict(rootFilePath, publicFilePath) {
  const hasRootFile = fs.existsSync(rootFilePath)
  const hasPublicFile = fs.existsSync(publicFilePath)

  if (hasRootFile && hasPublicFile) {
    throw new Error(
      chalk.red('There are multiple manifest.json, please keep one:\n\n') +
        ` * ${relativePath(rootFilePath)}  ${chalk.green('(recommend)')}\n` +
        ` * ${relativePath(publicFilePath)}`
    )
  }

  return hasRootFile ? rootFilePath : hasPublicFile ? publicFilePath : ''
}

module.exports = class ManifestPlugin {
  constructor(options) {
    const defOpt = {
      target: '',
      entry: ''
      // generate: false
    }

    options = Object.assign({}, defOpt, options)

    // https://developer.mozilla.org/zh-CN/docs/Web/Manifest
    this.pwaField = [
      'dir',
      'name',
      'lang',
      'scope',
      'theme_color',
      'short_name',
      'start_url',
      'pwa_display',
      'background_color',
      'description',
      'orientation',
      'icons',
      'related_applications',
      'prefer_related_applications'
    ]
    this.entry = options.entry
    this.rootFilePath = rootPath(
      `${VIEWS_DIR}/${this.entry}/${MANIFEST_FILE_NAME}`
    )
    this.publicFilePath = rootPath(
      `${VIEWS_DIR}/${this.entry}/public/${MANIFEST_FILE_NAME}`
    )
    this.hasRootFile = fs.existsSync(this.rootFilePath)
    this.hasPublicFile = fs.existsSync(this.publicFilePath)
    this.isHybrid = options.target === TARGET.APP
    this.version = options.version || require(rootPath('package.json')).version

    this.manifestPath = ManifestPlugin.getManifestPath(this.entry)
  }

  apply(compiler) {
    const pluginName = this.constructor.name
    const manifestAsset = this.genAsset()

    if (this.manifestPath || this.isHybrid) {
      compiler.hooks.make.tap(pluginName, compilation => {
        compilation.hooks.additionalAssets.tap(pluginName, () => {
          compilation.assets[MANIFEST_FILE_NAME] = manifestAsset
        })
      })

      compiler.hooks.emit.tap(pluginName, compilation => {
        this.prependEntryCode(compilation, manifestAsset.source())
      })
    }
  }

  // manifest 源
  // views/<view>/manifest.json
  // views/<view>/public/manifest.json
  resolveManifest() {
    let manifest

    try {
      manifest = this.manifestPath ? readJsonFile(this.manifestPath) : {}
    } catch (e) {
      // 未设置 manifest 时，设置缺省配置
      manifest = {}
    }

    if (validator(maraManifestSchema, manifest, MANIFEST_FILE_NAME)) {
      return manifest
    }
  }

  static getManifestPath(view, fileName = MANIFEST_FILE_NAME) {
    const rootFilePath = rootPath(`${VIEWS_DIR}/${view}/${fileName}`)
    const publicFilePath = rootPath(`${VIEWS_DIR}/${view}/public/${fileName}`)

    return getPathOrThrowConflict(rootFilePath, publicFilePath)
  }

  getManifest() {
    const manifest = this.resolveManifest(this.manifestPath)
    const content = this._pickField(manifest, !this.isHybrid)

    // pwa manifest 与 hybrid manifest display 字段冲突
    // 以 hybrid 为先，pwa 使用 pwa_display 替代
    if (!this.isHybrid && content.pwa_display) {
      content.display = content.pwa_display
      delete content.pwa_display
    }

    return content
  }

  _pickField(manifest, isPWA) {
    const filter = filterObjProps(this.pwaField, isPWA)
    const version = { version: this.version }

    // 确保将 version 排序至第一位
    // 第一个 version 是为了将字段提升至第一位
    // 最后一个 version 是为了覆盖原有值
    return Object.assign({}, version, filter(manifest), version)
  }

  prependEntryCode(compilation, code) {
    const entry = compilation.chunks.filter(c => c.isOnlyInitial() && c.name)[0]
    const entryName = entry.files.filter(f => /\.js$/.test(f))[0]
    const assets = compilation.assets[entryName]
    const asset = assets.children ? assets.children[0] : assets
    let entrySource = asset.source()

    entrySource =
      `window["${HYBRID_MANIFEST_INJECT_NAME}"] = ${code};\n` + entrySource

    const newRawSource = {
      source: () => entrySource,
      size: () => entrySource.length
    }

    if (assets.children) {
      compilation.assets[entryName].children[0] = newRawSource
    } else {
      compilation.assets[entryName] = newRawSource
    }
  }

  genAsset() {
    const manifest = this.getManifest()
    const source = JSON.stringify(manifest)

    return {
      source: () => source,
      size: () => source.length
    }
  }
}
