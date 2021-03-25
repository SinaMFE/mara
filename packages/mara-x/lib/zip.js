const glob = require('glob')
const yazl = require('yazl')
const fs = require('fs-extra')
const path = require('path')
const ModuleFilenameHelpers = require('webpack/lib/ModuleFilenameHelpers')
const paths = require('../config/paths')

async function doZip(options) {
  const zipFile = new yazl.ZipFile()
  const src = options.src
  const dest = options.dest || src
  const extension = options.extension || 'php'
  const filename = options.filename || path.basename(dest)

  return new Promise((resolve, reject) => {
    glob(`${src}/**/*`, { nodir: true }, (er, files) => {
      if (er) return reject(er)

      files.forEach(filePath => {
        if (
          ModuleFilenameHelpers.matchObject(
            { include: options.include, exclude: options.exclude },
            filePath
          )
        ) {
          zipFile.addFile(
            filePath,
            filePath.replace(`${src}/`, ''),
            options.fileOptions
          )
        }
      })

      zipFile.outputStream
        .pipe(fs.createWriteStream(`${dest}/${filename}.${extension}`))
        .on('close', function() {
          resolve()
        })

      zipFile.end()
    })
  })
}

module.exports = doZip
