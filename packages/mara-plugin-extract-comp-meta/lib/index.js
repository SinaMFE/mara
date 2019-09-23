const chalk = require('chalk')
const fs = require('fs-extra')
const { customSerializeVueByDirectory } = require('sina-meta-serialize')
const uploadMeta = require('./upload-meta')
const { compExtractOptions, pageExtractOptions } = require('./config')

const steps = [
  `${chalk.blue('🔍  [1/3]')} 提取元信息...`,
  `${chalk.blue('📝  [2/3]')} 生成元数据文件...`,
  [
    `${chalk.blue('🚀  [3/3]')} 保存元数据文件...`,
    `${chalk.blue('🚀  [3/3]')} 上传元数据文件...`
  ],
  `🎉  ${chalk.green('Success!')}\n`,
  `😵  ${chalk.red('Failed!')}\n`
]

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

async function extractMeta(src, entry) {
  let extractOpt = compExtractOptions

  if (entry) {
    extractOpt = Object.assign({}, pageExtractOptions, {
      viewDirname: entry
    })
  }

  return customSerializeVueByDirectory(src, extractOpt)
}

async function updateBuildJson(path, data) {
  const json = require(path)

  json['metaData'] = data

  return fs.writeFileSync(path, JSON.stringify(json, null, 2))
}

async function extractCompMeta({ config, argv, context }) {
  console.log(steps[0])

  const paths = config.paths
  const entry = context.entry
  const isBuildHook = argv.hook && entry
  const { name: pkgName, version: pkgVer } = require(paths.packageJson)

  try {
    const data = await extractMeta(paths.src, entry)
    console.log(steps[1])

    if (isBuildHook) {
      await updateBuildJson(`${paths.dist}/${entry}/build.json`, data)
      console.log(steps[2][0])
    } else {
      await fs.outputJson(`${paths.lib}/meta.json`, data)
      console.log(steps[2][1])

      const { data: rep } = await uploadMeta({
        name: pkgName,
        version: pkgVer,
        dataTypes: data.dataTypes,
        metaData: data.components
      })

      if (rep.registPackageMeta.errorCode != '0') {
        throw new Error(rep.registPackageMeta.errorMessage)
      }
    }

    console.log(steps[3])
  } catch (e) {
    console.log(steps[4])
    console.log(chalk.red(e))
  }
}

module.exports = extractCompMeta
