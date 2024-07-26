import { defineConfig, type PluginOption } from 'vite'
import { transformUrl } from '@chain-deployed-ui/presets';
import { presetBundles } from '@chain-deployed-ui/presets/react';
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer';
import gzipPlugin from 'rollup-plugin-gzip';

import { nearDeployConfig } from './package.json';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(),visualizer() as PluginOption, gzipPlugin({ additionalFiles: ['vite.svg'] })],
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
          preset: presetBundles.react,
        },
      },
    },
  },
})
