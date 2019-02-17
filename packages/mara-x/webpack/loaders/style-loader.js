'use strict'

const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const config = require('../../config')
const isProd = process.env.NODE_ENV === 'production'
const isDev = process.env.NODE_ENV === 'development'
const shouldUseRelativeAssetPaths = config.assetsPublicPath === './'
const shouldExtract = isProd && config.compiler.cssExtract !== false
const shouldUseSourceMap = isProd ? config.build.sourceMap : isDev

function getPostCSSPlugins(useSourceMap, needInlineMinification, preProcessor) {
  const basic = [
    require('postcss-flexbugs-fixes'),
    require('postcss-preset-env')(config.postcss)
  ]
  const advanced = [
    // 提供代码段引入，为了保证引入的代码段能够享受后续的配置
    // 应确保此插件在插件列表中处于第一位
    // https://github.com/postcss/postcss-import
    require('postcss-import')(),
    // 辅助 postcss-import 插件， 解决嵌套层级的图片资源路径问题
    require('postcss-url')()
  ]

  const plugins = preProcessor ? basic : basic.concat(advanced)
  const cssnanoOptions = {
    preset: [
      'default',
      {
        mergeLonghand: false,
        cssDeclarationSorter: false
      }
    ]
  }

  if (useSourceMap) {
    cssnanoOptions.map = { inline: false }
  }

  return needInlineMinification
    ? plugins.concat(require('cssnano')(cssnanoOptions))
    : plugins
}

function createCSSRule(cssOptions = {}, preProcessor) {
  return [
    {
      resourceQuery: /\?vue/, // foo.css?inline
      loader: getStyleLoaders(cssOptions, preProcessor),
      // Don't consider CSS imports dead code even if the
      // containing package claims to have no side effects.
      // Remove this when webpack adds a warning or an error for this.
      // See https://github.com/webpack/webpack/issues/6571
      sideEffects: isProd
    },
    {
      loader: getStyleLoaders(cssOptions, preProcessor),
      sideEffects: isProd
    }
  ]
}

function getStyleLoaders(cssOptions = {}, preProcessor) {
  const needInlineMinification = isProd && !shouldExtract
  const cssPublicPath = cssOptions.library ? './' : '../../'
  const loaders = [
    shouldExtract
      ? {
          loader: MiniCssExtractPlugin.loader,
          options: Object.assign(
            {},
            shouldUseRelativeAssetPaths
              ? { publicPath: cssPublicPath }
              : undefined
          )
        }
      : {
          loader: require.resolve('vue-style-loader'),
          options: Object.assign(
            {
              sourceMap: shouldUseSourceMap
            },
            cssOptions
          )
        },
    {
      loader: require.resolve('css-loader'),
      options: Object.assign(
        {
          sourceMap: shouldUseSourceMap
        },
        cssOptions
      )
    },
    {
      // Options for PostCSS as we reference these options twice
      // Adds vendor prefixing based on your specified browser support in
      // package.json
      loader: require.resolve('postcss-loader'),
      options: {
        // Necessary for external CSS imports to work
        // https://github.com/facebook/create-react-app/issues/2677
        ident: 'postcss',
        plugins: getPostCSSPlugins(
          shouldUseSourceMap,
          needInlineMinification,
          preProcessor
        ),
        sourceMap: shouldUseSourceMap
      }
    }
  ]

  // loader 数组反向加载
  // 确保预处理 loader 在 postcss 之后
  // 以保证实际优先处理
  if (preProcessor) {
    loaders.push({
      loader: preProcessor,
      options: Object.assign(
        {
          sourceMap: shouldUseSourceMap
        },
        cssOptions
      )
    })
  }

  return loaders
}

module.exports = createCSSRule
