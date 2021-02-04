const fs = require('fs')
const os = require('os')
const codeFrame = require('@babel/code-frame').codeFrameColumns
const chalk = require('chalk')
const concat = require('../utils').concat
const { TYPE } = require('../core/const')
const formatTitle = require('../utils/colors').formatTitle

function tsFormatter(severity, issue) {
  const { origin, file, line, character } = issue

  const colors = new chalk.constructor()
  const messageColor = severity === 'warning' ? colors.yellow : colors.red

  const source = file && fs.existsSync(file) && fs.readFileSync(file, 'utf-8')
  const frame = source
    ? codeFrame(
        source,
        { start: { line: line, column: character } },
        { highlightCode: true }
      )
        .split('\n')
        .map(str => '  ' + str)
        .join(os.EOL)
    : ''
  const code = messageColor.underline(`TS${issue.code}`)
  const message = `TypeScript Error: ${issue.message}(${line},${character})  ${code}`

  return [message, '', frame].join(os.EOL)
}

function displayError(severity, error) {
  const baseError = formatTitle(severity, severity)
  const message = tsFormatter(severity, error.webpackError)

  return concat(`${baseError} in ${error.file}`, '', message, '')
}

function isTsError(error) {
  return isTypeError(error)
}

function isTypeError(error) {
  return error.type === TYPE.TS_TYPE_ERROR
}

function removeVueTsSuffix(error) {
  error.file = error.file.replace(/\.vue\.ts$/i, '.vue')
  error.webpackError.file = error.file

  return error
}

function format(errors, severity) {
  const tsErrors = errors.filter(isTsError)

  return tsErrors.reduce((accum, error) => {
    error = removeVueTsSuffix(error)

    return accum.concat(displayError(severity, error))
  }, [])
}

module.exports = format
