const request = require('node-fetch')
const API = 'https://registry.npm.taobao.org/-/package'

module.exports = async function getPackageVersion(pkgNames) {
  const result = {}
  pkgNames = [].concat(pkgNames)

  for (let name of pkgNames) {
    const data = await request(`${API}/${name}/dist-tags`).then(res =>
      res.json()
    )

    result[name] = data.latest
  }

  return result
}
