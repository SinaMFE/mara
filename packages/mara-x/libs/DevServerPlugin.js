const chalk = require('chalk')
const openBrowser = require('react-dev-utils/openBrowser')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')
const clearConsole = require('react-dev-utils/clearConsole')
const tsFormatter = require('react-dev-utils/typescriptFormatter')

const FriendlyErrorsPlugin = require('./friendly-errors')
const { transformer, formatter } = require('./resolveLoaderError')
const isInteractive = process.stdout.isTTY
const tsErrorFormat = msg => `${msg.file}\n${tsFormatter(msg, true)}`
const noop = () => {}

function printInstructions(appName, urls, useYarn) {
  console.log(`App view/${chalk.bold(appName)} running at:`)
  console.log()

  console.log(`  ${chalk.bold('Local:')}            ${urls.localUrl}`)
  console.log(`  ${chalk.bold('On Your Network:')}  ${urls.lanUrl}`)

  console.log()
  console.log('Note that the development build is not optimized.')
  console.log(
    `To create a production build, use ` +
      `${chalk.cyan(`${useYarn ? 'yarn' : 'npm run'} build`)}.`
  )
  console.log()
}

module.exports = class MaraDevServerPlugin {
  constructor(options) {
    const defOpt = {
      port: '3022',
      entry: '',
      protocol: 'http',
      host: 'localhost',
      openBrowser: true,
      clearConsole: true,
      publicPath: '/',
      useYarn: false,
      useTypeScript: false,
      onTsError: noop,
      root: process.cwd()
    }

    this.tsMessagesPromise = Promise.resolve()
    this.options = Object.assign(defOpt, options)
    this.serverUrl = this.getServerURL()
  }

  apply(compiler) {
    const pluginName = this.constructor.name
    let isFirstCompile = true
    // friendly error plugin displays very confusing errors when webpack
    // fails to resolve a loader, so we provide custom handlers to improve it
    const friendErrors = new FriendlyErrorsPlugin({
      showFirstError: true,
      useYarn: this.options.useYarn
      // additionalTransformers: [transformer],
      // additionalFormatters: [formatter]
    })

    if (this.options.clearConsole) {
      compiler.hooks.invalid.tap(pluginName, this.clearConsole)
      compiler.hooks.done.tap(pluginName, this.clearConsole)
    }

    compiler.hooks.invalid.tap(pluginName, () => friendErrors.invalidFn())

    if (this.options.useTypeScript) {
      this.tsChecker(compiler)
    }

    compiler.hooks.done.tap(pluginName, async stats => {
      if (this.options.useTypeScript && !stats.hasErrors()) {
        const delayedMsg = setTimeout(() => {
          friendErrors.invalidFn(
            'Files successfully emitted, waiting for typecheck results...'
          )
        }, 100)

        const tsMsg = await this.tsMessagesPromise
        clearTimeout(delayedMsg)

        // Push errors and warnings into compilation result
        // to show them after page refresh triggered by user.
        stats.compilation.errors.push(...tsMsg.errors)
        stats.compilation.warnings.push(...tsMsg.warnings)

        if (tsMsg.errors.length > 0) {
          this.options.onTsError('error', tsMsg.errors.map(tsErrorFormat))
        } else if (tsMsg.warnings.length > 0) {
          this.options.onTsError('warning', tsMsg.warnings.map(tsErrorFormat))
        }

        this.clearConsole()
      }

      const isSuccessful = !stats.hasErrors() && !stats.hasWarnings()

      isFirstCompile && this.options.spinner.stop()

      friendErrors.doneFn(stats)

      if (isSuccessful && (isInteractive || isFirstCompile)) {
        printInstructions(
          this.options.entry,
          this.serverUrl,
          this.options.useYarn
        )
      }

      if (isFirstCompile && !stats.hasErrors()) {
        if (this.options.openBrowser) {
          openBrowser(this.serverUrl.lanUrl)
        }

        isFirstCompile = false
      }
    })
  }

  tsChecker(compiler) {
    let tsMessagesResolver = noop

    compiler.hooks.beforeCompile.tap('beforeCompile', () => {
      this.tsMessagesPromise = new Promise(resolve => {
        tsMessagesResolver = msgs => resolve(msgs)
      })
    })

    ForkTsCheckerWebpackPlugin.getCompilerHooks(compiler).receive.tap(
      'afterTypeScriptCheck',
      (diagnostics, lints) => {
        const allMsgs = [...diagnostics, ...lints]

        tsMessagesResolver({
          errors: allMsgs.filter(msg => msg.severity === 'error'),
          warnings: allMsgs.filter(msg => msg.severity === 'warning')
        })
      }
    )
  }

  clearConsole() {
    isInteractive && clearConsole()
  }

  getServerURL() {
    const hostUri = this.getServerHostUri()
    let publicDevPath = this.options.publicPath

    // 以绝对路径 / 开头时，加入 url 中在浏览器打开
    // 以非 / 开头时，回退为 /，避免浏览器路径错乱
    publicDevPath = publicDevPath.startsWith('/') ? publicDevPath : '/'

    return {
      localUrl: `${hostUri.local + publicDevPath + this.options.entry}.html`,
      lanUrl: `${hostUri.lan + publicDevPath + this.options.entry}.html`
    }
  }

  getServerHostUri() {
    const { protocol, host, port } = this.options

    return {
      local: `${protocol}://localhost:${port}`,
      lan: `${protocol}://${host || 'localhost'}:${port}`
    }
  }
}
