import { defineConfig, type PluginOption } from 'vite'
import { replaceHtmlPaths } from '@chain-deployed-ui/presets';
import { presetBundles } from '@chain-deployed-ui/presets/react';
import react from '@vitejs/plugin-react'
import gzipPlugin from 'rollup-plugin-gzip';
import { visualizer } from 'rollup-plugin-visualizer';

import { bosConfig } from './package.json';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(),visualizer() as PluginOption, gzipPlugin(), {
    name: 'inject-bundle-url',
    apply: 'build',
    transformIndexHtml(html ) {
      return replaceHtmlPaths(html, bosConfig.application);
    }
  }],
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
