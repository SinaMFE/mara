async function prepublishOnly(argv, context) {
  const extractMetaData = require('./extractMeta')

  await extractMetaData(argv, context)
}

module.exports = prepublishOnly
