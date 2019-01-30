const random = (min = 0, max = 1) =>
  Math.floor(Math.random() * (max - min + 1) + min)

const resultPath = outputPath => {
  const publicPath = `__webpack_public_path__ + ${JSON.stringify(outputPath)};`

  // TODO revert to ES2015 Module export, when new CSS Pipeline is in place
  return `module.exports = ${publicPath}`
}

module.exports = {
  random,
  resultPath
}
