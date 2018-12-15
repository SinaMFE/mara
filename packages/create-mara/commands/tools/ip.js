'use strict'

const asyncCommand = require('../../lib/async-command')

function localIp() {
  const ip = require('dev-ip')()
  // vpn 下 ip 为数组，第一个元素为本机局域网 ip
  // 第二个元素为 vpn 远程局域网 ip
  return ip ? (Array.isArray(ip) ? ip[0] : ip) : '0.0.0.0'
}

module.exports = asyncCommand({
  command: 'ip',
  desc: '局域网 ip',
  handler: async () => localIp(),
})
