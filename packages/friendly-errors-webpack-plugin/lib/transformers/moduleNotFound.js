'use strict'

const { TYPE } = require('../core/const')
const errorRE = /Can't resolve '(.*loader)'/

function isModuleNotFoundError(e) {
  const webpackError = e.webpackError || {}

  return (
    webpackError.dependencies &&
    webpackError.dependencies.length > 0 &&
    e.name === 'ModuleNotFoundError' &&
    e.message.indexOf('Module not found') === 0 &&
    // loader 错误在单独的逻辑中处理
    !errorRE.test(e.message)
  )
}

function transform(error) {
  const webpackError = error.webpackError
  if (isModuleNotFoundError(error)) {
    const module = webpackError.dependencies[0].request
    return Object.assign({}, error, {
      message: `Module not found ${module}`,
      type: TYPE.MODULE_NOT_FOUND,
      severity: 900,
      module,
      name: 'Module not found'
    })
  }

  return error
}

module.exports = transform
