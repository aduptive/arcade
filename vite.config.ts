import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'shared'),
    },
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        soberba: resolve(__dirname, 'games/soberba/index.html'),
        highrise: resolve(__dirname, 'games/highrise/index.html'),
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
})
