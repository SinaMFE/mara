'use strict'

const { TYPE } = require('../core/const')

function isTypeError(webpackError) {
  return webpackError.origin === 'typescript'
}

function transform(error) {
  const webpackError = error.webpackError || {}

  if (isTypeError(webpackError)) {
    return Object.assign({}, error, {
      message: webpackError.message,
      type: TYPE.TS_TYPE_ERROR,
      severity: 950,
      name: 'Type error'
    })
  }

  return error
}

module.exports = transform
