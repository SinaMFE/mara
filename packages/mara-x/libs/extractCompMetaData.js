const fetch = require('./fetch')
const chalk = require('chalk')
const fs = require('fs-extra')
const { customSerializeVueByDirectory } = require('sina-meta-serialize')
const paths = require('../config/paths')

const API = 'http://exp.smfe.sina.cn/graphql'

const config = {
  serializeDecoratorNameList: ['SComponent', 'Design', 'dataType'],
  entryDecoratorFilters: ['SComponent'],
  withSinaFormatTransformer: true
}
const { name: pkgName, version: pkgVer } = require(paths.packageJson)
const steps = [
  `${chalk.blue('🔍  [1/3]')} 提取组件元信息...`,
  `${chalk.blue('📝  [2/3]')} 生成元数据文件...`,
  `${chalk.blue('🚀  [3/3]')} 上传元数据文件...`,
  `🎉  ${chalk.green('Success!')}\n`
]

function postMetaData({ metaData, dataType }) {
  const query = `
    mutation ($version:String,$name:String,$metaData:JSON,$dataType:JSON){
      registPackageMeta(packageMetaInput:{
        version:$version,
        name:$name,
        metaData:$metaData,
        dataTypes:$dataType
      }){
        errorCode,
        errorMessage
      }
    }`

  const variables = {
    version: pkgVer,
    name: pkgName,
    metaData: metaData,
    dataTypes: dataType
  }

  return fetch.post(API, {
    query,
    variables
  })
}

module.exports = function extractMeta() {
  console.log(steps[0])

  return customSerializeVueByDirectory(paths.src, config).then(result => {
    console.log(steps[1])

    fs.writeJson(`${paths.lib}/meta.json`, result)
      .then(() => {
        console.log(steps[2])

        return postMetaData({
          dataType: result.dataTypes,
          metaData: result.components
        }).then(rep => rep.data)
      })
      .then(rep => {
        if (rep.registPackageMeta.errorCode != '0') {
          throw new Error(rep.registPackageMeta.errorMessage)
        }

        console.log(steps[3])
      })
      .catch(err => {
        console.log(chalk.red('提取元数据失败!'), '\n')

        console.log(chalk.red(err))
      })
  })
}
