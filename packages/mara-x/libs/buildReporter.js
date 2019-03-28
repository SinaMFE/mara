const fs = require('fs')
const path = require('path')
const filesize = require('filesize')
const chalk = require('chalk')
const recursive = require('recursive-readdir')
const stripAnsi = require('strip-ansi')
const gzipSize = require('gzip-size').sync
const { groupBy } = require('lodash')

// assetsData：{<Object>: <Array>}
function printBuildResult(
  assetsData,
  previousSizeMap,
  maxBundleGzipSize = Infinity,
  maxChunkGzipSize = Infinity
) {
  // https://raw.githubusercontent.com/webpack/analyse/master/app/pages/upload/example.json
  let labelLengthArr = []
  let libPathLengthArr = []
  let suggestBundleSplitting = false
  // const root = previousSizeMap.root
  const preSizes = previousSizeMap.sizes
  const isJS = val => /\.js$/.test(val)
  const isCSS = val => /\.css$/.test(val)
  const isMinJS = val => /\.min\.js$/.test(val)

  function mainAssetInfo(info, type) {
    // __format 属性为组件资源特有
    const isMainBundle =
      type === 'view' && info.name.indexOf(`${info.folder}.`) === 0
    const maxRecommendedSize = isMainBundle
      ? maxBundleGzipSize
      : maxChunkGzipSize
    const isLarge = maxRecommendedSize && info.size > maxRecommendedSize

    if (isLarge && isJS(info.name)) {
      suggestBundleSplitting = true
    }

    if (type === 'lib') {
      libPathLengthArr.push(stripAnsi(info.name).length)
    }

    printAssetPath(info, type, isLarge)
  }

  function printAssetPath(info, type, isLarge = false) {
    let sizeLabel = info.sizeLabel
    const sizeLength = stripAnsi(sizeLabel).length
    const longestSizeLabelLength = Math.max.apply(null, labelLengthArr)
    const longestLibPathLength = Math.max.apply(null, libPathLengthArr)
    let assetPath = chalk.dim(info.folder + path.sep)

    // path.normalize 跨平台格式化路径
    if (isJS(info.name)) {
      // lib 脚本文件添加模块格式标识
      let formatLabel = info.format ? `  [${info.format}]` : ''
      const libPathLength = stripAnsi(info.name).length

      if (formatLabel && libPathLength < longestLibPathLength) {
        const leftPadding = ' '.repeat(longestLibPathLength - libPathLength)

        formatLabel = leftPadding + formatLabel
      }

      assetPath += chalk.yellowBright(info.name + formatLabel)
    } else if (isCSS(info.name)) {
      assetPath += chalk.blueBright(info.name)
    } else {
      assetPath += chalk.cyan(info.name)
    }

    if (sizeLength < longestSizeLabelLength) {
      const rightPadding = ' '.repeat(longestSizeLabelLength - sizeLength)

      sizeLabel += rightPadding
    }

    console.log(
      `  ${isLarge ? chalk.yellow(sizeLabel) : sizeLabel}  ${assetPath}`
    )
  }

  // Input: 1024, 2048
  // Output: "(+1 KB)"
  function getDifferenceLabel(currentSize, previousSize) {
    const FIFTY_KILOBYTES = 1024 * 50
    const difference = currentSize - previousSize
    const fileSize = !Number.isNaN(difference) ? filesize(difference) : 0

    if (difference >= FIFTY_KILOBYTES) {
      return chalk.red('+' + fileSize)
    } else if (difference < FIFTY_KILOBYTES && difference > 0) {
      return chalk.yellow('+' + fileSize)
    } else if (difference < 0) {
      return chalk.green(fileSize)
    } else {
      return ''
    }
  }

  function parseAssets(assets) {
    const seenNames = new Map()
    const assetsInfo = groupBy(
      assets
        .filter(a =>
          seenNames.has(a.name) ? false : seenNames.set(a.name, true)
        )
        .map(asset => {
          const buildDir = assets['__dist'] || asset['__dist']
          const fileContents = fs.readFileSync(path.join(buildDir, asset.name))
          const size = gzipSize(fileContents)
          const previousSize = preSizes[removeFileNameHash(asset.name)]
          const difference = getDifferenceLabel(size, previousSize)
          const sizeLabel =
            filesize(size) + (difference ? ' (' + difference + ')' : '')

          labelLengthArr.push(stripAnsi(sizeLabel).length)

          return {
            folder: path.join(
              path.basename(buildDir),
              path.dirname(asset.name)
            ),
            name: path.basename(asset.name),
            format: asset['__format'],
            size: size,
            sizeLabel
          }
        }),
      asset => (/\.(js|css)$/.test(asset.name) ? 'main' : 'other')
    )

    assetsInfo.main = assetsInfo.main || []
    assetsInfo.other = assetsInfo.other || []

    return assetsInfo
  }

  const assetList = Object.keys(assetsData).map(type => {
    let assets = assetsData[type]
    let output

    if (type === 'lib') {
      assets = [].concat.apply([], assets)
      output = [parseAssets(assets)]
    } else {
      output = assets.map(a => parseAssets(a))
    }

    return { type, output }
  })

  assetList.forEach(item => {
    if (item.type === 'demos' && item.output.length) {
      console.log(`\nDEMO${item.output.length > 1 ? 'S' : ''}:`)
    }

    item.output.forEach(assetsInfo => {
      // add new line
      if (item.type === 'demos') console.log()

      assetsInfo.main
        .sort((a, b) => {
          if (isJS(a.name) && isCSS(b.name)) return -1
          if (isCSS(a.name) && isJS(b.name)) return 1
          if (isMinJS(a.name) && !isMinJS(b.name)) return -1
          if (!isMinJS(a.name) && isMinJS(b.name)) return 1

          return b.size - a.size
        })
        .forEach(info => mainAssetInfo(info, item.type))

      assetsInfo.other
        .sort((a, b) => b.size - a.size)
        .forEach(info => printAssetPath(info))
    })
  })

  if (suggestBundleSplitting) {
    console.log()
    console.log(
      chalk.yellow('The bundle size is significantly larger than recommended.')
    )
    console.log(
      chalk.yellow(
        'Consider reducing it with code splitting: https://goo.gl/9VhYWB'
      )
    )
    console.log(
      chalk.yellow(
        'You can also analyze the project dependencies: https://goo.gl/LeUzfb'
      )
    )
  }
}

