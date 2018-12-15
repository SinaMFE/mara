# eslint-config-sinamfe

## 安装

```bash
yarn add eslint-config-sinamfe
```

## 配置

在项目根目录下建立 `.eslintrc.yml` 文件，写入配置：

```javascript
extends: 'eslint-config-sinamfe'
```

### 严格模式

默认情况下，eslint-config-sinamfe 只校验语法错误，如需校验编码风格，可启用严格模式：

```javascript
extends: 'eslint-config-sinamfe/strict'
```
