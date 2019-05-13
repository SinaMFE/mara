'use strict'

const { TYPE } = require('../core/const')

function isEslintError(e) {
  return e.originalStack.some(
    stackframe =>
      stackframe.fileName && stackframe.fileName.indexOf('eslint-loader') > 0
  )
}

function transform(error) {
  if (isEslintError(error)) {
    return Object.assign({}, error, {
      name: 'Lint error',
      type: TYPE.LINT_ERROR
    })
  }

  return error
}

module.exports = transform
