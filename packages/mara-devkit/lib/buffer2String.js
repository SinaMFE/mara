// https://stackoverflow.com/questions/20270973/nodejs-spawn-stdout-string-format
module.exports = function buffer2String(data) {
  return data.toString().replace(/[\n\r]/g, '')
}
