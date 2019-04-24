const portscanner = require('portscanner')
const localIp = require('./localIp')

/**
 * 获取空闲端口号，范围 [start, start + 20]
 * @return {Number} 端口号
 */
module.exports = async function getFreePort(defPort) {
  const ceiling = Number(defPort + 20)

  return portscanner.findAPortNotInUse(defPort, ceiling, localIp())
}
