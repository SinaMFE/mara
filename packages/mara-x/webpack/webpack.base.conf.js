'use strict'

const webpack = require('webpack')
// PnpWebpackPlugin 即插即用，要使用 require.resolve 解析 loader 路径
const PnpWebpackPlugin = require('pnp-webpack-plugin')
const ModuleScopePlugin = require('react-dev-utils/ModuleScopePlugin')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')
const tsFormatter = require('react-dev-utils/typescriptFormatter')
const ModuleNotFoundPlugin = require('react-dev-utils/ModuleNotFoundPlugin')
const { resolve } = require('@mara/devkit')
const getCSSModuleLocalIdent = require('react-dev-utils/getCSSModuleLocalIdent')
const VueLoaderPlugin = require('vue-loader/lib/plugin')

const getStyleLoaders = require('./loaders/style-loader')
const { SinaHybridPlugin, getCommonPkgConf } = require('../lib/hybrid')
const config = require('../config')
const { GLOB, VIEWS_DIR, TARGET } = require('../config/const')
const babelLoader = require('./loaders/babel-loader')
const {
  vueLoaderOptions,
  vueLoaderCacheConfig
} = require('./loaders/vue-loader.conf')
const { isInstalled } = require('../lib/utils')
const { getEntries } = require('../lib/entry')
const workspaceResolution = require('../lib/workspaceResolution')
const paths = config.paths

