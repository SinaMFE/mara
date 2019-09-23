const fetch = require('./fetch')
const { reportApi } = require('./config')

function postMetaData({ metaData, dataTypes, name, version }) {
  const query = `
      mutation ($version:String,$name:String,$metaData:JSON,$dataTypes:JSON){
        registPackageMeta(packageMetaInput:{
          version:$version,
          name:$name,
          metaData:$metaData,
          dataTypes:$dataTypes
        }){
          errorCode,
          errorMessage
        }
      }`

  const variables = {
    version: version,
    name: name,
    metaData: metaData,
    dataTypes: dataTypes
  }

  return fetch.post(reportApi, {
    query,
    variables
  })
}

module.exports = postMetaData
