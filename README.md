# Marauder

[![npm](https://img.shields.io/npm/v/@mara/x.svg)](https://www.npmjs.com/package/@mara/x)

> 挖掘机技术哪家强

Marauder 下一代工程化体系。

## Quick Overview

```bash
npx @mara/create my-app
cd my-app
yarn dev
```

## 安装

**依赖 node 10+, TypeScript 2.7+**

推荐使用 `@mara/create` 一键生成项目：

**npx**

```bash
npx @mara/create my-app
```

**npm**

```bash
npm init @mara my-app
```

**yarn**

```bash
yarn create @mara my-app
```

**Marauder CLI**

```bash
npm i @mara/cli -g

mara create my-app
```

### 项目预设模板

Marauder 预设以下模板，可通过 `--preset | -p` 参数指定。

- `vue` Vue 项目模板（js/ts）
- `react` React 项目模板（js/ts）

#### Vue 模板

未指定预设时，默认创建 `Vue` x `Typescript` 项目:

```bash
npx @mara/create my-app
```

通过 `-p` 指定 `vue` 预设

```bash
npx @mara/create my-app -p vue
```

#### React 模板

指定 `react` 预设，创建 `React` x `Typescript` 项目:

```bash
npx @mara/create my-app -p react
```

#### 空白模板

当 `--preset` 参数指定其他非预设值时，将应用空白模板

使用 zepto:

```bash
npx @mara/create my-app --preset zepto --no-ts
```

不使用任何类库：

```bash
npx @mara/create my-app --preset --no-ts
```

完整的命令行参数有：

- `--use-npm` 使用 `npm` 安装依赖，默认 `yarn`
- `--use-pnp` 使用 yarn pnp 模式
- `--no-ts` 不使用 typescript
- `--preset | -p` 指定预设模板，vue | react | other lib
- `--force | -f` 强制在指定目录生成项目

### 手动安装

以 `my-app` 为例

```bash
my-app/
├── README.md
└── package.json
```

安装依赖：

```bash
yarn add @mara/x -D
```

创建项目结构：

```bash
mkdir -p src/views/index
cd src/views/index
touch index.js index.html
```

完整结构：

```bash
my-app/
├── README.md
├── package.json
├── node_modules
└── src
    └── views
        └── index
            ├── index.js
            └── index.html
```

添加 npm scripts

```json
{
  "scripts": {
    "dev": "marax dev",
    "build": "marax build"
  }
}
```

控制台执行 `yarn build` 命令，正确构建即为安装成功。

### 项目结构

Marauder 项目具有以下结构：

```bash
my-app
├── README.md
├── node_modules
├── package.json
├── marauder.config.js
├── .gitignore
└── src
    └── views  # 视图目录
        ├── home  # 页面
        │   ├── index.js
        │   └── index.html
        └── profile  # 页面
            ├── index.js
            └── index.html
```

#### 视图目录

marauder 为多页打包工具，我们约定 `src/views` 为**视图目录**，视图目录用于存放**页面**。

#### 页面

我们把视图目录下，含有**入口脚本**和**入口文档**文件的目录称为**页面**。
我们约定入口脚本与入口文档以 `index` 命名。

可识别为入口脚本的文件有：

- `index.js`
- `index.ts`
- `index.jsx`
- `index.tsx`

当同时存在多个入口脚本时，遵循以下加载顺序：

```bash
ts > tsx > js > jsx
```

入口文档：`index.html`

页面示例：

```bash
views
├── home  # home 页面
│   ├── index.js
│   └── index.html
└── profile  # profile 页面
│   ├── index.ts
│   └── index.html
└── other  # 非页面，缺少入口脚本
    ├── foo.js
    └── index.html
```

上述示例中 `home` 和 `profile` 目录含有入口脚本与入口文档，因此被识别为**页面**。
`other` 目录仅含有入口文档，缺少入口脚本，因此不是页面。

## 命令

### 开发

```bash
yarn dev
```

运行开发模式，在本地 `3022` 端口（默认）启动开发服务器。

### 构建

```bash
yarn build
```

运行生产模式打包资源，在 `dist` 目录下输出项目构建结果。
