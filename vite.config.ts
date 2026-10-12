import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Preload критичных файлов шрифта в продакшн-сборке.
 *
 * Шрифты подключаются из npm-пакетов @fontsource-variable (src/main.tsx), поэтому
 * имена файлов получают хеш только при сборке. Плагин находит в бандле
 * кириллицу и латиницу Manrope — без них не отрисуется ни один экран — и
 * добавляет <link rel="preload">: браузер начинает качать шрифт параллельно с
 * CSS, а не после его разбора, и текст меньше «прыгает» при подмене шрифта.
 * Остальные подмножества (latin-ext с «₽», моноширинный JetBrains Mono)
 * подгружаются по unicode-range по мере необходимости.
 */
function preloadCriticalFonts(patterns: RegExp[]): Plugin {
  let base = '/'
  return {
    name: 'haval-preload-critical-fonts',
    apply: 'build',
    configResolved(config) {
      base = config.base
    },
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const files = Object.values(ctx.bundle ?? {})
          .filter((chunk) => chunk.type === 'asset' && patterns.some((p) => p.test(chunk.fileName)))
          .map((chunk) => chunk.fileName)
          .sort()
        return files.map((file) => ({
          tag: 'link',
          attrs: { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: '', href: `${base}${file}` },
          injectTo: 'head' as const,
        }))
      },
    },
  }
}

// base '/HavalGarage/' нужен для продакшн-билда на GitHub Pages
// (https://<user>.github.io/HavalGarage/) и для `vite preview`, который отдаёт
// эту сборку: для него command === 'serve', и без isPreview превью раздавало
// dist из корня, а index.html ссылался на /HavalGarage/assets/… — белый экран.
// В dev-режиме используем '/', чтобы превью было доступно с корневого URL.
export default defineConfig(({ command, isPreview }) => ({
  plugins: [
    react(),
    tailwindcss(),
    preloadCriticalFonts([/manrope-cyrillic-wght-normal-[\w-]+\.woff2$/, /manrope-latin-wght-normal-[\w-]+\.woff2$/]),
  ],
  base: command === 'build' || isPreview ? '/HavalGarage/' : '/',
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
    // Шрифты никогда не встраиваются в CSS как base64: редкие подмножества
    // (cyrillic-ext и т.п.) меньше лимита в 4 КБ и иначе раздували бы
    // блокирующий отрисовку CSS для всех, хотя скачиваются по unicode-range
    // только при необходимости.
    assetsInlineLimit: (file: string) => (/\.woff2?$/.test(file) ? false : undefined),
    rollupOptions: {
      output: {
        // Функция, а не объект: в объектной форме react/jsx-runtime попадал в чанк
        // графиков (react-chartjs-2 импортирует его первым), и каждая страница
        // через modulepreload скачивала Chart.js (~60 КБ gzip), даже без графиков.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return 'react'
          if (/[\\/]node_modules[\\/](chart\.js|react-chartjs-2|@kurkle)[\\/]/.test(id)) return 'charts'
          if (/[\\/]node_modules[\\/]@supabase[\\/]/.test(id)) return 'supabase'
          return undefined
        },
      },
    },
  },
}))
