import path from 'path'
import { loadEnv, defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

const pathSrc = path.resolve(__dirname, 'src')

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd())
  return {
    build: {
      minify: 'esbuild'
    },
    esbuild: {
      drop: mode === 'development' ? undefined : ['console', 'debugger']
    },
    base: env['VITE_WEB_ROOT_PATH'],
    plugins: [
      vue(),
      AutoImport({
        imports: ['vue'],
        resolvers: [IconsResolver({ prefix: 'Icon', }), ElementPlusResolver()],
        dts: path.resolve(pathSrc, 'auto-imports.d.ts')
      }),
      Components({
        resolvers: [IconsResolver({ enabledCollections: ['ep'], }), ElementPlusResolver()],
        dts: path.resolve(pathSrc, 'components.d.ts')
      }),

      Icons({
        autoInstall: true,
      })
    ],
    resolve: {
      alias: {
        '@': pathSrc,
      },
    }
  }
})