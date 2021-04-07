'use strict'

const webpack = require('webpack')
const { merge } = require('webpack-merge')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const safePostCssParser = require('postcss-safe-parser')
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin')

const config = require('../config')
const { GLOB } = require('../config/const')
const { getLibraryExportName } = require('../lib/getLibraryExportName')
const { banner } = require('../lib/utils')
const { getEntries } = require('../lib/entry')
const shouldUseSourceMap = config.build.sourceMap
const SpeedMeasurePlugin = require('speed-measure-webpack-plugin')
const smp = new SpeedMeasurePlugin({
  disable: !process.env.MEASURE
})

/**
 * 生成生产配置
 * @param  {String} options   lib 打包配置
 * @param  {String} context   构建上下文
 * @return {Object}           webpack 配置对象
 */
module.exports = function(options, context) {
  const baseWebpackConfig = require('./webpack.base.conf')(context, 'lib')
  const { name: pkgName, version: pkgVersion } = require(config.paths
    .packageJson)

  // 优先取外部注入的 version
  const buildVersion = context.version || pkgVersion
  const libraryName = getLibraryExportName(
    options.format,
    config.library || pkgName
  )

  const webpackConfig = merge(baseWebpackConfig, {
    mode: options.mode || 'production',
    // 在第一个错误出错时抛出，而不是无视错误
    bail: true,
    entry: getEntries(GLOB.LIB_ENTRY),
    devtool: shouldUseSourceMap ? 'source-map' : false,
    output: {
      path: config.paths.lib,
      publicPath: context.publicPath,
      filename: options.filename,
      library: libraryName,
      // https://doc.webpack-china.org/configuration/output/#output-librarytarget
      libraryTarget: options.format
    },
    optimization: {
      minimizer: [
        options.minify &&
          new TerserPlugin({
            terserOptions: {
              parse: {
                // we want terser to parse ecma 8 code. However, we don't want it
                // to apply any minfication steps that turns valid ecma 5 code
                // into invalid ecma 5 code. This is why the 'compress' and 'output'
                // sections only apply transformations that are ecma 5 safe
                // https://github.com/facebook/create-react-app/pull/4234
                ecma: 8
              },
              compress: {
                ecma: 5,
                warnings: false,
                // Disabled because of an issue with Uglify breaking seemingly valid code:
                // https://github.com/facebook/create-react-app/issues/2376
                // Pending further investigation:
                // https://github.com/mishoo/UglifyJS2/issues/2011
                comparisons: false,
                // Disabled because of an issue with Terser breaking valid code:
                // https://github.com/facebook/create-react-app/issues/5250
                // Pending futher investigation:
                // https://github.com/terser-js/terser/issues/120
                inline: 2
              },
              mangle: {
                safari10: true
              },
              output: {
                ecma: 5,
                comments: false,
                // Turned on because emoji and regex is not minified properly using default
                // https://github.com/facebook/create-react-app/issues/2488
                ascii_only: true
              }
            },
            // Use multi-process parallel running to improve the build speed
            // Default number of concurrent runs: os.cpus().length - 1
            parallel: true,
            // Enable file caching
            cache: true,
            sourceMap: shouldUseSourceMap
          }),
        new OptimizeCSSAssetsPlugin({
          cssProcessorOptions: {
            parser: safePostCssParser,
            map: shouldUseSourceMap
              ? {
                  // `inline: false` forces the sourcemap to be output into a
                  // separate file
                  inline: false,
                  // `annotation: true` appends the sourceMappingURL to the end of
                  // the css file, helping the browser find the sourcemap
                  annotation: true
                }
              : false
          },
          canPrint: false // 不显示通知
        })
      ].filter(Boolean)
    },
    plugins: [
      new webpack.BannerPlugin({
        banner: banner(buildVersion), // 其值为字符串，将作为注释存在
        entryOnly: true // 如果值为 true，将只在入口 chunks 文件中添加
      }),
      new MiniCssExtractPlugin({
        filename: options.minify ? 'style.min.css' : 'style.css'
      })
    ].filter(Boolean),
    // lib 打包排除第三方库
    externals: {
      jquery: 'jQuery',
      vue: 'Vue',
      zepto: 'Zepto',
      react: 'React',
      'react-dom': 'ReactDom'
    }
  })

  return smp.wrap(webpackConfig)
}
