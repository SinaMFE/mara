'use strict'

const fs = require('fs')
const path = require('path')
const Ajv = require('ajv')
const ajvKeywords = require('ajv-keywords')

const ValidationError = require('./ValidationError')

const ajv = new Ajv({
  allErrors: true,
  verbose: true
})

ajvKeywords(ajv, ['instanceof'])

const validateObject = (schema, options) => {
  const valid = ajv.validate(schema, options)

  return valid ? [] : reduceErrors(ajv.errors)
}

const reduceErrors = errors => {
  let newErrors = []

  for (const err of errors) {
    const dataPath = err.dataPath
    let children = []

    newErrors = newErrors.filter(oldError => {
      if (oldError.dataPath.includes(dataPath)) {
        if (oldError.children) {
          children = children.concat(oldError.children.slice(0))
        }
        oldError.children = undefined
        children.push(oldError)
        return false
      }
      return true
    })

    if (children.length) {
      err.children = children
    }

    newErrors.push(err)
  }

  return newErrors
}

/**
 * validateOptions
 * @param  {object} schema     json schema
 * @param  {object} options    input options
 * @param  {string} configName
 * @param  {string} binName
 * @return {boolean}
 */
module.exports = (schema, options, configName, binName) => {
  if (typeof schema === 'string') {
    schema = fs.readFileSync(path.resolve(schema), 'utf8')
    schema = JSON.parse(schema)
  }

  const validateErrors = validateObject(schema, options)

  if (validateErrors.length) {
    throw new ValidationError(schema, validateErrors, configName, binName)
  }

  return true
}
