'use strict'

const ora = require('ora')
const axios = require('axios')
const chalk = require('chalk')
const { execa } = require('@mara/devkit')
const {
  replayAsync,
  getJobInfo,
  showManualTip,
  pushBuildTag,
  checkRepo,
  getPushErrTip
} = require('./gitUtils')

const GITLAB_HOST = 'https://gitlab.weibo.cn'
const fetch = axios.create({
  baseURL: `${GITLAB_HOST}/api/v4/`
})

// 内部调试用
// 当为 true 时，发布到 ci dev 环境
// marauder 发布时，请确保关闭
const DEBUG = false

async function doCIJob(repoName, tagName) {
  const pid = encodeURIComponent(repoName)
  const spinner = ora(`Searching job...`).start()
  let job = null

  try {
    // job 创建需要时间，因此循环请求
    job = await replayAsync(getTestJob, data => data)(pid, tagName)
  } catch (e) {
    // fetch error
    if (e.response) {
      spinner.fail('Searching job: ' + e.response.data.error + '\n')
      console.log(chalk.red(e.response.data.error_description), '\n')
    } else {
      spinner.fail('Searching job\n')
      console.log(chalk.red(e), '\n')
    }

    throw new Error(e)
  }

  if (!job) {
    spinner.fail('未匹配到 CI 任务，请更新 gitlab-ci.yml\n')

    console.log(
      chalk.yellow(
        'https://raw.githubusercontent.com/SinaMFE/marauder-template/master/.gitlab-ci.yml'
      ),
      '\n'
    )

    throw new Error()
  }

  spinner.text = `Running job ${chalk.cyan('#' + job.id)}...`

  try {
    const assertReady = data => data.status != 'created'

    // job 就绪需要时间，因此循环请求
    job = await replayAsync(getJobInfo, assertReady, 10, 1500)(pid, job.id)

    // return job
    return await playJob(pid, job.id, spinner)
  } catch (e) {
    // fetch error
    if (e.response) {
      spinner.fail('Running job: ' + e.response.data.error + '\n')
      console.log(chalk.red(e.response.data.error_description), '\n')
    } else {
      spinner.fail('Running job\n')
      console.log(chalk.red(e), '\n')
    }

    throw new Error(e)
  }
}

async function getTestJob(pid, tagName) {
  const { data: jobs } = await fetch.get(`/projects/${pid}/jobs`)

  return jobs.find(job => {
    const isTargetTag = job.ref == tagName
    const isTestJob = job.stage == (DEBUG ? 'dev' : 'test')
    const isSimulate = job.name == (DEBUG ? 'dev' : 'simulate')

    return isTargetTag && isTestJob && isSimulate
  })
}

async function playJob(pid, jobId, spinner) {
  // replay 操作将会创建新 job
  // 为了更具拓展，这里统一使用新 job
  const { data: job } = await fetch.post(`/projects/${pid}/jobs/${jobId}/play`)

  // https://docs.gitlab.com/ee/ci/pipelines.html#ordering-of-jobs-in-pipeline-graphs
  let status = job.status
  let traceBuffer = ''

  while (status == 'pending' || status == 'running') {
    const { status: runningStatus } = await getJobInfo(pid, job.id)
    const { data: trace } = await fetch.get(
      `/projects/${pid}/jobs/${job.id}/trace`
    )
    const output = trace.replace(traceBuffer, '')

    status = runningStatus

    if (!output) continue

    if (!traceBuffer && trace) spinner.stop()

    traceBuffer = trace
    console.log(output)
  }

  spinner.stop()

  return job
}

async function pushBuildCommit(branchName, verInfo) {
  const spinner = ora('Add commit...').start()
  const commitInfo = await addCommit(verInfo)

  spinner.text = 'Pushing commits...'

  try {
    // push commit
    await execa('git', ['push', 'origin', branchName])
  } catch (e) {
    // 回滚 commit
    await execa('git', ['reset', 'HEAD~'])
    spinner.stop()

    throw new Error(e.stderr + getPushErrTip(e.stderr))
  }

  spinner.succeed(commitInfo + '\n')
}

async function addCommit(verInfo) {
  await execa('git', ['add', '.'])

  const { stdout: commitInfo } = await execa('git', [
    'commit',
    '-m',
    `[TEST] v${verInfo}`
  ])

  return commitInfo
}

/**
 * 部署测试环境
 * @param  {string} entry    页面
 * @param  {string} version  版本号
 * @param  {string} message  部署信息
 */
module.exports = async function testDeploy(entry, version, message) {
  const path = require('path')
  const config = require('../../config')
  const { URL } = require('url')

  const tagPrefix = `tag__${entry}__`
  const verInfo = `${version}-${Date.now()}`
  const tagName = tagPrefix + verInfo
  const tagMsg = message || `test ${entry} v${verInfo}`

  console.log('----------- Test Deploy -----------\n')

  const { stdout: branchName } = await execa('git', [
    'symbolic-ref',
    '--short',
    'HEAD'
  ])
  const { stdout: remoteUrl } = await execa('git', [
    'config',
    '--get',
    'remote.origin.url'
  ])

  checkRepo(remoteUrl, branchName)

  const baseRepoName = path.basename(remoteUrl, '.git')
  // /SINA_MFE/snhy
  const fullRepoName = new URL(remoteUrl).pathname
    .replace(/\.git/, '')
    .replace('/', '')
  const repoUrl = GITLAB_HOST + '/' + fullRepoName

  await pushBuildCommit(branchName, verInfo)

  await pushBuildTag(tagName, tagMsg, repoUrl)

  console.log(chalk.green('Tag: ' + tagName))
  console.log(chalk.green('Msg: ' + tagMsg), '\n')

  if (!config.ciConfig || !config.ciConfig.privateToken) {
    return await showManualTip(repoUrl, 'token')
  }

  fetch.defaults.headers.common['Private-Token'] = config.ciConfig.privateToken
  console.log('-------------- CI job --------------\n')

  try {
    const job = await doCIJob(fullRepoName, tagName)
    const jobLink = `${repoUrl}/-/jobs/${job.id}`

    console.log(chalk.yellow.inverse(' DONE ') + ' ' + chalk.yellow(jobLink))
  } catch (e) {
    const { stdout: lastCommit } = await execa('git', ['rev-parse', 'HEAD'])

    DEBUG && console.log(e)
    await showManualTip(repoUrl, 'ci')
  }
}
