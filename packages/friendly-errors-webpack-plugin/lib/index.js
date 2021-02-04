'use strict'

const transformErrors = require('./core/transformErrors')
const formatErrors = require('./core/formatErrors')
const { TYPE } = require('./core/const')
const output = require('./output')
const utils = require('./utils')

const concat = utils.concat
const uniqueBy = utils.uniqueBy

const defaultTransformers = [
  require('./transformers/babelSyntax'),
  require('./transformers/typeError'),
  require('./transformers/resolveLoaderError'),
  require('./transformers/moduleNotFound'),
  require('./transformers/esLintError')
]

const defaultFormatters = [
  require('./formatters/resolveLoaderError'),
  require('./formatters/moduleNotFound'),
  require('./formatters/typeError'),
  require('./formatters/eslintError'),
  require('./formatters/defaultError')
]

class FriendlyErrorsWebpackPlugin {
  constructor(options) {
    options = options || {}
    this.compilationSuccessInfo = options.compilationSuccessInfo || {}
    this.onErrors = options.onErrors
    this.useYarn = options.useYarn
    this.shouldClearConsole =
      options.clearConsole == null ? true : Boolean(options.clearConsole)
    this.formatters = concat(defaultFormatters, options.additionalFormatters)
    this.transformers = concat(
      defaultTransformers,
      options.additionalTransformers
    )
  }

  async doneFn(stats) {
    this.clearConsole()

    const hasErrors = stats.hasErrors()
    const hasWarnings = stats.hasWarnings()

    if (!hasErrors && !hasWarnings) {
      this.displaySuccess(stats)
      return
    }

    // 优先展示错误
    if (hasErrors) {
      this.displayErrors(extractErrorsFromStats(stats, 'errors'), 'error')
      return
    }

    if (hasWarnings) {
      this.displayErrors(extractErrorsFromStats(stats, 'warnings'), 'warning')
    }
  }

  invalidFn(msg = 'Compiling...') {
    this.clearConsole()
    output.title('info', 'WAIT', msg)
  }

  apply(compiler) {
    if (compiler.hooks) {
      const plugin = { name: 'FriendlyErrorsWebpackPlugin' }

      compiler.hooks.done.tap(plugin, this.doneFn.bind(this))
      compiler.hooks.invalid.tap(plugin, this.invalidFn.bind(this))
    } else {
      compiler.plugin('done', this.doneFn.bind(this))
      compiler.plugin('invalid', this.invalidFn.bind(this))
    }
  }

  clearConsole() {
    if (this.shouldClearConsole) {
      output.clearConsole()
    }
  }

  displaySuccess(stats) {
    const time = getCompileTime(stats)
    output.title('success', 'DONE', 'Compiled successfully in ' + time + 'ms')

    if (this.compilationSuccessInfo.messages) {
      this.compilationSuccessInfo.messages.forEach(message =>
        output.info(message)
      )
    }
    if (this.compilationSuccessInfo.notes) {
      output.log()
      this.compilationSuccessInfo.notes.forEach(note => output.note(note))
    }
  }

  displayErrors(errors, severity) {
    const processedErrors = transformErrors(errors, this.transformers)
    const topErrors = getMaxSeverityErrors(processedErrors, severity)
    const errNum = topErrors.length
    let subtitle = ''

    if (severity === 'error') {
      subtitle =
        errNum > 1
          ? `Failed to compile with ${errNum} ${severity}s`
          : `Failed to compile`
    } else {
      subtitle = `Compiled with ${errNum} ${severity}s`
    }

    output.title(severity, severity.toUpperCase(), subtitle)

    formatErrors(topErrors, this.formatters, severity, {
      useYarn: this.useYarn
    }).forEach(chunk => output.log(chunk))

    // 在所有错误打印之后执行
    if (this.onErrors) {
      this.onErrors(severity, topErrors)
    }
  }
}

function extractErrorsFromStats(stats, type) {
  if (isMultiStats(stats)) {
    const errors = stats.stats.reduce(
      (errors, stats) => errors.concat(extractErrorsFromStats(stats, type)),
      []
    )
    // Dedupe to avoid showing the same error many times when multiple
    // compilers depend on the same module.
    return uniqueBy(errors, error => error.message)
  }
  return stats.compilation[type]
}

function getCompileTime(stats) {
  if (isMultiStats(stats)) {
    // Webpack multi compilations run in parallel so using the longest duration.
    // https://webpack.github.io/docs/configuration.html#multiple-configurations
    return stats.stats.reduce(
      (time, stats) => Math.max(time, getCompileTime(stats)),
      0
    )
  }
  return stats.endTime - stats.startTime
}

function isMultiStats(stats) {
  return stats.stats
}

// 获取重要错误
function getMaxSeverityErrors(errors, severity) {
  if (severity == 'error') {
    const maxSeverity = getMaxInt(errors, 'severity')
    return errors.filter(e => e.severity === maxSeverity)
  } else {
    return errors
  }
}

function getMaxInt(collection, propertyName) {
  return collection.reduce((res, curr) => {
    return curr[propertyName] > res ? curr[propertyName] : res
  }, 0)
}

FriendlyErrorsWebpackPlugin.TYPE = TYPE

module.exports = FriendlyErrorsWebpackPlugin
