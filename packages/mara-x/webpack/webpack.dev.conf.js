'use strict'

const fs = require('fs')
const path = require('path')
const webpack = require('webpack')
const { merge } = require('webpack-merge')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const InterpolateHtmlPlugin = require('react-dev-utils/InterpolateHtmlPlugin')
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin')
const perfInstallModulePlugin = require('../lib/perfInstallModulePlugin')
const BuildProgressPlugin = require('../lib/BuildProgressPlugin')
const InlineUmdHtmlPlugin = require('../lib/InlineUmdHtmlPlugin')
const { ManifestPlugin } = require('../lib/hybrid')
const { getServantEntry } = require('../lib/entry')
const config = require('../config')

module.exports = function(context, spinner) {
  const entry = context.entry
  const baseWebpackConfig = require('./webpack.base.conf')(context, 'dev')
  const servantEntry = getServantEntry(entry)
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
      new CaseSensitivePathsPlugin(),
      new ManifestPlugin({
        entry,
        version: context.version,
        target: context.target
      })
    ].filter(Boolean)
  })

  return webpackConfig
}
