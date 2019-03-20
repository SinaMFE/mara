'use strict'

const path = require('path')
const stripAnsi = require('strip-ansi')
const formatWebpackMessages = require('react-dev-utils/formatWebpackMessages')
const concat = require('../utils').concat
const formatTitle = require('../utils/colors').formatTitle

function cleanMessage(message, filepath) {
  return (
    message
      // match until the last semicolon followed by a space
      // this should match
      // linux => "(SyntaxError: )Unexpected token (5:11)"
      // windows => "(SyntaxError: C:/projects/index.js: )Unexpected token (5:11)"
      .replace(/^Module build failed.*:\s/, 'Syntax Error: ')
      .replace(/SyntaxError*:\s/, '')
      .replace(`${filepath}: `, '')
  )
}

function displayError(severity, error) {
  const baseError = formatTitle(severity, severity)
  let filepath = removeLoaders(error.file)

  filepath = path.join(process.cwd(), filepath)

  return concat(
    `${baseError} in ${filepath}`,
    '',
    cleanMessage(error.message, filepath),
    error.origin ? error.origin : undefined,
    '',
    error.infos
  )
}

function removeLoaders(file) {
  if (!file) return ''

  const split = file.split('!')
  const filePath = split[split.length - 1]

  return filePath.replace('?vue&type=script&lang=ts&', '')
}

function isDefaultError(error) {
  return !error.type
}

/**
 * Format errors without a type
 */
function format(errors, severity) {
  const errs = errors.filter(isDefaultError).map(e => {
    let filepath = removeLoaders(e.file)

    filepath = path.join(process.cwd(), filepath)

    return `${filepath}\n${e.message}`
  })

  let messages = []

  if (severity === 'error') {
    messages = formatWebpackMessages({ errors: errs, warnings: [] }, true)
      .errors
  } else {
    messages = formatWebpackMessages({ errors: [], warnings: errs }, true)
      .warnings
  }

  return messages.map(msg => {
    const lines = msg.split('\n')
    const filepath = stripAnsi(lines[0])
    const content = lines
      .splice(1)
      .join('\n')
      .replace(`${filepath}: `, '')
    const title = `${formatTitle(severity, severity)} in ${filepath}`

    return [title, '', content, ''].join('\n')
  })

  // .reduce((accum, error) => accum.concat(displayError(severity, error)), [])
}

module.exports = format
