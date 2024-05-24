import { defineConfig, type PluginOption } from 'vite';
import vue from '@vitejs/plugin-vue';
import { visualizer } from 'rollup-plugin-visualizer';

import BOSConfig from './bos.json' assert { type: 'json' };

const { environments } = BOSConfig
const { deployerAccount, fileServerUrl } = environments.testnet;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), visualizer() as PluginOption, {
    name: 'inject-bundle-url',
    apply: 'build',
    transformIndexHtml(html ) {
      return html.replace(/(href|src)="\/assets\//g, `$1="${fileServerUrl}/${deployerAccount}/`);
    }
  }],
  build: {
    rollupOptions: {
      output: {
        manualChunks: function (id, x) {
          if (id.includes('BosRoot')) {
            return 'preset';
          }

          if (id.match(/\/node_modules\/[^/]+\/@vue/g)) {
            const depRootIndex = id.indexOf('/@vue');
            if (depRootIndex > -1) {
              return id.slice(depRootIndex + 1);
            }
          }

          return 'dev'
        },
      },
    },
  },
});
