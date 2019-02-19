# @mara/create

[![npm](https://img.shields.io/npm/v/@mara/x.svg)](https://www.npmjs.com/package/@mara/x)

Marauder 项目模板生成工具。

## 命令

**npx（推荐）**

```sh
npx @mara/create my-app
```

_需要 npm 5.2+ 版本_

**npm**

```sh
npm init @mara my-app
```

_需要 npm 6+ 版本_

**yarn**

```sh
yarn create @mara my-app
```

_需要 yarn 0.25+ 版本_

**Marauder CLI**

```sh
npm i @mara/cli -g

mara create my-app
```

### 参数

- `--use-npm` 使用 `npm` 安装依赖，默认 `yarn`
- `--use-pnp` 使用 yarn pnp 模式
- `--no-ts` 不使用 typescript
- `--preset | -p` 指定预设模板，vue | react | other lib
- `--force | -f` 强制在指定目录生成项目

## 流程

- 创建或检查应用目录
- 生成预置 package.json，添加依赖字段
- 安装 @mara/x 及 App 框架依赖
- 从 @mara/x 中提取项目模板
- 更新 package.json 余项字段
- 生成项目 src 目录及配置文件
- (如果不存在)初始化 git 仓库
