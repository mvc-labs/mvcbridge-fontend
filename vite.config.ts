/** @type {import('vite').UserConfig} */
import { defineConfig } from 'vite'
import * as path from 'path'
import stdLibBrowser from 'node-stdlib-browser'
import vue from '@vitejs/plugin-vue'
import vueI18n from '@intlify/vite-plugin-vue-i18n'
import svgLoader from 'vite-svg-loader'
import VitePluginHtmlEnv from 'vite-plugin-html-env'
import inject from '@rollup/plugin-inject'
import { viteExternalsPlugin } from 'vite-plugin-externals'
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
  const productionEnvs = ['mainnet']
  const isProduction = productionEnvs.includes(mode) && command === 'build' ? true : false
  // const isProduction = command === 'build'
  return defineConfig({
    plugins: [
      command === 'serve' &&
        nodePolyfills({
          include: ['node_modules/**/*.js', new RegExp('node_modules/.vite/.*js')],
        }),
      {
        ...inject({
          global: [require.resolve('node-stdlib-browser/helpers/esbuild/shim'), 'global'],
          process: [require.resolve('node-stdlib-browser/helpers/esbuild/shim'), 'process'],
          Buffer: [require.resolve('node-stdlib-browser/helpers/esbuild/shim'), 'Buffer'],
        }),
        enforce: 'post',
      },
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
      viteExternalsPlugin({
        'mvc-lib': 'mvc',
        'mvc-lib/ecies': 'ECIES',
        'mvc-lib/mnemonic': 'Mnemonic',
        bip39: 'bip39',
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        ...stdLibBrowser,
      },
    },
    optimizeDeps: {
      include: ['buffer', 'process'],
    },
    server: {
      host: true,
      // port: 8080,

      https: false,
      proxy: {},
      // open: true,
      // proxy: {
      //   '^/metasv/': {
      //     target: 'https://192.168.168.147:443',
      //     changeOrigin: true,
      //     rewrite: path => path.replace(/^\/metasv/, ''),
      //   },
      // },
    },
    esbuild: {
      drop: command === 'build' ? ['console', 'debugger'] : [],
    },
    build: {
      target: isProduction ? 'es2015' : 'modules',
      minify: isProduction,

      sourcemap: isProduction ? false : 'inline',
      rollupOptions: {
        plugins: [nodePolyfills()],
        output: {
          sourcemap: isProduction ? false : 'inline',
        },
      },
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
  })
}
