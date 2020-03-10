'use strict'

function replayAsync(fn, assertFn, maxLoop = 10, wait = 1000) {
  return (...args) => {
    let cycles = 0

    return new Promise(async function tillTheWorldEnds(resolve, reject) {
      let res = null
      let isEndTime = false

      try {
        res = await fn.apply(fn, args)
        isEndTime = assertFn(res) || ++cycles > maxLoop
      } catch (e) {
        return reject(e)
      }

      return isEndTime
        ? resolve(res)
        : setTimeout(tillTheWorldEnds, wait, resolve)
    })
  }
}

async function getJobInfo(pid, jobId) {
  const rep = await fetch.get(`/projects/${pid}/jobs/${jobId}`)
  return rep.data
}

function getPushErrTip(error) {
  const msg = ['\n😲  操作已回滚']

  if (error.includes('connect to host')) {
    msg.push('请检查您的网络连接')
  } else if (error.includes('git pull')) {
    msg.push('检测到远程分支更新，请先执行 git pull 操作')
  }

  return chalk.yellow(msg.join('，'))
}

function checkRepo(remote, branch) {
  if (!remote) throw new Error('请设置远程仓库')

  if (remote.indexOf('http') > -1) throw new Error('请配置 ssh 仓库地址')
}

async function pushBuildTag(tagName, tagMsg, repoUrl) {
  const spinner = ora('Add tag...').start()
  await execa('git', ['tag', '-a', tagName, '-m', tagMsg])

  spinner.text = `Pushing tag #${tagName}...`

  try {
    await execa('git', ['push', 'origin', tagName])
  } catch (e) {
    // 回滚 tag
    await execa('git', ['tag', '-d', tagName])
    spinner.stop()

    const tip = ['\n😲  操作已回滚，请手动发布:', `${repoUrl}/tags/new`].join(
      '\n'
    )

    throw new Error(e.stderr + chalk.yellow(tip))
  }

  spinner.stop()
}

async function showManualTip(repoUrl, type = 'token') {
  const { stdout: lastCommit } = await execa('git', ['rev-parse', 'HEAD'])
  const commitPage = chalk.yellow(`${repoUrl}/commit/${lastCommit}`)

  if (type == 'token') {
    console.log(chalk.red('未配置 CI 访问权限，请手动发布:'))
    console.log(commitPage, '\n')

    console.log(
      '推荐在 marauder.config.ciConfig 中配置 privateToken 以启用自动化发布\n'
    )
    console.log('Private Token 生成链接：')
    console.log(chalk.yellow(`${GITLAB_HOST}/profile/personal_access_tokens`))
  } else if (type == 'ci') {
    console.log(chalk.red('任务失败，请手动发布:'))
    console.log(commitPage, '\n')
  }
}

module.exports = {
  replayAsync,
  getJobInfo,
  showManualTip,
  pushBuildTag,
  checkRepo,
  getPushErrTip
}