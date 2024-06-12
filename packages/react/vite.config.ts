import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import gzipPlugin from 'rollup-plugin-gzip';
import { visualizer } from 'rollup-plugin-visualizer';

import BOSConfig from './bos.json' assert { type: 'json' };

const { environments } = BOSConfig
const { deployerAccount, fileServerUrl } = environments.testnet;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(),visualizer() as PluginOption, gzipPlugin(), {
    name: 'inject-bundle-url',
    apply: 'build',
    transformIndexHtml(html ) {
      return html.replace(/(href|src)="\/assets\//g, `$1="${fileServerUrl}/${deployerAccount}/`);
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
          preset: ['@chain-deployed-ui/presets', 'react', 'react-dom']
        },
      },
    },
  },
})
