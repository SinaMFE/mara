const TYPE = 'cant-resolve-loader'
const errorRE = /Can't resolve '(.*loader)'/

function isResolveLoaderError(webpackError) {
  return webpackError && webpackError.message
}

function transform(error) {
  const webpackError = error.webpackError || {}

  if (isResolveLoaderError(webpackError)) {
    const match = webpackError.message.match(errorRE)

    if (match) {
      return Object.assign({}, error, {
        type: TYPE,
        loader: match[1]
      })
    }
  }

  return error
}

module.exports = transform
