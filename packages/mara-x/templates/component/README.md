# marauder-template

marauder 组件模板

## 目录结构

```
src
├── index.js    组件入口文件
├── lib         组件构建结果
├── dist/demo   demo 构建结果
└── views/demo  demo 开发目录
```

我们约定 `src/index.(js|ts)` 文件作为组件入口，打包后在 `lib` 目录下输出构建结果

```bash
lib/index.cjs.js  # commonJs 模块规范
lib/index.js      # UMD 模块规范
lib/index.min.js  # UMD 模块规范，压缩
```

## 命令

### 开发模式

运行 views/demo 页面

```bash
npm run dev
```

### 构建

执行 `build` 命令打包组件，将在 `lib` 目录下输出结果

```bash
npm run build
```

## 配置文件

工程根目录下的 `marauder.config.js` 为 marax 配置文件
