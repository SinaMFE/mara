const loaderMap = require('../fix/loaderMap')
const { TYPE } = require('../core/const')
const errorRE = /Can't resolve '(.*loader)'/

function isResolveLoaderError(webpackError) {
  return webpackError && webpackError.message
}

function transform(error) {
  const webpackError = error.webpackError || {}

  if (isResolveLoaderError(webpackError)) {
    const match = webpackError.message.match(errorRE)

    if (match) {
      const loader = match[1]

      return Object.assign({}, error, {
        type: TYPE.CANT_RESOVLE_LOADER,
        fix: loaderMap[loader],
        file: error.file,
        loader: loader
      })
    }
  }

  return error
}

module.exports = transform
