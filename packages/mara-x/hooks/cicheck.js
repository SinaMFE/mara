const path = require('path')
const fs = require('fs-extra')
const chalk = require('chalk')
const { dist } = require('../config/paths')
const { isInstalled } = require('../lib/utils')

if (!isInstalled('@mfelibs/mfe-deploy-check')) {
  console.log(chalk.yellow('😉  还差一步，请安装以下依赖'))
  console.log('👉  yarn add @mfelibs/mfe-deploy-check -D')

  process.exit(0)
}

const deployCheck = require('@mfelibs/mfe-deploy-check')

async function checkLatestDistView() {
  const getStat = f =>
    fs.stat(path.join(dist, f)).then(stat => {
      stat['_name'] = f
      return stat
    })
  const files = await fs.readdir(dist)
  const stats = await Promise.all(files.map(getStat))
  const dir = stats.filter(stat => stat.isDirectory())
  const target = dir.sort((a, b) => b.birthtime - a.birthtime)[0]

  return deployCheck.check({ viewName: target._name, env: 'local' })
}

async function doCheck(argv, context) {
  if (!fs.existsSync(dist)) return

  const viewName = argv._[2]

  if (viewName) {
    return deployCheck.check({ viewName, env: 'local' })
  }

  return checkLatestDistView()
}

module.exports = doCheck
