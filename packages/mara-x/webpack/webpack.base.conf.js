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
const tsImportPluginFactory = require('ts-import-plugin')

const getStyleLoaders = require('./loaders/style-loader')
const getCacheIdentifier = require('../libs/getCacheIdentifier')
const config = require('../config')
const C = require('../config/const')
const {
  babelLoader,
  babelForTs,
  babelExternalMoudles
} = require('./loaders/babel-loader')
const {
  vueLoaderOptions,
  vueLoaderCacheConfig
} = require('./loaders/vue-loader.conf')
const { getEntries, rootPath, isInstalled } = require('../libs/utils')
const paths = config.paths

module.exports = function({ entry, buildEnv, publicPath }) {
  const isDev = process.env.NODE_ENV === 'development'
  const isProd = process.env.NODE_ENV === 'production'

  const isLib = entry === '__LIB__'
  const assetsDir = isLib ? '' : 'static/'
  const entryGlob = `${C.VIEWS_DIR}/${entry}/index.@(ts|tsx|js|jsx)`
  const useTypeScript = config.useTypeScript
  const { vueRuntimeOnly } = config.compiler
  const tsCompilerOptions = {
    // 输出 ESM 模块系统代码，交由 babel 二次编译
    module: 'esnext',
    // 输出最新语法，交由 babel 二次编译
    target: 'esnext',
    moduleResolution: 'node',
    resolveJsonModule: true,
    noEmit: true,
    // https://www.tslang.cn/docs/handbook/jsx.html
    // 保留 jsx 语法格式，交由 babel 做后续处理
    jsx: 'preserve'
  }

  const extensions = ['.mjs', '.js', '.ts', '.tsx', '.jsx', '.vue', '.json']

  let tsImportLibs = []
  if (config.tsImportLibs) {
    if (Array.isArray(config.tsImportLibs)) {
      tsImportLibs = config.tsImportLibs
    } else {
      throw Error('marauder.config.js 中的 tsImportLibs 必须是 Array 类型！')
    }
  }

  const baseConfig = {
    // dev, build 环境依赖 base.entry，务必提供
    entry: getEntries(entryGlob, require.resolve('./polyfills')),
    output: {
      path: paths.dist,
      filename: 'static/js/[name].js',
      chunkFilename: 'static/js/[name].chunk.js'
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
      modules: ['node_modules'],
      alias: {
        // 使用 `~` 作为 src 别名
        // 使用特殊符号防止与 npm 包冲突
        // import '~/css/style.css'
        '~': paths.src,
        vue$: `vue/dist/vue${vueRuntimeOnly ? '.runtime' : ''}.esm.js`
      },
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
          oneOf: getStyleLoaders({
            importLoaders: 1,
            cssPublicPath: publicPath
          })
        },
        {
          test: /\.module\.css$/,
          oneOf: getStyleLoaders({
            importLoaders: 1,
            modules: true,
            cssPublicPath: publicPath,
            getLocalIdent: getCSSModuleLocalIdent
          })
        },
        {
          test: /\.less$/,
          oneOf: getStyleLoaders(
            {
              importLoaders: 2,
              cssPublicPath: publicPath
            },
            'less-loader'
          )
        },
        {
          test: /\.(scss|sass)$/,
          oneOf: getStyleLoaders(
            {
              importLoaders: 2,
              cssPublicPath: publicPath
            },
            'sass-loader'
          )
        },
        {
          test: /\.ejs$/,
          loader: require.resolve('marauder-ejs-loader')
        },
        {
          test: /\.art$/,
          loader: require.resolve('art-template-loader')
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
        // {
        //   test: /\.tsx?$/,
        //   include: babelExternalMoudles,
        //   use: [
        //     {
        //       loader: require.resolve('cache-loader'),
        //       options: {
        //         cacheDirectory: rootPath('node_modules/.cache/ts-loader'),
        //         cacheIdentifier: getCacheIdentifier(['ts-loader', 'typescript'])
        //       }
        //     },
        //     babelForTs(isProd),
        //     {
        //       loader: require.resolve('ts-loader'),
        //       options: {
        //         appendTsSuffixTo: ['\\.vue$'],
        //         // disable type checker
        //         // 起到加速作用
        //         // transpileOnly: true,
        //         // https://webpack.docschina.org/guides/build-performance/#typescript-loader
        //         experimentalWatchApi: isDev,
        //         getCustomTransformers: tsImportLibs.length
        //           ? () => ({
        //               before: [tsImportPluginFactory(tsImportLibs)]
        //             })
        //           : undefined,
        //         compilerOptions: tsCompilerOptions,
        //         // 仅打包被 webpack 加载的模块
        //         onlyCompileBundledFiles: true,
        //         allowTsInNodeModules: true,
        //         errorFormatter: error => {
        //           // ForkTsCheckerWebpackPlugin 使用 `diagnostic` 标识 ts 错误
        //           // 这里同样指定 type，方便错误归类
        //           return Object.assign({}, error, { type: 'diagnostic' })
        //         }
        //         // https://github.com/TypeStrong/ts-loader#happypackmode-boolean-defaultfalse
        //         // happyPackMode: useThreads
        //       }
        //     }
        //   ]
        // },
        {
          test: /\.(bmp|png|jpe?g|gif|webp)(\?.*)?$/,
          loader: require.resolve('url-loader'),
          options: {
            limit: 1024 * 4,
            tinifyKeys: config.tinifyKeys,
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
            name: `${assetsDir}fonts/[name].[hash:8].[ext]`
          }
        },
        {
          test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
          loader: require.resolve('file-loader'),
          options: {
            name: `${assetsDir}media/[name].[contenthash:8].[ext]`
          }
        }
      ]
    },
    plugins: [
      // This gives some necessary context to module not found errors, such as
      // the requesting resource.
      new ModuleNotFoundPlugin(paths.app),
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
          typescript: resolve.sync('typescript', {
            basedir: paths.nodeModules
          }),
          vue: true,
          async: isDev,
          // 在 vue 模式下存在 bug，这里保持默认行为（vue 下禁用）
          // https://github.com/Realytics/fork-ts-checker-webpack-plugin/issues/219
          // useTypescriptIncrementalApi: true,
          checkSyntacticErrors: true,
          tsconfig: paths.tsConfig,
          compilerOptions: tsCompilerOptions,
          reportFiles: [
            // 检查范围缩小到 src，屏蔽第三方模块的错误
            'src/**',
            '!**/*.json',
            '!**/__tests__/**',
            '!**/?(*.)(spec|test).*',
            '!**/src/setupProxy.*',
            '!**/src/setupTests.*'
          ],
          watch: paths.src,
          silent: true,
          formatter: isProd ? tsFormatter : undefined
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
      fs: 'empty',
      http2: 'empty',
      net: 'empty',
      tls: 'empty',
      child_process: 'empty'
    },
    // 禁用包体积性能警告
    performance: {
      hints: false
    }
  }

  if (!isLib && isInstalled('@mara/plugin-extract-comp-meta')) {
    const VueMetaPlugin = require('@mara/plugin-extract-comp-meta/lib/vue-meta-plugin')
    baseConfig.plugins.push(new VueMetaPlugin({ entry }))
  }

  return baseConfig
}
