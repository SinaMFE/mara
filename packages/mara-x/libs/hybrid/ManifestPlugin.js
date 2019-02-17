const fs = require('fs')
const chalk = require('chalk')
const validator = require('@mara/schema-utils')
const maraManifestSchema = require('./maraManifestSchema')
const { rootPath, isObject } = require('../utils')

function readJsonFile(filePath) {
  const fileText = fs.readFileSync(filePath, 'utf8')

  try {
    return JSON.parse(fileText)
  } catch (e) {
    throw new Error('manifest json 格式错误')
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

module.exports = class ManifestPlugin {
  constructor(options) {
    const defOpt = {
      target: '',
      entry: ''
      // generate: false
    }

    this.options = Object.assign(defOpt, options)
    this.fileName = 'manifest.json'
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
    this.entry = this.options.entry
    this.rootFilePath = rootPath(`src/view/${this.entry}/${this.fileName}`)
    this.publicFilePath = rootPath(
      `src/view/${this.entry}/public/${this.fileName}`
    )
    this.hasRootFile = fs.existsSync(this.rootFilePath)
    this.hasPublicFile = fs.existsSync(this.publicFilePath)
    this.isHybrid = this.options.target === 'app'
    this.version = require(rootPath('package.json')).version

    this._checkConflict()
  }

  apply(compiler) {
    const pluginName = this.constructor.name
    const hasManifest = this.hasRootFile || this.hasPublicFile

    if (hasManifest || this.isHybrid) {
      compiler.hooks.make.tap(pluginName, compilation => {
        compilation.hooks.additionalAssets.tap(pluginName, () => {
          compilation.assets[this.fileName] = this.genManifest()
        })
      })
    }
  }

  // manifest 源
  // view/page/manifest.json
  // view/page/public/manifest.json
  getManifest() {
    let manifest

    if (this.hasRootFile) {
      manifest = readJsonFile(this.rootFilePath)
    } else if (this.hasPublicFile) {
      manifest = readJsonFile(this.publicFilePath)
    }

    // 为设置 manifest 时，设置缺省配置
    manifest = manifest || {}

    if (validator(maraManifestSchema, manifest, this.fileName)) {
      return manifest
    }
  }

  _checkConflict() {
    if (this.hasRootFile && this.hasPublicFile) {
      throw new Error(
        chalk.red('There are multiple manifest.json, please keep one:\n\n') +
          ` - ${this.rootFilePath} ${chalk.green('(recommend)')}\n` +
          ` - ${this.publicFilePath}`
      )
    }
  }

  getTargetContent() {
    const manifest = this.getManifest()
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
    return Object.assign(version, filter(manifest), version)
  }

  genManifest() {
    const manifest = this.getTargetContent()
    const source = JSON.stringify(manifest, null, 2)

    return {
      source: () => source,
      size: () => source.length
    }
  }
}
