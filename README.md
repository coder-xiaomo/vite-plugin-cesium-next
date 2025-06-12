# ⚡ vite-plugin-cesium-next

> 本仓库 fork 自 [nshen/vite-plugin-cesium](https://github.com/nshen/vite-plugin-cesium)

本仓库在原仓库代码基础上，主要针对性修复/优化了以下问题

- 相对路径问题：本仓库已支持在 vite.config.ts 中配置以下类型的 base: `'./'`, `'/'`, `'/foo/bar'`, `''`, `(不设置)` (新创建的项目 base 默认为 `'./'`，而原仓库针对 `'./'` 没有做很好的处理)
- 资源请求路径：当 base 形如 `'/foo/bar'` 时，cesium 静态文件由 `/cesium...` 改为请求 `/foo/bar/cesium...`
  鉴于原仓库作者可能不再维护此项目(详见：[issue](https://github.com/nshen/vite-plugin-cesium/issues/62#issuecomment-2957419669))，故 fork 本仓库 ([coder-xiaomo/vite-plugin-cesium-next](https://github.com/coder-xiaomo/vite-plugin-cesium-next)) 继续维护，欢迎提交 Issue / Pr ！

## Install

```bash
# 记得安装 cesium 依赖哦
npm i vite-plugin-cesium-next -D
# yarn add vite-plugin-cesium-text -D
```

## Usage

add this plugin to `vite.config.ts`

```js
import { defineConfig } from 'vite';
import cesium from 'vite-plugin-cesium-next'; // 👈 添加这一行

export default defineConfig({
  // ...
  plugins: [
    // ...

    // 👇 添加这一行
    // usage: https://github.com/coder-xiaomo/vite-plugin-cesium-next#usage
    cesium(),

    // 或者如果你需要自定义配置，可以这样写 👇
    cesium({
      /* 这里可以添加自定义配置 */

      /**
       * 以下情况需要配置 `viteBase: '/'`
       * 如果你的 baseUrl 是 './', 同时使用了 vue-router 的 history 模式路由
       * 当存在二级或以上路由时, 相对路径获取 Cesium 静态资源会找不到
       * 此时请将这里 viteBase 请配置为 '/'
       *
       * 以下情况可不配置 viteBase:
       * 如果 baseUrl 是 / 开头的, 可不配置 viteBase, 插件会自动获取 vite.config.ts 内 base 配置
       * 如果 vue-router 使用的是 hash 模式路由 (形如: `#/foo/bar`), 不影响静态资源地址, 可不配置 viteBase
       * 如果 vue-router 使用的是 history 模式路由, 使用 Cesium 的所有页面:
       *   - 若只有一级路由 (形如: `/foo`), 不需要配置 viteBase
       *   - 若存在多级路由 (形如: `/foo/bar`), ⚠需要配置 viteBase
       *
       * default: 自动获取
       */
      viteBase: '/', // type: string

      /**
       * rebuild cesium library
       */
      rebuildCesium: false, // type: boolean

      /**
       */
      devMinifyCesium: false, // type: boolean

      /**
       */
      cesiumBuildRootPath: 'node_modules/cesium/Build', // type: string

      /**
       */
      cesiumBuildPath: 'node_modules/cesium/Build/Cesium/', // type: string

      /**
       */
      cesiumBaseUrl: 'cesium/', // type: string

    }),
  ],
});
```
