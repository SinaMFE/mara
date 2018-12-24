const axios = require('axios')
const API = 'https://registry.npm.taobao.org/-/package'

module.exports = async function getPackageVersion(pkgNames) {
  const result = {}
  pkgNames = [].concat(pkgNames)

  for (let name of pkgNames) {
    const info = await axios.get(`${API}/${name}/dist-tags`)

    result[name] = info.data.latest
  }

  return result
}
