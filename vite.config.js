import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // POST /api/chat -> http://127.0.0.1:1234/v1/chat/completions
      '/api/chat': {
        target: 'http://127.0.0.1:1234',
        changeOrigin: true,
        rewrite: () => '/v1/chat/completions',
      },
      // GET /api/models -> http://127.0.0.1:1234/v1/models (optional)
      '/api/models': {
        target: 'http://127.0.0.1:1234',
        changeOrigin: true,
        rewrite: () => '/v1/models',
      },
    },
  },
})
