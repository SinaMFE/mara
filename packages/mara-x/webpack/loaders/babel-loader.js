'use strict'

const path = require('path')
const merge = require('webpack-merge')
const config = require('../../config')
const paths = config.paths
const getCacheIdentifier = require('../../lib/getCacheIdentifier')
const inlineJson = require.resolve('../../lib/babelInlineJson')
const { isInstalled } = require('../../lib/utils')
const plugins = [
  // https://github.com/tc39/proposal-optional-chaining
  require.resolve('@babel/plugin-proposal-optional-chaining'),
  // https://github.com/tc39/proposal-nullish-coalescing
  require.resolve('@babel/plugin-proposal-nullish-coalescing-operator')
].concat(config.babelPlugins)

// 支持对依赖模块进行正则或字符串匹配
function nodeModulesRegExp(...args) {
  // path.sep 指定平台特定的分隔符
  // Windows: \   POSIX: /
  // 参考：http://nodejs.cn/api/path.html#path_path_sep
  return args
    .reduce((res, item) => res.concat(item), [])
    .map(condition => {
      if (condition instanceof RegExp) {
        // 由于要拼接为新的正则，因此去除 ^
        condition = condition.source.replace(/^\^/, '')

        return new RegExp(`node_modules\\${path.sep}${condition}`)
      }

      // 当为字符串时，严格匹配包名
      return new RegExp(`node_modules\\${path.sep}${condition}\\${path.sep}`)
    })
}

// 加入了 inline-json，用于去除编译时的引入json（非全量引入）。
// plugins.push(['inline-json', { matchPattern: '.' }])

const baseLoader = isProd => ({
  loader: require.resolve('babel-loader'),
  options: {
    customize: require.resolve('babel-preset-react-app/webpack-overrides'),
    babelrc: false,
    configFile: false,
    presets: [
      [
        require.resolve('babel-preset-react-app'),
        // 为了避免引入不必要的插件
        // 需要判断安装 flow-bin 后，启用 flow 语法支持
        { flow: isInstalled('flow-bin'), typescript: true }
      ]
    ],
    // 严格确保缓存标识唯一
    cacheIdentifier: getCacheIdentifier([
      'babel-preset-react-app',
      'react-dev-utils'
    ]),
    // `babel-loader` 特性
    // 在 ./node_modules/.cache/babel-loader/ 中缓存执行结果
    // 提升性能
    cacheDirectory: true,
    cacheCompression: isProd,
    compact: isProd,
    highlightCode: true
  }
})

function babelLoader(isProd, useTypeScript) {
  // 对 src 以及 node_modules 中的指定包进行 ts 等全量处理
  const appLoader = {
    test: /\.(js|mjs|jsx|ts|tsx)$/,
    include: [paths.src, ...nodeModulesRegExp(config.esm)],
    options: {
      plugins,
      overrides: [
        // https://devblogs.microsoft.com/typescript/typescript-and-babel-7/
        // 确保 @babel/plugin-transform-typescript 在其他插件之前
        // 适配 https://github.com/babel/babel/commit/2b648c9f23cdfdf5077991dd475c6d47c1261f5b
        useTypeScript && {
          test: /\.vue$/,
          plugins: [require('@babel/plugin-transform-typescript').default]
        },
        {
          plugins: [
            [
              require('@babel/plugin-proposal-decorators').default,
              { legacy: true }
            ]
          ]
        }
      ].filter(Boolean)
    }
  }

  // 对 node_modules 中的 js 资源附加处理
  const depLoader = {
    test: /\.m?js$/,
    // 排除框架，加速构建
    exclude: [
      /@babel(?:\/|\\{1,2})runtime/,
      // 排除框架资源，加速构建
      ...nodeModulesRegExp(['vue', 'react', 'react-dom'])
    ],
    loader: require.resolve('babel-loader'),
    options: {
      babelrc: false,
      configFile: false,
      presets: [
        [
          require.resolve('babel-preset-react-app/dependencies'),
          { helpers: true }
        ]
      ],
      // 严格确保缓存标识唯一
      cacheIdentifier: getCacheIdentifier([
        'babel-preset-react-app',
        'react-dev-utils'
      ]),
      // `babel-loader` 特性
      // 在 ./node_modules/.cache/babel-loader/ 中缓存执行结果
      // 提升性能
      cacheDirectory: true,
      cacheCompression: isProd,
      compact: false,
      sourceMaps: false
    }
  }

  return [merge(baseLoader(isProd), appLoader), depLoader]
}

module.exports = babelLoader
