import { defineConfig, type PluginOption } from 'vite';
import vue from '@vitejs/plugin-vue';
import gzipPlugin from 'rollup-plugin-gzip';
import { visualizer } from 'rollup-plugin-visualizer';

import BOSConfig from './bos.json' assert { type: 'json' };

const { environments, filePathMatchers } = BOSConfig
const { deployerAccount, fileServerUrl } = environments.testnet;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), visualizer() as PluginOption, gzipPlugin(), {
    name: 'inject-bundle-url',
    apply: 'build',
    transformIndexHtml(html ) {
      return html.replace(/(href|src)="\/assets\/([^"]+)/g, `$1="/${deployerAccount}/$2`);
    }
  }],
  build: {
    rollupOptions: {
      output: {
        manualChunks: function (id, x) {
          if (id.includes('BosRoot')) {
            return 'preset';
          }
        },
      },
    },
  },
});
