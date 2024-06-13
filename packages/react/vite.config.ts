import { defineConfig, type PluginOption } from 'vite'
import { presetBundles } from '@chain-deployed-ui/presets/react';
import react from '@vitejs/plugin-react'
import gzipPlugin from 'rollup-plugin-gzip';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(),visualizer() as PluginOption, gzipPlugin(), {
    name: 'inject-bundle-url',
    apply: 'build',
    transformIndexHtml(html ) {
      // TODO prefix root-level assets
      // return html.replace(/(href|src)="\/((?:[\w\s-]+\/)*[^/]+\.js|css)/g, `$1="${deployerAccount}/$2`);
      return html;
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
          preset: presetBundles.react
        },
      },
    },
  },
})
