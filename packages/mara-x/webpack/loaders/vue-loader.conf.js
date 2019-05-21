'use strict'

const getCacheIdentifier = require('../../lib/getCacheIdentifier')
const { rootPath } = require('../../lib/utils')

const vueLoaderCacheConfig = {
  cacheDirectory: rootPath('node_modules/.cache/vue-loader'),
  cacheIdentifier: getCacheIdentifier([
    'vue-loader',
    '@vue/component-compiler-utils',
    'vue-template-compiler'
  ])
}

const vueLoaderOptions = Object.assign(
  {
    compilerOptions: {
      whitespace: 'condense'
    },
    transformAssetUrls: {
      video: ['src', 'poster'],
      source: 'src',
      img: 'src',
      image: 'xlink:href'
    }
  },
  vueLoaderCacheConfig
)

module.exports = { vueLoaderOptions, vueLoaderCacheConfig }
