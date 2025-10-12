import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@stage': fileURLToPath(new URL('./src/stage', import.meta.url)),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5137,
    proxy: {
      '/api/chat': {
        target: 'http://127.0.0.1:1234',
        changeOrigin: true,
        rewrite: () => '/v1/chat/completions',
      },
      '/api/models': {
        target: 'http://127.0.0.1:1234',
        changeOrigin: true,
        rewrite: () => '/v1/models',
      },
      // ONLY THIS /img RULE — no other /img, /img/prompt, /img/view, etc.
    '/img': {
      target: 'http://127.0.0.1:8188',
      changeOrigin: true,
      rewrite: p => p.replace(/^\/img/, ''), // /img/x -> /x
    },

    },
  },
})