module.exports = function(
  { entry, views, buildEnv, target, publicPath, version, useCommonPkg },
  cmd
) {
  const isDev = process.env.NODE_ENV === 'development'
  const isProd = process.env.NODE_ENV === 'production'
  const isLib = cmd === 'lib'
  const isDevOrBuildCmd = cmd === 'dev' || cmd === 'build'
  const isHybridMode = config.isHybridMode
  const assetsDir = isLib ? '' : 'static/'
  const entryGlob = `${VIEWS_DIR}/${entry}/${GLOB.MAIN_ENTRY}`
  const useTypeScript = config.useTypeScript
  const { vueRuntimeOnly, jsonpFunction } = config.compiler
  const tsCompilerOptions = {
    // 输出 ESM 模块系统代码，交由 babel 二次编译
    module: 'esnext',
    // 输出最新语法，交由 babel 二次编译
    target: 'esnext',
    moduleResolution: 'node',
    skipLibCheck: true,
    sourceMap: false,
    inlineSourceMap: false,
    declarationMap: false,
    resolveJsonModule: true,
    noEmit: true,
    // https://www.tslang.cn/docs/handbook/jsx.html
    // 保留 jsx 语法格式，交由 babel 做后续处理
    jsx: 'preserve'
  }
  const tsCheckerExclude = views
    .filter(v => v != entry)
    .map(v => `${VIEWS_DIR}/${v}`)

  // react native web 为 .web. 后缀
  const extensions = [
    '.web.mjs',
    '.mjs',
    '.web.js',
    '.js',
    '.web.ts',
    '.ts',
    '.web.tsx',
    '.tsx',
    '.web.jsx',
    '.jsx',
    '.vue',
    '.json'
  ]

  // 统一设置 loaders 配置
  getStyleLoaders.publicPath = publicPath
  getStyleLoaders.isLib = isLib

  let externals = [config.compiler.externals]
  let entryConf = {}
  let commonPkgPath = ''
  let pkgMaps = []

  useCommonPkg = isDevOrBuildCmd && useCommonPkg

  const baseAlias = {
    // 使用 `~` 作为 src 别名
    // 使用特殊符号防止与 npm 包冲突
    // import '~/css/style.css'
    '~': paths.src,
    // 末尾指定 $ 防止误匹配
    'react-native$': 'react-native-web',
    vue$: `vue/dist/vue${vueRuntimeOnly ? '.runtime' : ''}.esm.js`
  }

  // hybrid SDK 提升，以尽快建立 jsbridge
  if (useCommonPkg) {
    const sncConf = getCommonPkgConf(entryGlob, config.isApp)

    // 使用拆分后的 entry 配置
    entryConf = sncConf.entry
    commonPkgPath = sncConf.commonPkgPath
    pkgMaps = sncConf.pkgMaps
    externals.push(...sncConf.externals)
  } else {
    entryConf = getEntries(entryGlob, require.resolve('../lib/polyfills'))
  }

  const baseConfig = {
    // dev, build 环境依赖 base.entry，务必提供
    entry: entryConf,
    output: {
      path: paths.dist,
      jsonpFunction: jsonpFunction,
      filename: 'static/js/[name].js',
      chunkFilename: 'static/js/[name].chunk.js',
      // TODO: remove this when upgrading to webpack 5
      futureEmitAssets: true
    },
    resolve: {
      // disable symlinks
      symlinks: false,
      // js first
      extensions: extensions.filter(
        ext => useTypeScript || !ext.includes('ts')
      ),
      // https://doc.webpack-china.org/configuration/resolve/#resolve-mainfields
      // source 为自定义拓展属性，表示源码入口
      mainFields: ['source', 'browser', 'module', 'main'],
      modules: ['node_modules', paths.nodeModules],
      alias: config.useWorkspace ? workspaceResolution(baseAlias) : baseAlias,
      plugins: [
        // Adds support for installing with Plug'n'Play, leading to faster installs and adding
        // guards against forgotten dependencies and such.
        PnpWebpackPlugin,
        // Prevents users from importing files from outside of src/ (or node_modules/).
        // This often causes confusion because we only process files within src/ with babel.
        // To fix this, we prevent you from importing files out of src/ -- if you'd like to,
        // please link the files into your node_modules/ and let module-resolution kick in.
        // Make sure your source files are compiled, as they will not be processed in any way.
        new ModuleScopePlugin(paths.src, [paths.packageJson])
      ]
    },
    resolveLoader: {
      plugins: [
        // Also related to Plug'n'Play, but this time it tells Webpack to load its loaders
        // from the current package.
        PnpWebpackPlugin.moduleLoader(module)
      ]
    },
    module: {
      // ts 模式输出的 interface 不被识别，
      // 这里不使用严格模式，使构建继续下去
      // https://github.com/webpack/webpack/issues/7378
      strictExportPresence: false,
      noParse: /^(vue|vue-router|vuex|vuex-router-sync)$/,
      rules: [
        // Disable require.ensure as it's not a standard language feature.
        // 为了兼容  bundle-loader 暂时不启用
        // { parser: { requireEnsure: false } },
        {
          test: /\.css$/,
          exclude: /\.module\.css$/,
          oneOf: getStyleLoaders()
        },
        {
          test: /\.module\.css$/,
          oneOf: getStyleLoaders({
            modules: {
              getLocalIdent: getCSSModuleLocalIdent
            }
          })
        },
        {
          test: /\.less$/,
          oneOf: getStyleLoaders('less-loader')
        },
        {
          test: /\.(scss|sass)$/,
          oneOf: getStyleLoaders('sass-loader')
        },
        {
          test: /\.ejs$/,
          loader: require.resolve('marauder-ejs-loader')
        },
        {
          test: /\.art$/,
          loader: 'art-template-loader'
        },
        {
          test: /\.vue$/,
          // loader 总是从右到左地被调用
          use: [
            {
              loader: require.resolve('cache-loader'),
              options: vueLoaderCacheConfig
            },
            {
              loader: require.resolve('vue-loader'),
              options: vueLoaderOptions
            }
          ]
        },
        {
          // Process JS with Babel.
          oneOf: babelLoader(isProd, useTypeScript)
        },
        {
          test: /\.(bmp|png|jpe?g|gif|webp)(\?.*)?$/,
          loader: require.resolve('url-loader'),
          options: {
            limit: config.compiler.base64ImgLimit,
            tinifyKeys: config.tinifyKeys,
            esModule: false,
            minify: isProd,
            fallback: require.resolve('@mara/image-loader'),
            name: `${assetsDir}img/[name].[contenthash:8].[ext]`
          }
        },
        // don't base64-inline SVGs.
        // https://github.com/facebookincubator/create-react-app/pull/1180
        {
          test: /\.(svg)(\?.*)?$/,
          loader: require.resolve('@mara/image-loader'),
          options: {
            minify: isProd,
            name: `${assetsDir}img/[name].[contenthash:8].[ext]`
          }
        },
        {
          test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
          loader: require.resolve('file-loader'),
          options: {
            // 不支持 contenthash
            name: `${assetsDir}fonts/[name].[hash:8].[ext]`,
            esModule: false
          }
        },
        {
          test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
          loader: require.resolve('file-loader'),
          options: {
            name: `${assetsDir}media/[name].[contenthash:8].[ext]`,
            esModule: false
          }
        },
        {
          test: /\.txt$/,
          loader: 'raw-loader'
        }
      ]
    },
    plugins: [
      // This gives some necessary context to module not found errors, such as
      // the requesting resource.
      new ModuleNotFoundPlugin(paths.root),
      // Moment.js is an extremely popular library that bundles large locale files
      // by default due to how Webpack interprets its code. This is a practical
      // solution that requires the user to opt into importing specific locales.
      // https://github.com/jmblog/how-to-optimize-momentjs-with-webpack
      // You can remove this if you don't use Moment.js:
      new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
      !isLib && new webpack.DefinePlugin(buildEnv.stringified),
      new VueLoaderPlugin(),
      // TypeScript type checking
      useTypeScript &&
        new ForkTsCheckerWebpackPlugin({
          typescript: {
            typescriptPath: resolve.sync('typescript', {
              basedir: paths.nodeModules
            }),
            memoryLimit: 1024 * 4,
            configFile: paths.tsConfig,
            configOverwrite: {
              compilerOptions: tsCompilerOptions,
              exclude: tsCheckerExclude
            },
            mode: 'write-references',
            diagnosticOptions: {
              semantic: true,
              syntactic: true
            },
            extensions: {
              vue: true
            }
          },
          logger: {
            infrastructure: 'silent',
            issues: 'silent',
            devServer: true
          },
          issue: {
            include: [{ file: 'src/**/*' }],
            exclude: [{ origin: 'eslint', file: '**/*.spec.ts' }]
          }
        })
    ].filter(Boolean),
    // Some libraries import Node modules but don't use them in the browser.
    // Tell Webpack to provide empty mocks for them so importing them works.
    node: {
      // prevent webpack from injecting useless setImmediate polyfill because Vue
      // source contains it (although only uses it if it's native).
      setImmediate: false,
      module: 'empty',
      dgram: 'empty',
      dns: 'mock',
      fs: 'empty',
      http2: 'empty',
      net: 'empty',
      tls: 'empty',
      child_process: 'empty'
    },
    // 禁用包体积性能警告
    performance: false,
    externals: externals
  }

  if (isDevOrBuildCmd) {
    // Automatically split vendor and commons
    // https://twitter.com/wSokra/status/969633336732905474
    // https://medium.com/webpack/webpack-4-code-splitting-chunk-graph-and-the-splitchunks-optimization-be739a861366
    baseConfig.optimization = {
      splitChunks: {
        chunks(chunk) {
          const isServantOrSNC = /\.servant|__UNI_SNC__/.test(chunk.name)

          // 仅输出 async 包
          // hybrid prod 模式不拆 chunk，减少 IO 损耗
          if (isServantOrSNC || (isHybridMode && isProd)) return false

          return !!config.compiler.splitChunks
        },
        // 一些 CDN 不支持 `~`，因此指定为 `-``
        automaticNameDelimiter: '_',
        name: true
      }
    }

    // 确保在 copy Files 之前
    baseConfig.plugins.push(
      new SinaHybridPlugin(require('html-webpack-plugin'), {
        entry: entry,
        version: version,
        isHybridMode: isHybridMode,
        publicPath: publicPath,
        useCommonPkg: useCommonPkg,
        commonPkgPath: commonPkgPath,
        pkgMaps
      })
    )
  }

  if (!isLib && isInstalled('@mara/plugin-extract-comp-meta')) {
    const VueMetaPlugin = require('@mara/plugin-extract-comp-meta/lib/vue-meta-plugin')

    baseConfig.plugins.push(new VueMetaPlugin({ entry }))
  }

  return baseConfig
}
