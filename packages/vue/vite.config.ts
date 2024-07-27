import { transformUrl } from '@chain-deployed-ui/presets';
import { presetBundles } from '@chain-deployed-ui/presets/vue';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import gzipPlugin from 'rollup-plugin-gzip';

import { nearDeployConfig } from './package.json';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), gzipPlugin({ additionalFiles: ['dist/vite.svg'] })],
  experimental: {
    renderBuiltUrl(filename) {
      return transformUrl(filename, nearDeployConfig.application);
    }
  },
  define: {
    global: {},
    process: { env: {} }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          preset: presetBundles.vue,
        },
      },
    },
  },
});
