import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

import BOSConfig from './bos.json' assert { type: 'json' };

const { deployerAccount, fileServerUrl } = BOSConfig.environments.testnet;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), {
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
          if (id.includes('/src/components/')) {
            return 'dev';
          }
        },
      },
    },
  },
});
