const fs = require('fs-extra')
const chalk = require('chalk')
const babel = require('@babel/core')
const validator = require('@mara/schema-utils')
const prependEntryCode = require('../prependEntryCode')
const maraManifestSchema = require('./maraManifestSchema')
const { isObject } = require('../utils')
const { VIEWS_DIR, TARGET, MANIFEST } = require('../../config/const')
const paths = require('../../config/paths')

const HYBRID_MANIFEST_INJECT_NAME = '__HB_MANIFEST'

function readJsonFile(filePath) {
  if (typeof filePath !== 'string') throw new Error(`${MANIFEST} 路径错误`)

  const fileText = fs.readFileSync(filePath, 'utf8')

  try {
    babel.parse(`export default ${fileText}`)
  } catch (e) {
    throw new Error(e.message.replace('unknown: ', ''))
  }

  return JSON.parse(fileText)
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
        ` * ${paths.getRelativePath(rootFilePath)}  ${chalk.green(
          '(recommend)'
        )}\n` +
        ` * ${paths.getRelativePath(publicFilePath)}`
    )
  }

  return hasRootFile ? rootFilePath : hasPublicFile ? publicFilePath : ''
}

function genManifestAsset(obj) {
  const source = JSON.stringify(obj, null, 2)

  return {
    source: () => source,
    size: () => source.length
  }
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
    this.rootFilePath = paths.getRootPath(
      `${VIEWS_DIR}/${this.entry}/${MANIFEST}`
    )
    this.publicFilePath = paths.getRootPath(
      `${VIEWS_DIR}/${this.entry}/public/${MANIFEST}`
    )
    this.hasRootFile = fs.existsSync(this.rootFilePath)
    this.hasPublicFile = fs.existsSync(this.publicFilePath)
    this.isHybrid = options.target === TARGET.APP
    this.version = options.version || require(paths.packageJson).version

    this.manifestPath = ManifestPlugin.getManifestPath(this.entry)
  }

  apply(compiler) {
    const pluginName = this.constructor.name

    if (this.manifestPath || this.isHybrid) {
      compiler.hooks.make.tapAsync(pluginName, (compilation, callback) => {
        let manifestAsset = null

        try {
          manifestAsset = genManifestAsset(this.getManifest())
        } catch (e) {
          // 非 watch 模式尽早抛出错误
          if (!compiler.watchMode) return callback(e)

          // watch 模式不阻塞进程
          compilation.errors.push(e)
          manifestAsset = genManifestAsset({ version: this.version })
        }

        // 添加变动监听
        compilation.hooks.optimizeTree.tap(pluginName, (chunks, modules) => {
          compilation.compilationDependencies.add(this.manifestPath)
        })

        // 添加生成结果
        compilation.hooks.additionalAssets.tap(pluginName, () => {
          compilation.assets[MANIFEST] = manifestAsset
        })

        prependEntryCode(
          compilation,
          `window["${HYBRID_MANIFEST_INJECT_NAME}"] = ${manifestAsset.source()};`
        )

        callback()
      })
    }
  }

  // manifest 源
  // views/<view>/manifest.json
  // views/<view>/public/manifest.json
  resolveManifest() {
    let manifest = {}

    if (this.manifestPath) {
      try {
        manifest = readJsonFile(this.manifestPath)
      } catch (err) {
        err.message = `Syntax Error: ${err.message}`
        err.file = paths.getRelativePath(this.manifestPath)

        throw err
      }
    }

    if (validator(maraManifestSchema, manifest, MANIFEST)) {
      return manifest
    }
  }

  static getManifestPath(view, fileName = MANIFEST) {
    const rootFilePath = paths.getRootPath(`${VIEWS_DIR}/${view}/${fileName}`)
    const publicFilePath = paths.getRootPath(
      `${VIEWS_DIR}/${view}/public/${fileName}`
    )

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
}
