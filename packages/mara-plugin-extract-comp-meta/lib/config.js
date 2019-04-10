const options = {
  serializeDecoratorNameList: ['SComponent', 'Design', 'dataType'],
  entryDecoratorFilters: ['SComponent'],
  withSinaFormatTransformer: true
}

const reportApi = 'http://exp.smfe.sina.cn/graphql'

module.exports = {
  options,
  reportApi
}
