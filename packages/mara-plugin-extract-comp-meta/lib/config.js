const extractOptions = {
  serializeDecoratorNameList: ['SComponent', 'Design', 'dataType'],
  entryDecoratorFilters: ['SComponent'],
  withSinaFormatTransformer: true
}

const dropOptions = {
  classElementDecorators: ['Design'],
  classDecorators: ['SComponent']
}

const reportApi = 'http://exp.smfe.sina.cn/graphql'

const vueFiles = new Set()

module.exports = {
  extractOptions,
  dropOptions,
  reportApi,
  vueFiles
}
