'use strict'

const chalk = require('chalk')
let maraxOptionsSchema = {}

const getSchemaPart = path => {
  path = path.split('/')

  let schemaPart = maraxOptionsSchema

  for (let i = 1; i < path.length; i++) {
    const inner = schemaPart[path[i]]

    if (inner) schemaPart = inner
  }

  return schemaPart
}

const getSchemaPartText = (schemaPart, additionalPath) => {
  if (additionalPath) {
    for (let i = 0; i < additionalPath.length; i++) {
      const inner = schemaPart[additionalPath[i]]
      if (inner) schemaPart = inner
    }
  }

  while (schemaPart.$ref) {
    schemaPart = getSchemaPart(schemaPart.$ref)
  }

  let schemaText = ValidationError.formatSchema(schemaPart)

  if (schemaPart.description) {
    schemaText += chalk.cyan(`\n// ${schemaPart.description}`)
  }

  return schemaText
}

const getSchemaPartDescription = schemaPart => {
  while (schemaPart.$ref) {
    schemaPart = getSchemaPart(schemaPart.$ref)
  }

  if (schemaPart.description) {
    return chalk.cyan(`// ${schemaPart.description}`)
  }

  return ''
}

const formatError = (error, desc = '', details = '') => {
  return `${chalk.red(error)}\n` + (desc ? `${desc}\n` : '') + details
}

const filterChildren = children => {
  return children.filter(
    err => !['anyOf', 'allOf', 'oneOf'].includes(err.keyword)
  )
}

const indent = (str, prefix, firstLine) => {
  if (firstLine) {
    return prefix + str.replace(/\n(?!$)/g, '\n' + prefix)
  } else {
    return str.replace(/\n(?!$)/g, `\n${prefix}`)
  }
}

class ValidationError extends Error {
  constructor(schema, validationErrors, configName, binName) {
    super()

    maraxOptionsSchema = schema
    this.name = 'OptionsValidationError'
    this.validationErrors = validationErrors
    this.message = (configName ? `${configName} ` : '') + `Invalid Options.\n`

    if (binName) {
      this.message += `${binName} has been ran using a config object that does not match the API schema.`
    }

    this.message += '\n\n'

    validationErrors.forEach(err => {
      this.message +=
        chalk.red(' - ') +
        `${indent(ValidationError.formatValidationError(err), '   ', false)}\n`
    })

    Error.captureStackTrace(this, this.constructor)
  }

  static formatSchema(schema, prevSchemas) {
    prevSchemas = prevSchemas || []

    const formatInnerSchema = (innerSchema, addSelf) => {
      if (!addSelf)
        return ValidationError.formatSchema(innerSchema, prevSchemas)

      if (prevSchemas.includes(innerSchema)) return '(recursive)'

      return ValidationError.formatSchema(
        innerSchema,
        prevSchemas.concat(schema)
      )
    }

    if (schema.type === 'string') {
      if (schema.minLength === 1) return 'non-empty string'

      if (schema.minLength > 1) return `string (min length ${schema.minLength})`

      return 'string'
    }

    if (schema.type === 'boolean') return 'boolean'

    if (schema.type === 'number') return 'number'

    if (schema.type === 'object') {
      if (schema.properties) {
        const required = schema.required || []

        return `object { ${Object.keys(schema.properties)
          .map(property => {
            if (!required.includes(property)) return property + '?'
            return property
          })
          .concat(schema.additionalProperties ? ['…'] : [])
          .join(', ')} }`
      }

      if (schema.additionalProperties) {
        return `object { <key>: ${formatInnerSchema(
          schema.additionalProperties
        )} }`
      }

      return 'object'
    }

    if (schema.type === 'array') {
      return `[${formatInnerSchema(schema.items)}]`
    }

    switch (schema.instanceof) {
      case 'Function':
        return 'function'
      case 'RegExp':
        return 'RegExp'
    }

    if (schema.$ref) {
      return formatInnerSchema(getSchemaPart(schema.$ref), true)
    }

    if (schema.allOf) {
      return schema.allOf.map(formatInnerSchema).join(' & ')
    }

    if (schema.oneOf) {
      return schema.oneOf.map(formatInnerSchema).join(' | ')
    }

    if (schema.anyOf) {
      return schema.anyOf.map(formatInnerSchema).join(' | ')
    }

    if (schema.enum) {
      return schema.enum.map(item => JSON.stringify(item)).join(' | ')
    }

    return JSON.stringify(schema, null, 2)
  }

