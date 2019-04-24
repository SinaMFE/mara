'use strict'

const ora = require('ora')
const path = require('path')
const fs = require('fs')
const glob = require('glob')
const chalk = require('chalk')
const { fetch } = require('@mara/devkit')
const paths = require('../config/paths')

const { name: pkgName, version: pkgVer } = require(paths.packageJson)
const files = glob.sync(paths.lib + '/**')
const spinner = ora('开始上线 umd 资源到 mjs...')

// marauder.config.js
// 用于描述 组件 工程化相关属性
// pkgConfig:{
//   noticeAfterPublish:true,//false
//   noticeLevel:"",//patch minor major  分别对应 发小版本，中版本，大版本 以及以上才发，比如 prepatch ，preminor 都不进行触发。
// }
let noticeAfterPublish = false
let noticeLevel = 'minor'

if (fs.existsSync(paths.marauder)) {
  const maraConf = require(paths.marauder)

  if (
    maraConf &&
    maraConf.pkgConfig &&
    maraConf.pkgConfig.noticeAfterPublish == true
  ) {
    noticeAfterPublish = maraConf.pkgConfig.noticeAfterPublish
    noticeLevel = maraConf.pkgConfig.noticeLevel || 'minor'
  }
}

spinner.start()

const url = 'http://exp.smfe.sina.cn/componentUmd'
const data = { name: pkgName, version: pkgVer }

if (noticeAfterPublish) {
  data.noticeAfterPublish = 1
  data.noticeLevel = noticeLevel
}

fetch
  .get(url, data)
  .then(rep => {
    spinner.stop()

    console.log('静态资源 CDN 上线成功，线上路径为:\n')

    files.forEach(f => {
      if (
        path.relative(paths.lib, f) == null ||
        path.relative(paths.lib, f) == ''
      ) {
        return
      }

      console.log(
        chalk.cyan(
          path.join(
            'http://mjs.sinaimg.cn/umd/',
            pkgName.replace('@mfelibs/', ''),
            '/',
            pkgVer,
            '/',
            path.relative(paths.lib, f)
          )
        )
      )
    })
  })
  .catch(e => {
    spinner.stop()

    console.log(e)
    console.log(
      chalk.red('静态资源 CDN 上线失败\n请访问此链接手动发布：' + url)
    )
  })
