import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // LM Studio
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
      // ComfyUI via helper proxy (do NOT add other /img rules elsewhere)
      '/img': {
        target: 'http://127.0.0.1:5175',
        changeOrigin: true,
      },
    },
  },
})
