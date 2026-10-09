import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base '/HavalGarage/' нужен только для продакшн-билда на GitHub Pages
// (https://<user>.github.io/HavalGarage/). В dev-режиме используем '/',
// чтобы превью было доступно сразу с корневого URL.
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  base: command === 'build' ? '/HavalGarage/' : '/',
  server: {
    // разрешаем превью-хосты песочницы (*.e2b.app)
    host: true,
    allowedHosts: ['.e2b.app', 'localhost', '127.0.0.1'],
  },
  preview: {
    host: true,
    allowedHosts: ['.e2b.app', 'localhost', '127.0.0.1'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['chart.js', 'react-chartjs-2'],
        },
      },
    },
  },
}))
