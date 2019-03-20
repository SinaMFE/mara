const path = require('path')
const tsFormatter = require('react-dev-utils/typescriptFormatter')
const concat = require('../utils').concat
const formatTitle = require('../utils/colors').formatTitle

function displayError(severity, error, type) {
  const baseError = formatTitle(severity, severity)
  const filePath = '.' + path.sep + path.relative(process.cwd(), error.file)
  let message = tsFormatter(error.webpackError, true)

  return concat(`${baseError} in ${error.file}`, '', message, '')
}

function isTsError(error) {
  return isTypeError(error) || isSyntaxError(error)
}

function isTypeError(error) {
  return error.type === 'ts-type-error'
}

function isSyntaxError(error) {
  return error.type === 'ts-syntax-error'
}

function removeVueTsSuffix(error) {
  error.file = error.file.replace(/\.vue\.ts$/i, '.vue')
  error.webpackError.file = error.file

  return error
}

function format(errors, severity) {
  return errors.filter(isTsError).reduce((accum, error) => {
    error = removeVueTsSuffix(error)

    if (isTypeError(error)) {
      return accum.concat(displayError(severity, error, 'type'))
    } else {
      return accum.concat(displayError(severity, error, 'syntax'))
    }
  }, [])
}

module.exports = format
