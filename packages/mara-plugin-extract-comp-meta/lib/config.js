const compExtractOptions = {
  serializeDecoratorNameList: ['SComponent', 'Design', 'dataType'],
  entryDecoratorFilters: ['SComponent'],
  withSinaFormatTransformer: true,
  serializeType: 'component'
}

const pageExtractOptions = {
  serializeDecoratorNameList: ['SPage', 'Design', 'dataType'],
  entryDecoratorFilters: ['SPage'],
  withSinaFormatTransformer: true,
  viewDirname: '',
  serializeType: 'page'
}

const dropOptions = {
  classElementDecorators: ['Design'],
  classDecorators: ['SComponent']
}

const reportApi =
  'http://microservicesystem.mfe.svc.nvsdbl.k8.nevis.sina.com.cn/graphql'

const vueFiles = new Set()

module.exports = {
  compExtractOptions,
  pageExtractOptions,
  dropOptions,
  reportApi,
  vueFiles
}
