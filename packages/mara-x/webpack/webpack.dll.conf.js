'use strict'

const webpack = require('webpack')
const config = require('../config')
const { isObject } = require('@mara/devkit')
const TerserPlugin = require('terser-webpack-plugin')
const babelLoader = require('./loaders/babel-loader')
const library = '[name]_lib'
const SpeedMeasurePlugin = require('speed-measure-webpack-plugin')
const smp = new SpeedMeasurePlugin({
  disable: !process.env.MEASURE
})

// 支持两种格式配置
// 数组 vendor: ['react', 'react-dom']
// 对象 vendor: {libs: ['react', 'react-dom']}
const vendor = isObject(config.vendor) ? config.vendor.libs : config.vendor
// 为多页面准备，生成 xxx_vender 文件夹
const namespace = config.vendor.name ? `${config.vendor.name}_` : ''

/**
 * dll 配置
 * @param  {String} context   构建上下文
 * @return {Object}           webpack 配置对象
 */
module.exports = function buildDll(context) {
  const webpackBaseConf = require('./webpack.base.conf')(context)

  return smp.wrap({
    mode: 'production',
    entry: {
      vendor
    },
    output: {
      filename: '[name].dll.js',
      path: `${config.paths.dist}/${namespace}vendor`,
      library
    },
    optimization: {
      minimize: config.debug !== true,
      minimizer: [
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
          sourceMap: false
        })
      ],
      // Keep the runtime chunk seperated to enable long term caching
      // https://twitter.com/wSokra/status/969679223278505985
      // set false until https://github.com/webpack/webpack/issues/6598 be resolved
      runtimeChunk: false
    },
    resolve: webpackBaseConf.resolve,
    module: {
      rules: [
        {
          // Process JS with Babel.
          oneOf: babelLoader(true)
        }
      ]
    },
    plugins: [
      new webpack.DefinePlugin(context.buildEnv.stringified),
      new webpack.DllPlugin({
        path: `${config.paths.dll}/${namespace}manifest.json`,
        // This must match the output.library option above
        name: library
      })
    ],
    node: {
      // prevent webpack from injecting useless setImmediate polyfill because Vue
      // source contains it (although only uses it if it's native).
      setImmediate: false,
      module: 'empty',
      dgram: 'empty',
      fs: 'empty',
      net: 'empty',
      tls: 'empty',
      child_process: 'empty'
    },
    performance: {
      hints: false
    }
  })
}
