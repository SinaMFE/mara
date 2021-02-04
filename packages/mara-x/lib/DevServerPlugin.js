const url = require('url')
const chalk = require('chalk')
const prompts = require('prompts')
const openBrowser = require('react-dev-utils/openBrowser')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')
const clearConsole = require('react-dev-utils/clearConsole')
const tsFormatter = require('react-dev-utils/typescriptFormatter')
const FriendlyErrorsPlugin = require('@mara/friendly-errors-webpack-plugin')

const isInteractive = process.stdout.isTTY
const tsErrorFormat = msg => `${msg.file}\n${tsFormatter(msg, true)}`
const noop = () => {}

function printInstructions(appName, urls, useYarn) {
  console.log(`  App ${chalk.bold(appName)} running at:`)
  console.log()

  console.log(`  - ${chalk.bold('Local:')}    ${urls.localUrlForTerminal}`)
  console.log(`  - ${chalk.bold('Network:')}  ${urls.lanUrlForTerminal}`)

  console.log()
  console.log('  Note that the development build is not optimized.')
  console.log(
    `  To create a production build, use ` +
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
      noTsTypeError: false,
      useTypeScript: false,
      onTsCheckEnd: noop,
      root: process.cwd()
    }

    this.tsMessagesPromise = Promise.resolve()
    this.options = Object.assign(defOpt, options)
    this.serverUrl = this.getServerURL()
    this.spinner = this.options.spinner
  }

  apply(compiler) {
    const pluginName = this.constructor.name
    const useYarn = this.options.useYarn
    let isFirstCompilePass = true
    // friendly error plugin displays very confusing errors when webpack
    // fails to resolve a loader, so we provide custom handlers to improve it
    const friendErrors = new FriendlyErrorsPlugin({
      useYarn: useYarn,
      onErrors(severity, topErrors) {
        const hasLoaderError = topErrors.some(
          e => e.type === FriendlyErrorsPlugin.TYPE.CANT_RESOVLE_LOADER
        )

        // loader 错误中断进程
        if (hasLoaderError) {
          process.kill(process.pid, 'SIGINT')
        }
      }
    })

    if (this.options.clearConsole) {
      compiler.hooks.invalid.tap(pluginName, this.clearConsole)
      compiler.hooks.done.tap(pluginName, this.clearConsole)
    }

    compiler.hooks.invalid.tap(pluginName, () => {
      return friendErrors.invalidFn()
    })

    compiler.hooks.failed.tap(pluginName, err => {
      this.spinner && this.spinner.stop()
      friendErrors.displayErrors([err], 'error')
      process.exit(1)
    })

    if (this.options.useTypeScript) {
      this.tsChecker(compiler)
    }

    compiler.hooks.done.tap(pluginName, async stats => {
      if (this.options.useTypeScript && !stats.hasErrors()) {
        const delayedMsg = setTimeout(() => {
          friendErrors.invalidFn(
            'Files successfully emitted, waiting for typecheck results...'
          )

          // 清空错误
          this.options.onTsCheckEnd('errors', [])
        }, 100)

        const tsMsg = await this.tsMessagesPromise
        const typeErrorSeverity = this.options.noTsTypeError
          ? 'warnings'
          : 'errors'

        clearTimeout(delayedMsg)

        stats.compilation[typeErrorSeverity].push(...tsMsg.errors)
        stats.compilation.warnings.push(...tsMsg.warnings)

        // 优先抛出错误
        // 不过滤条数，确保始终刷新 errorOverlay
        this.options.onTsCheckEnd(
          typeErrorSeverity,
          // 在客户端错误遮罩层展示，仅在这里使用 tsErrorFormat
          tsMsg.errors.map(tsErrorFormat)
        )

        if (tsMsg.errors.length == 0 && tsMsg.warnings.length > 0) {
          this.options.onTsCheckEnd(
            'warnings',
            tsMsg.warnings.map(tsErrorFormat)
          )
        }

        this.clearConsole()
      }

      const isSuccessful = !stats.hasErrors() && !stats.hasWarnings()

      isFirstCompilePass && this.spinner && this.spinner.stop()

      if (isSuccessful && (isInteractive || isFirstCompilePass)) {
        printInstructions(
          this.options.entry,
          this.serverUrl,
          this.options.useYarn
        )
      }

      friendErrors.doneFn(stats)

      if (isFirstCompilePass && !stats.hasErrors()) {
        if (this.options.openBrowser) {
          openBrowser(this.serverUrl.lanUrl)
        }

        isFirstCompilePass = false
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
    const { protocol, host, port, entry } = this.options
    let publicDevPath = this.options.publicPath

    // 以绝对路径 / 开头时，加入 url 中在浏览器打开
    // 以非 / 开头时，回退为 /，避免浏览器路径错乱
    publicDevPath = publicDevPath.startsWith('/') ? publicDevPath : '/'

    const prepareUrls = hostname => ({
      plain: url.format({
        protocol,
        hostname,
        port,
        // 始终携带 view html
        pathname: publicDevPath + `${entry}.html`
      }),
      pretty: chalk.cyan(
        url.format({
          protocol,
          hostname,
          port,
          // 终端信息中省略 index.html
          pathname:
            publicDevPath +
            (entry === 'index' ? '' : chalk.bold(`${entry}.html`))
        })
      )
    })

    const localUrl = prepareUrls('localhost')
    const lanUrl = prepareUrls(host || 'localhost')

    return {
      localUrl: localUrl.plain,
      lanUrl: lanUrl.plain,
      localUrlForTerminal: localUrl.pretty,
      lanUrlForTerminal: lanUrl.pretty
    }
  }
}
