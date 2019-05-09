'use strict'

const fs = require('fs')
const path = require('path')
const webpack = require('webpack')
const merge = require('webpack-merge')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const InterpolateHtmlPlugin = require('react-dev-utils/InterpolateHtmlPlugin')
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin')
const perfInstallModulePlugin = require('../libs/perfInstallModulePlugin')
const BuildProgressPlugin = require('../libs/BuildProgressPlugin')
const InlineUmdHtmlPlugin = require('../libs/InlineUmdHtmlPlugin')
const { getEntryPoints } = require('../libs/utils')
const config = require('../config')
const { GLOB, VIEWS_DIR } = require('../config/const')

module.exports = function(context, spinner) {
  const entry = context.entry
  const baseWebpackConfig = require('./webpack.base.conf')(context)
  const servantEntry = getEntryPoints(
    `${VIEWS_DIR}/${entry}/${GLOB.SERVANT_ENTRY}`
  )
  const htmlTemplatePath = `${config.paths.views}/${entry}/index.html`
  const hasHtml = fs.existsSync(htmlTemplatePath)

  // https://github.com/survivejs/webpack-merge
  // 当 entry 为数组时，webpack-merge 默认执行 append
  const webpackConfig = merge(baseWebpackConfig, {
    mode: 'development',
    devtool: 'cheap-module-source-map',
    entry: servantEntry,
    output: {
      // Add /* filename */ comments to generated require()s in the output.
      pathinfo: true,
      publicPath: context.publicPath,
      // Point sourcemap entries to original disk location (format as URL on Windows)
      devtoolModuleFilenameTemplate: info =>
        path.resolve(info.absoluteResourcePath).replace(/\\/g, '/')
    },
    // 放在单独的 dev.conf 中，保持 base.conf 通用性
    optimization: {
      // Automatically split vendor and commons
      // https://twitter.com/wSokra/status/969633336732905474
      // https://medium.com/webpack/webpack-4-code-splitting-chunk-graph-and-the-splitchunks-optimization-be739a861366
      splitChunks: {
        chunks(chunk) {
          // servant entry 仅输出 async 包
          if (/\.servant/.test(chunk.name)) return false

          return !!config.compiler.splitChunks
        },
        // 一些 CDN 不支持 `~`，因此指定为 `-``
        automaticNameDelimiter: '_',
        name: true
      },
      // Keep the runtime chunk seperated to enable long term caching
      // https://twitter.com/wSokra/status/969679223278505985
      runtimeChunk: false
    },
    plugins: [
      // 由于 base.conf 会被外部引用，在一些情况下不需要 ProgressPlugin
      // 因此独立放在 dev.conf 中
      new BuildProgressPlugin({
        spinner,
        name: 'Starting',
        type: config.marax.progress
      }),
      hasHtml &&
        new HtmlWebpackPlugin({
          // dev 模式以页面文件夹名作为模板名称
          filename: `${entry}.html`,
          // 生成各自的 html 模板
          template: htmlTemplatePath,
          inject: true
        }),
      hasHtml && new InlineUmdHtmlPlugin(HtmlWebpackPlugin),
      // 替换 html 内的环境变量
      // %PUBLIC% 转换为具体路径
      // 在 dev 环境下为空字符串
      hasHtml &&
        new InterpolateHtmlPlugin(HtmlWebpackPlugin, context.buildEnv.raw),
      // https://github.com/glenjamin/webpack-hot-middleware#installation--usage
      new webpack.HotModuleReplacementPlugin(),
      // 等待稳定
      // new perfInstallModulePlugin({
      //   url:"http://exp.smfe.sina.cn/service/addPerf"
      // }),
      // 严格区分大小写
      new CaseSensitivePathsPlugin()
    ].filter(Boolean)
  })

  return webpackConfig
}
