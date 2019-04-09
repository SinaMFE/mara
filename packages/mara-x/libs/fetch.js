const request = require('node-fetch')

function fetch({ url, method, data }) {
  method = typeof method === 'string' ? method.toUpperCase() : 'GET'

  const options = {
    method: method,
    headers: { 'Content-Type': 'application/json' }
  }

  if (method === 'GET') {
    const urlParam = data ? serializeData(data) : ''
    url = appendParam(url, urlParam)
  } else if (method === 'POST') {
    const body = typeof data === 'string' ? data : JSON.stringify(data)
    options.body = body
  }

  return request(url, options).then(res => res.json())
}

function get(url, data) {
  return fetch({ url, data, method: 'GET' })
}

function post(url, data) {
  return fetch({ url, data, method: 'POST' })
}

function appendParam(url = '', param) {
  if (!url) return ''
  if (!param) return url

  // APP 数据接口直接使用 & 拼接参数
  if (!/^http[s]?:\/\//.test(url)) return `${url}&${param}`

  url = url.replace(/[?&]$/, '')
  return /\?/.test(url) ? `${url}&${param}` : `${url}?${param}`
}

function serializeData(data) {
  return Object.keys(data)
    .map(key => `${key}=${data[key]}`)
    .join('&')
}

module.exports = {
  fetch,
  get,
  post
}
