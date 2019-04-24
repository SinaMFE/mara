const path = require('path')
const execa = require('execa')

module.exports = async function getGitRepoName() {
  const { stdout: remoteUrl } = await execa('git', [
    'config',
    '--get',
    'remote.origin.url'
  ])

  return path.basename(remoteUrl, '.git')
}
