const chalk = require('chalk')
const openBrowser = require('react-dev-utils/openBrowser')
const isInteractive = process.stdout.isTTY

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
      useYarn: false
    }

    this.firstCompile = true
    this.options = Object.assign(defOpt, options)
    this.serverUrl = this.getServerURL()
  }

  apply(compiler) {
    const pluginName = this.constructor.name

    compiler.hooks.done.tap(pluginName, stats => {
      const messages = stats.toJson({}, true)
      const isSuccessful = !messages.errors.length && !messages.warnings.length

      this.firstCompile && this.options.spinner.stop()

      // If errors exist, only show errors.
      if (messages.errors.length) return

      if (this.firstCompile || (isSuccessful && isInteractive)) {
        printInstructions(
          this.options.entry,
          this.serverUrl,
          this.options.useYarn
        )
      }

      if (this.firstCompile) {
        if (this.options.openBrowser) {
          openBrowser(this.serverUrl.lanUrl)
        }

        this.firstCompile = false
      }
    })
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