function canReadAsset(asset) {
  return (
    /\.(js|css|php)$/.test(asset) &&
    !/service-worker\.js/.test(asset) &&
    !/precache-manifest\.[0-9a-f]+\.js/.test(asset)
  )
}

function removeFileNameHash(fileName, buildFolder = '') {
  return fileName
    .replace(buildFolder, '')
    .replace(/\\/g, '/')
    .replace(/^\//, '')
    .replace(
      /\/?(.*)(\.[0-9a-f]+)(\.chunk)?(\.js|\.css)/,
      (match, p1, p2, p3, p4) => p1 + p4
    )
}

function getBuildSizeOfFileMap(fileMap = {}) {
  if (!Object.keys(fileMap).length) return {}

  return Object.entries(fileMap).reduce((sizes, [file, originFile]) => {
    const contents = fs.readFileSync(originFile)

    sizes[file] = gzipSize(contents)

    return sizes
  }, {})
}

function getLastBuildSize(buildFolder) {
  return new Promise(resolve => {
    recursive(buildFolder, (err, fileNames) => {
      let sizes = {}

      if (!err && fileNames) {
        sizes = fileNames.filter(canReadAsset).reduce((memo, fileName) => {
          const contents = fs.readFileSync(fileName)
          const key = removeFileNameHash(fileName, buildFolder)

          memo[key] = gzipSize(contents)

          return memo
        }, {})
      }

      resolve({
        root: buildFolder,
        sizes: sizes
      })
    })
  })
}

module.exports = {
  getLastBuildSize,
  printBuildResult,
  getBuildSizeOfFileMap
}
