/** @type {import('vite').UserConfig} */
import { defineConfig } from 'vite'
import * as path from 'path'
import stdLibBrowser from 'node-stdlib-browser'
import vue from '@vitejs/plugin-vue'
import vueI18n from '@intlify/vite-plugin-vue-i18n'
import svgLoader from 'vite-svg-loader'
import VitePluginHtmlEnv from 'vite-plugin-html-env'
import inject from '@rollup/plugin-inject'

import nodePolyfills from 'rollup-plugin-polyfill-node'
import AutoImport from 'unplugin-auto-import/vite'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'
// https://vitejs.dev/config/
const pathSrc = path.resolve(__dirname, 'src')
export default ({ mode, command }) => {
  return defineConfig({
    plugins: [
      command === 'serve' &&
        nodePolyfills({
          include: ['node_modules/**/*.js', new RegExp('node_modules/.vite/.*js')],
        }),
      // {
      //   ...inject({
      //     global: [
      //       require.resolve("node-stdlib-browser/helpers/esbuild/shim"),
      //       "global",
      //     ],
      //     process: [
      //       require.resolve("node-stdlib-browser/helpers/esbuild/shim"),
      //       "process",
      //     ],
      //     Buffer: [
      //       require.resolve("node-stdlib-browser/helpers/esbuild/shim"),
      //       "Buffer",
      //     ],
      //   }),
      //   enforce: "post",
      // },
      vue({
        template: {
          compilerOptions: {
            isCustomElement: (tag) => tag.includes('show-'),
          },
        },
      }),
      // element-plus 按需加载
      AutoImport({
        resolvers: [
          ElementPlusResolver(),
          IconsResolver({
            prefix: 'Icon',
          }),
        ],
        dts: path.resolve(pathSrc, 'auto-imports.d.ts'),
      }),
      Components({
        resolvers: [
          ElementPlusResolver(),
          IconsResolver({
            enabledCollections: ['ep'],
          }),
        ],
        dts: path.resolve(pathSrc, 'components.d.ts'),
      }),
      Icons({
        autoInstall: true,
      }),
      // 多语言加载
      vueI18n({
        // if you want to use Vue I18n Legacy API, you need to set `compositionOnly: false`
        // compositionOnly: false,

        // you need to set i18n resource including paths !
        include: path.resolve(__dirname, './src/languages/**'),
      }),
      svgLoader(),
      VitePluginHtmlEnv(),
      createSvgIconsPlugin({
        // 指定需要缓存的图标文件夹
        iconDirs: [path.resolve(process.cwd(), 'src/assets/icons')],
        // 指定symbolId格式
        symbolId: 'icon-[dir]-[name]',

        /**
         * 自定义插入位置
         * @default: body-last
         */
        // inject?: 'body-last' | 'body-first'

        /**
         * custom dom id
         * @default: __svg__icons__dom__
        //  */
        customDomId: '__svg__icons__dom__',
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        ...stdLibBrowser,
      },
    },
    server: {
      host: true,
      // port: 8080,

      https: false,
      // open: true,
      // proxy: {
      //   '^/metasv/': {
      //     target: 'https://192.168.168.147:443',
      //     changeOrigin: true,
      //     rewrite: path => path.replace(/^\/metasv/, ''),
      //   },
      // },
    },
  })
}