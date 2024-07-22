import { defineConfig, type PluginOption } from 'vite'
import { presetBundles } from '@chain-deployed-ui/presets/react';
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer';
import gzipPlugin from 'rollup-plugin-gzip';


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(),visualizer() as PluginOption, gzipPlugin(), {
    name: 'inject-bundle-url',
    apply: 'build',
    transformIndexHtml(html ) {
      // TODO prefix root-level assets - this only removes the leading /
      return html.replace(/(href|src)="\/((?:[\w\s-]+\/)*[^/]+\.(?:js|css|svg))/g, `$1="$2`);
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
