#!/usr/bin/env node
/**
 * Генерация sitemap.xml по фактическому содержимому каталога.
 *
 * В карту сайта попадают только индексируемые разделы: главная, каталог,
 * страницы моделей и основные калькуляторы. Служебные экраны (сравнение с
 * параметрами в URL, избранное, наличие) и комбинации фильтров каталога
 * не индексируются — canonical таких страниц ведёт на раздел.
 *
 * Использование:
 *   node scripts/generate-seo.mjs
 *   VITE_SITE_URL=https://example.com node scripts/generate-seo.mjs
 */
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadCatalog } from './load-catalog.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(here, '..')
const OUT = path.join(ROOT, 'public', 'sitemap.xml')

const ORIGIN = (process.env.VITE_SITE_URL ?? 'https://andrey1904-dev.github.io').replace(/\/$/, '')
const BASE = (process.env.VITE_BASE ?? '/HavalGarage').replace(/\/$/, '')

const url = (p) => `${ORIGIN}${BASE}${p}`

async function main() {
  const catalog = await loadCatalog()

  // lastmod детерминирован датой снимка каталога, а не датой запуска: иначе
  // карта сайта менялась бы каждый день и CI-проверка «sitemap актуален» падала бы
  // на следующий день после генерации без каких-либо изменений данных.
  const lastmod = catalog.lastSuccessfulCheck ?? catalog.catalogFixedAt

  const staticRoutes = [
    { path: '/', priority: '1.0', changefreq: 'weekly' },
    { path: '/catalog', priority: '0.9', changefreq: 'weekly' },
    { path: '/trims', priority: '0.8', changefreq: 'weekly' },
    { path: '/calculator', priority: '0.9', changefreq: 'weekly' },
    { path: '/budget', priority: '0.8', changefreq: 'weekly' },
    { path: '/ownership', priority: '0.7', changefreq: 'monthly' },
    { path: '/plan', priority: '0.7', changefreq: 'monthly' },
    { path: '/advisor', priority: '0.6', changefreq: 'monthly' },
    { path: '/programs', priority: '0.7', changefreq: 'weekly' },
    { path: '/sources', priority: '0.6', changefreq: 'weekly' },
  ]

  const modelRoutes = catalog.models.map((m) => ({
    path: `/models/${m.slug}`,
    priority: '0.85',
    changefreq: 'weekly',
  }))

  const all = [...staticRoutes, ...modelRoutes]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!--
  Карта сайта HavalGarage. Сгенерирована scripts/generate-seo.mjs
  по данным каталога (проверка источников: ${catalog.lastSuccessfulCheck ?? catalog.catalogFixedAt}).
  Сервис независимый и не является официальным сайтом HAVAL.
-->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${all
  .map(
    (r) => `  <url>
    <loc>${url(r.path)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`

  writeFileSync(OUT, xml)
  console.log(`sitemap.xml: ${all.length} URL → ${path.relative(ROOT, OUT)}`)
  console.log(`Каталог: моделей ${catalog.models.length}, официальных цен ${catalog.officialPriceCount}, проверка ${catalog.lastSuccessfulCheck}`)
}

main().catch((e) => {
  console.error('Не удалось сгенерировать sitemap.xml:', e.message)
  process.exit(1)
})
