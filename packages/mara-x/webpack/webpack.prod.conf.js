'use strict'

const fs = require('fs')
const path = require('path')
const webpack = require('webpack')
const merge = require('webpack-merge')
const chalk = require('chalk')
const { localIp, isObject } = require('@mara/devkit')
const TerserPlugin = require('terser-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const safePostCssParser = require('postcss-safe-parser')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const moduleDependency = require('sinamfe-webpack-module_dependency')
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin')
const InlineChunkHtmlPlugin = require('react-dev-utils/InlineChunkHtmlPlugin')
const InterpolateHtmlPlugin = require('react-dev-utils/InterpolateHtmlPlugin')

// const { HybridCommonPlugin } = require('../lib/hybrid')
const { banner, rootPath, getEntryPoints } = require('../lib/utils')
const BuildProgressPlugin = require('../lib/BuildProgressPlugin')
const InlineUmdHtmlPlugin = require('../lib/InlineUmdHtmlPlugin')
const { GLOB, VIEWS_DIR, DLL_DIR, TARGET } = require('../config/const')
const ManifestPlugin = require('../lib/hybrid/ManifestPlugin')
const BuildJsonPlugin = require('../lib/BuildJsonPlugin')
const ZenJsPlugin = require('../lib/ZenJsPlugin')
const config = require('../config')

const shouldUseSourceMap = !!config.build.sourceMap

/**
 * 生成生产配置
 * @param  {String} context   构建上下文
 * @param  {String} spinner   loading
 * @return {Object}           webpack 配置对象
 */
module.exports = function(context, spinner) {
  const entry = context.entry
  const distPageDir = `${config.paths.dist}/${entry}`
  const baseWebpackConfig = require('./webpack.base.conf')(context, 'build')
  const htmlTemplatePath = `${config.paths.views}/${entry}/index.html`
  const hasHtml = fs.existsSync(htmlTemplatePath)
  const servantEntry = getEntryPoints(
    `${VIEWS_DIR}/${entry}/${GLOB.SERVANT_ENTRY}`
  )

  const jscorePath = path.join(
    `${config.paths.views}/${entry}`,
    'jscore.index.js'
  )
  const jscoreEntry = {}
  if (fs.existsSync(jscorePath)) {
    const polyPath = require.resolve("../lib/jscore-poly.js");
    jscoreEntry.jscore = [polyPath ,jscorePath]
  }

  const debugLabel = config.debug ? '.debug' : ''
  const isHybridMode = context.target === TARGET.APP
  const shouldUseZenJs = config.compiler.zenJs && context.target != TARGET.APP

  // 优先取外部注入的 version
  const buildVersion =
    context.version || require(config.paths.packageJson).version

  // https://github.com/survivejs/webpack-merge
  const webpackConfig = merge(baseWebpackConfig, {
    mode: 'production',
    // 在第一个错误出错时抛出，而不是无视错误
    bail: true,
    devtool: shouldUseSourceMap ? 'source-map' : false,
    // merge base.config entry
    entry: { ...servantEntry, ...jscoreEntry },
    output: {
      path: distPageDir,
      publicPath: context.publicPath,
      // 保持传统，非 debug 的 main js 添加 min 后缀
      filename: config.hash.main
        ? `static/js/[name].[contenthash:8]${debugLabel}.js`
        : `static/js/[name]${debugLabel || '.min'}.js`,
      chunkFilename: config.hash.chunk
        ? `static/js/[name].[contenthash:8].chunk${debugLabel}.js`
        : `static/js/[name].chunk${debugLabel}.js`,
      // Point sourcemap entres to original disk location (format as URL on Windows)
      devtoolModuleFilenameTemplate: info =>
        path
          .relative(config.paths.src, info.absoluteResourcePath)
          .replace(/\\/g, '/')
    },
    // 放在单独的 prod.conf 中，保持 base.conf 通用性
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
      ],
      // Keep the runtime chunk seperated to enable long term caching
      // https://twitter.com/wSokra/status/969679223278505985
      // set false until https://github.com/webpack/webpack/issues/6598 be resolved
      runtimeChunk: false
    },
    plugins: [
      // 由于 base.conf 会被外部引用，在一些情况下不需要 ProgressPlugin
      // 因此独立放在 prod.conf 中
      spinner &&
        new BuildProgressPlugin({
          spinner,
          name: 'Building',
          type: config.marax.progress
        }),
      hasHtml &&
        new HtmlWebpackPlugin({
          // prod 模式以 index.html 命名输出
          filename: 'index.html',
          // 每个html的模版，这里多个页面使用同一个模版
          template: htmlTemplatePath,
          // 自动将引用插入html
          inject: true,
          minify: {
            removeRedundantAttributes: true,
            useShortDoctype: true,
            removeEmptyAttributes: true,
            removeStyleLinkTypeAttributes: true,
            keepClosingSlash: true,
            minifyJS: true,
            minifyCSS: true,
            minifyURLs: true
          }
        }),
      hasHtml && new InlineUmdHtmlPlugin(HtmlWebpackPlugin),
      hasHtml && shouldUseZenJs && new ZenJsPlugin(HtmlWebpackPlugin),
      hasHtml &&
        new InlineChunkHtmlPlugin(HtmlWebpackPlugin, [/runtime~.+[.]js/]),
      hasHtml &&
        new InterpolateHtmlPlugin(HtmlWebpackPlugin, context.buildEnv.raw),
      new MiniCssExtractPlugin({
        // 保持传统，非 debug 的 main css 添加 min 后缀
        filename: config.hash.main
          ? `static/css/[name].[contenthash:8]${debugLabel}.css`
          : `static/css/[name]${debugLabel || '.min'}.css`,
        chunkFilename: config.hash.chunk
          ? `static/css/[name].[contenthash:8].chunk${debugLabel}.css`
          : `static/css/[name].chunk${debugLabel}.css`
      }),
      // hybrid 共享包
      // 创建 maraContext
      // new HybridCommonPlugin(),

      // 【争议】：lib 模式禁用依赖分析?
      new moduleDependency({
        emitError: config.compiler.checkDuplicatePackage
      }),
      new webpack.BannerPlugin({
        banner: banner(buildVersion, context.target), // 其值为字符串，将作为注释存在
        entryOnly: false // 如果值为 true，将只在入口 chunks 文件中添加
      }),
      new BuildJsonPlugin({
        debug: config.debug,
        target: context.target,
        env: config.deployEnv,
        version: buildVersion,
        marax: require(config.paths.maraxPackageJson).version
      }),
      new ManifestPlugin({
        entry,
        version: context.version,
        target: context.target
      }),
      ...copyPublicFiles(entry, distPageDir)
    ].filter(Boolean)
  })

  // 预加载
  if (config.prerender) {
    const PrerenderSPAPlugin = require('prerender-html-plugin')
    const Renderer = PrerenderSPAPlugin.PuppeteerRenderer

    new PrerenderSPAPlugin({
      // 生成文件的路径，也可以与webpakc打包的一致。
      // 这个目录只能有一级，如果目录层次大于一级，在生成的时候不会有任何错误提示，在预渲染的时候只会卡着不动。
      entry: `${entry}`,

      staticDir: path.join(rootPath(`dist`), `${entry}`),

      outputDir: path.join(rootPath(`dist`), `${entry}`),

      // 对应自己的路由文件，比如index有参数，就需要写成 /index/param1。
      routes: ['/'],

      // 这个很重要，如果没有配置这段，也不会进行预编译
      renderer: new Renderer({
        inject: {
          foo: 'bar'
        },
        headless: false,
        // 在 main.js 中 document.dispatchEvent(new Event('render-event'))，两者的事件名称要对应上。
        renderAfterDocumentEvent: 'render-event'
      })
    })
  }

  const vendorConf = config.vendor || []
  if (Object.keys(vendorConf).length) {
    if (isObject(vendorConf) && !vendorConf.libs) {
      console.log(
        chalk.yellow(
          'Build skip, vendor.libs is undefined. Please check marauder.config.js'
        )
      )
      process.exit(0)
    }

    let manifest = ''
    // 为多页面准备，生成 xxx_vender 文件夹
    const namespace = config.vendor.name ? `${config.vendor.name}_` : ''

    try {
      manifest = require(`${config.paths.dll}/${namespace}manifest.json`)
    } catch (err) {
      console.log(
        chalk.yellow(
          `${DLL_DIR}/${namespace}manifest.json 未生成，请执行 npm run dll\n`
        )
      )
      process.exit(1)
    }

    webpackConfig.plugins.push(
      new webpack.DllReferencePlugin({
        manifest: manifest
      })
    )
  }

  // bundle 大小分析
  if (config.build.report || config.build.writeStatsJson) {
    const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')

    webpackConfig.plugins.push(
      new BundleAnalyzerPlugin({
        logLevel: 'warn',
        analyzerHost: localIp(),
        defaultSizes: 'gzip',
        analyzerMode: config.build.report ? 'server' : 'disabled',
        statsFilename: 'build-stats.json',
        generateStatsFile: config.build.writeStatsJson
      })
    )
  }

  // @TODO publish npm module
  // 生成serviceworker
  // if (config.sw) {
  //   const webpackWS = require('@mfelib/webpack-create-serviceworker')
  //   const swConfig = config.sw_config || {}
  //   webpackConfig.plugins.push(new webpackWS(swConfig))
  // }

  // 重要：确保 zip plugin 在插件列表末尾
  if (isHybridMode) {
    const ZipPlugin = require('zip-webpack-plugin')
    webpackConfig.plugins.push(
      new ZipPlugin({
        // OPTIONAL: defaults to the Webpack output filename (above) or,
        // if not present, the basename of the path
        filename: entry,
        extension: 'php',
        // OPTIONAL: defaults to including everything
        // can be a string, a RegExp, or an array of strings and RegExps
        //   include: [/\.js$/],
        // OPTIONAL: defaults to excluding nothing
        // can be a string, a RegExp, or an array of strings and RegExps
        // if a file matches both include and exclude, exclude takes precedence
        exclude: [
          /__MACOSX$/,
          /.DS_Store$/,
          /dependencyGraph.json$/,
          /build.json$/,
          /js.map$/,
          /css.map$/
        ],
        // yazl Options
        // OPTIONAL: see https://github.com/thejoshwolfe/yazl#addfilerealpath-metadatapath-options
        fileOptions: {
          mtime: new Date(),
          mode: 0o100664,
          compress: true,
          forceZip64Format: false
        },
        // OPTIONAL: see https://github.com/thejoshwolfe/yazl#endoptions-finalsizecallback
        zipOptions: {
          forceZip64Format: false
        }
      })
    )
  }

  return webpackConfig
}

function copyPublicFiles(entry, distPageDir) {
  const localPublicDir = rootPath(`${config.paths.views}/${entry}/public`)
  const plugins = []

  function getCopyOption(src) {
    return {
      from: src,
      // 放置于根路径
      to: distPageDir,
      // 忽略 manifest.json
      // 交由 maraManifestPlugin 处理
      ignore: ['.*', 'manifest.json']
    }
  }

  // 全局 public
  if (fs.existsSync(config.paths.public)) {
    plugins.push(new CopyWebpackPlugin([getCopyOption(config.paths.public)]))
  }

  // 页面级 public，能够覆盖全局 public
  if (fs.existsSync(localPublicDir)) {
    plugins.push(new CopyWebpackPlugin([getCopyOption(localPublicDir)]))
  }

  return plugins
}
