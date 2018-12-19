document.write('当你看到这句话 你的环境已经搭建成功')
import style from '../../css/index.css'

console.log(1)

require.ensure(
  ['./1'],
  function(require) {
    var module2 = require('./1')
    console.log(1)
    require('./2')
  },
  'test'
)