  static formatValidationError(err) {
    const dataPath = `config${err.dataPath}`
    const keywordHandler = {
      additionalProperties: () => {
        const baseMessage = formatError(
          `${dataPath} has an unknown property '${
            err.params.additionalProperty
          }'. These properties are valid:`,
          getSchemaPartText(err.parentSchema)
        )

        if (!err.dataPath) {
          // 废弃根属性提示
          // switch (err.params.additionalProperty) {
          //   case 'oldOpt':
          //     return (
          //       `${baseMessage}\n` +
          //       `The 'oldOpt' property was removed in @mara/x 2.0.0.\n`
          //     )
          // }
          // return `${baseMessage}\n` + 'For typos: please correct them.'
        }

        return baseMessage
      },
      enum: () => {
        if (
          err.parentSchema &&
          err.parentSchema.enum &&
          err.parentSchema.enum.length === 1
        ) {
          return formatError(
            `${dataPath} should be ${getSchemaPartText(err.parentSchema)}`
          )
        }

        return formatError(
          `${dataPath} should be one of these:`,
          getSchemaPartText(err.parentSchema)
        )
      },
      allOf: () =>
        formatError(
          `${dataPath} should be:`,
          getSchemaPartText(err.parentSchema)
        ),
      type: () => {
        switch (err.params.type) {
          case 'object':
            return formatError(
              `${dataPath} should be an object.`,
              getSchemaPartDescription(err.parentSchema)
            )
          case 'string':
            return formatError(
              `${dataPath} should be a string.`,
              getSchemaPartDescription(err.parentSchema)
            )
          case 'boolean':
            return formatError(
              `${dataPath} should be a boolean.`,
              getSchemaPartDescription(err.parentSchema)
            )
          case 'number':
            return formatError(
              `${dataPath} should be a number.`,
              getSchemaPartDescription(err.parentSchema)
            )
          case 'array':
            return formatError(
              `${dataPath} should be an array:`,
              getSchemaPartText(err.parentSchema)
            )
          default:
            return formatError(
              `${dataPath} should be ${err.params.type}:`,
              getSchemaPartText(err.parentSchema)
            )
        }
      },
      instanceof: () =>
        formatError(
          `${dataPath} should be an instance of ${getSchemaPartText(
            err.parentSchema
          )}`
        ),
      required: () => {
        const missingProperty = err.params.missingProperty.replace(/^\./, '')

        return formatError(
          `${dataPath} misses the property '${missingProperty}'.`,
          getSchemaPartText(err.parentSchema, ['properties', missingProperty])
        )
      },
      minimum: () =>
        formatError(
          `${dataPath} ${err.message}.`,
          getSchemaPartDescription(err.parentSchema)
        ),
      maximum: () =>
        formatError(
          `${dataPath} ${err.message}.`,
          getSchemaPartDescription(err.parentSchema)
        ),
      uniqueItems: () =>
        formatError(
          `${dataPath} should not contain the item '${
            err.data[err.params.i]
          }' twice.`,
          getSchemaPartDescription(err.parentSchema)
        )
    }

    if (err.keyword === 'oneOf' || err.keyword === 'anyOf') {
      let details = ''

      if (err.children && err.children.length > 0) {
        if (err.schema.length === 1) {
          const lastChild = err.children[err.children.length - 1]
          const remainingChildren = err.children.slice(
            0,
            err.children.length - 1
          )

          return ValidationError.formatValidationError(
            Object.assign({}, lastChild, {
              children: remainingChildren,
              parentSchema: Object.assign(
                {},
                err.parentSchema,
                lastChild.parentSchema
              )
            })
          )
        }

        details =
          '\nDetails:\n' +
          filterChildren(err.children)
            .map(
              err =>
                chalk.red(' * ') +
                indent(ValidationError.formatValidationError(err), '   ', false)
            )
            .join('\n')
      }

      return formatError(
        `${dataPath} should be one of these:`,
        getSchemaPartText(err.parentSchema),
        details
      )
    } else if (
      ['minLength', 'minItems', 'minProperties'].includes(err.keyword)
    ) {
      if (err.params.limit === 1) {
        return formatError(
          `${dataPath} should not be empty.`,
          getSchemaPartDescription(err.parentSchema)
        )
      } else {
        return formatError(
          `${dataPath} ${err.message}.`,
          getSchemaPartDescription(err.parentSchema)
        )
      }
    } else if (keywordHandler[err.keyword]) {
      return keywordHandler[err.keyword]()
    } else {
      return formatError(
        `${dataPath} ${err.message} (${JSON.stringify(err, null, 2)}).`,
        getSchemaPartText(err.parentSchema)
      )
    }
  }
}

module.exports = ValidationError
