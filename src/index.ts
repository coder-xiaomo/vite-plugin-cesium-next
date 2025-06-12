import fs from 'fs-extra';
import path from 'path';
import externalGlobals from 'rollup-plugin-external-globals';
import serveStatic from 'serve-static';
import { HtmlTagDescriptor, normalizePath, Plugin, UserConfig } from 'vite';

interface VitePluginCesiumOptions {
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
  viteBase?: string;

  /**
   * rebuild cesium library
   *
   * default: false
   */
  rebuildCesium?: boolean;

  /**
   * default: false
   */
  devMinifyCesium?: boolean;

  /**
   * default: 'node_modules/cesium/Build'
   */
  cesiumBuildRootPath?: string;

  /**
   * default: 'node_modules/cesium/Build/Cesium/'
   */
  cesiumBuildPath?: string;

  /**
   * default: 'cesium/'
   */
  cesiumBaseUrl?: string;

}

export default function vitePluginCesium(options: VitePluginCesiumOptions = {}): Plugin {
  const {
    viteBase = undefined,
    rebuildCesium = false,
    devMinifyCesium = false,
    cesiumBuildRootPath = 'node_modules/cesium/Build',
    cesiumBuildPath = 'node_modules/cesium/Build/Cesium/',
    cesiumBaseUrl = 'cesium/',
  } = options;

  const CESIUM_BASE_URL = cesiumBaseUrl.endsWith('/')
    ? cesiumBaseUrl
    : (cesiumBaseUrl + '/');

  const globalVars: {
    outDir: string,
    base: string,
    isBuild: boolean,
    cesiumRelativeUrl: string,
  } = {
    outDir: 'dist',
    base: '/',
    isBuild: false,
    cesiumRelativeUrl: '',
  }

  return {
    name: 'vite-plugin-cesium-next',

    config(c, { command }) {
      // 项目中 vite.config.ts 配置的 base 路径
      if (viteBase) {
        globalVars.base = viteBase;
      } else if (c.base) {
        globalVars.base = c.base;
      } else {
        globalVars.base = '/';
      }
      // 是否是打包命令
      globalVars.isBuild = command === 'build';
      // 输出路径
      if (c.build?.outDir) {
        globalVars.outDir = c.build.outDir;
      }
      // 项目浏览器中运行时，Cesium 资源的相对路径
      globalVars.cesiumRelativeUrl = path.posix.join(globalVars.base, CESIUM_BASE_URL);

      const userConfig: UserConfig = {};
      if (!globalVars.isBuild) {
        // -----------dev-----------
        userConfig.define = {
          CESIUM_BASE_URL: JSON.stringify(globalVars.cesiumRelativeUrl)
        };
      } else {
        // -----------build------------
        if (rebuildCesium) {
          // build 1) rebuild cesium library
          userConfig.build = {
            assetsInlineLimit: 0,
            chunkSizeWarningLimit: 5000,
            rollupOptions: {
              output: {
                intro: `window.CESIUM_BASE_URL = ${JSON.stringify(globalVars.cesiumRelativeUrl)};`
              }
            }
          };
        } else {
          // build 2) copy Cesium.js later
          userConfig.build = {
            rollupOptions: {
              external: ['cesium'],
              plugins: [externalGlobals({ cesium: 'Cesium' })]
            }
          };
        }
      }
      return userConfig;
    },

    configureServer({ middlewares }) {
      const cesiumPath = path.join(cesiumBuildRootPath, devMinifyCesium ? 'Cesium' : 'CesiumUnminified');
      middlewares.use(path.posix.join('/', globalVars.cesiumRelativeUrl), serveStatic(cesiumPath, {
        setHeaders: (res, path, stat) => {
          res.setHeader('Access-Control-Allow-Origin', '*')
        }
      }));
    },

    async closeBundle() {
      if (globalVars.isBuild) {
        try {
          await fs.copy(path.join(cesiumBuildPath, 'Assets'), path.join(globalVars.outDir, CESIUM_BASE_URL, 'Assets'));
          await fs.copy(path.join(cesiumBuildPath, 'ThirdParty'), path.join(globalVars.outDir, CESIUM_BASE_URL, 'ThirdParty'));
          await fs.copy(path.join(cesiumBuildPath, 'Workers'), path.join(globalVars.outDir, CESIUM_BASE_URL, 'Workers'));
          await fs.copy(path.join(cesiumBuildPath, 'Widgets'), path.join(globalVars.outDir, CESIUM_BASE_URL, 'Widgets'));
          if (!rebuildCesium) {
            await fs.copy(path.join(cesiumBuildPath, 'Cesium.js'), path.join(globalVars.outDir, CESIUM_BASE_URL, 'Cesium.js'));
          }
        } catch (err) {
          console.error('copy failed', err);
        }
      }
    },

    transformIndexHtml() {
      const tags: HtmlTagDescriptor[] = [
        {
          tag: 'link',
          attrs: {
            rel: 'stylesheet',
            href: normalizePath(path.join(globalVars.cesiumRelativeUrl, 'Widgets/widgets.css')),
          }
        }
      ];
      if (globalVars.isBuild && !rebuildCesium) {
        tags.push({
          tag: 'script',
          attrs: {
            src: normalizePath(path.join(globalVars.cesiumRelativeUrl, 'Cesium.js')),
          }
        });
      }
      return tags;
    }
  };
}
