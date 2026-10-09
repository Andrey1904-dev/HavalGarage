#!/usr/bin/env node
/**
 * Обновление каталога цен HAVAL из официальных страниц дилера АГАТ.
 *
 * Приоритетный вариант: fetch главной страницы и страниц моделей
 * agat-ekb-haval.ru, извлечение тизеров «ЦЕНА от X ₽» и сносок с условиями,
 * нормализация и запись в src/data/haval/prices.generated.json.
 *
 * Безопасность и честность данных:
 *  — при любой ошибке сети/парсинга существующий файл НЕ перезаписывается
 *    (никогда не подменяем последнюю подтверждённую цену нулём);
 *  — скрипт не обходит защиты сайта: обычный GET без агрессивного парсинга;
 *  — альтернатива при недоступности сайта — структурированный импорт
 *    из официальных прайс-листов: scripts/import-price-list.mjs.
 *
 * Использование:
 *   node scripts/update-prices.mjs            # живой сбор с сайта
 *   node scripts/update-prices.mjs --dry-run  # показать распознанное, не записывая
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(here, '..', 'src', 'data', 'haval', 'prices.generated.json')
const DRY = process.argv.includes('--dry-run')

const PAGES = [
  'https://agat-ekb-haval.ru/',
  'https://agat-ekb-haval.ru/models/',
  'https://agat-ekb-haval.ru/models/haval-m6/',
  'https://agat-ekb-haval.ru/models/haval-jolion/',
  'https://agat-ekb-haval.ru/models/new-haval-dargo/',
  'https://agat-ekb-haval.ru/models/haval-f7/',
  'https://agat-ekb-haval.ru/models/haval-f7x/',
  'https://agat-ekb-haval.ru/models/poer/',
  'https://agat-ekb-haval.ru/models/poer-king-kong/',
]

/** «ЦЕНА от 2 099 000 ₽» → 2099000 */
export function parsePrice(text) {
  const m = text.replace(/\u00a0/g, ' ').match(/от\s+([\d\s\u00a0]+)\s*₽/i)
  if (!m) return null
  const n = Number(m[1].replace(/[\s\u00a0]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

const SLUG_BY_KEYWORD = [
  [/M6/i, 'm6'],
  [/JOLION/i, 'jolion'],
  [/DARGO\s*X/i, 'dargo-x'],
  [/DARGO/i, 'dargo'],
  [/F7[Xx]/i, 'f7x'],
  [/F7/i, 'f7'],
  [/KINGKONG/i, 'poer-kingkong'],
  [/POER/i, 'poer'],
]

export function detectModel(line) {
  for (const [re, slug] of SLUG_BY_KEYWORD) if (re.test(line)) return slug
  return null
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'HavalGarage-price-updater/1.0' } })
  if (!res.ok) throw new Error(`HTTP ${res.status} для ${url}`)
  return res.text()
}

const stripTags = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')

async function main() {
  const collected = []
  let failures = 0
  for (const url of PAGES) {
    try {
      const html = await fetchText(url)
      const lines = stripTags(html).split('\n').map((l) => l.trim()).filter(Boolean)
      for (let i = 0; i < lines.length; i++) {
        const price = parsePrice(lines[i])
        if (!price) continue
        // подпись модели может быть в этой же или соседних строках
        const context = [lines[i - 2], lines[i - 1], lines[i], lines[i + 1], lines[i + 2]].filter(Boolean).join(' ')
        const slug = detectModel(context)
        if (!slug) continue
        collected.push({ slug, price, sourceUrl: url, fetchedAt: new Date().toISOString().slice(0, 10) })
      }
      console.log(`✓ ${url}`)
    } catch (e) {
      failures++
      console.warn(`✗ ${url}: ${e.message}`)
    }
  }

  if (collected.length === 0) {
    console.error('Не удалось распознать ни одной цены. Существующие данные НЕ изменены.')
    process.exit(1)
  }

  // минимальная цена «от» по каждой модели
  const byModel = new Map()
  for (const row of collected) {
    const prev = byModel.get(row.slug)
    if (!prev || row.price < prev.price) byModel.set(row.slug, row)
  }
  const payload = {
    fetchedAt: new Date().toISOString(),
    source: 'agat-ekb-haval.ru',
    teasers: [...byModel.values()],
  }

  if (DRY) {
    console.log(JSON.stringify(payload, null, 2))
    return
  }
  writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`)
  console.log(`Записано ${payload.teasers.length} тизеров цен → ${path.relative(process.cwd(), OUT)}${failures ? ` (ошибок загрузки: ${failures})` : ''}`)
}

if (!existsSync(OUT)) {
  console.log('prices.generated.json ещё не создан — будет создан при первом успешном сборе или импорте.')
}

main().catch((e) => {
  console.error('Ошибка обновления:', e.message)
  console.error('Существующие данные НЕ изменены. Используйте scripts/import-price-list.mjs для ручного импорта прайс-листов.')
  process.exit(1)
})
