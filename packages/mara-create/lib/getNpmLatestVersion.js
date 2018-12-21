const axios = require('axios')

module.exports = async function getPackageVersion(name) {
  const api = 'https://registry.npm.taobao.org/-/package'
  const result = await axios.get(`${api}/${name}/dist-tags`)

  return result.data.latest
}
