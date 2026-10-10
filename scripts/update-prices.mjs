#!/usr/bin/env node
/**
 * Обновление каталога цен HAVAL: проверка источников и сбор тизеров «от X ₽».
 *
 * Приоритет источников:
 *  1. ОФИЦИАЛЬНАЯ страница каталогов производителя https://haval.ru/purchase/catalogues/
 *     (тизеры цен и сноски с датами действия предложений);
 *  2. страницы официального дилера — вторичный источник (акции, архивные цены).
 *
 * Честность данных и безопасность:
 *  — при любой ошибке сети/парсинга существующие данные НЕ перезаписываются:
 *    последняя подтверждённая цена никогда не заменяется нулём или случайным значением;
 *  — ошибка фиксируется в истории проверок (price-history.json) с outcome 'failed',
 *    а собранные ранее данные помечаются как требующие проверки;
 *  — собранные тизеры не подменяют подтверждённые цены каталога: в приложении они
 *    показываются отдельной панелью «Собрано автоматически»;
 *  — скрипт не обходит CAPTCHA, авторизацию и технические ограничения сайта:
 *    выполняются обычные GET-запросы с частотой одного запроса на страницу;
 *  — это НЕ обновление в реальном времени: запуск вручную или по расписанию CI.
 *
 * Использование:
 *   node scripts/update-prices.mjs                 # сбор + запись + история
 *   node scripts/update-prices.mjs --dry-run       # показать распознанное, не записывая
 *   node scripts/update-prices.mjs --source=official  # только официальный источник
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(here, '..')
const OUT = path.join(ROOT, 'src', 'data', 'haval', 'prices.generated.json')
const HISTORY = path.join(ROOT, 'src', 'data', 'haval', 'price-history.json')

const DRY = process.argv.includes('--dry-run')
const sourceArg = (process.argv.find((a) => a.startsWith('--source=')) ?? '--source=all').split('=')[1]

const OFFICIAL_PAGES = ['https://haval.ru/purchase/catalogues/', 'https://haval.ru/models/']
const DEALER_PAGES = [
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
const PAGES = sourceArg === 'official' ? OFFICIAL_PAGES : sourceArg === 'dealer' ? DEALER_PAGES : [...OFFICIAL_PAGES, ...DEALER_PAGES]

/** «ЦЕНА от 2 099 000 ₽» → 2099000 */
export function parsePrice(text) {
  const m = text.replace(/\u00a0/g, ' ').match(/от\s+([\d\s\u00a0]+)\s*₽/i)
  if (!m) return null
  const n = Number(m[1].replace(/[\s\u00a0]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

/** «действует с 17.08.2026» → '2026-08-17' */
export function parseValidFrom(text) {
  const m = text.match(/(?:действует|актуально)\s+с\s+(\d{2})\.(\d{2})\.(\d{4})/i)
  if (!m) return null
  return `${m[3]}-${m[2]}-${m[1]}`
}

const SLUG_BY_KEYWORD = [
  [/DARGO\s*X/i, 'dargo-x'],
  [/DARGO/i, 'dargo'],
  [/KINGKONG|KING\s*KONG/i, 'poer-kingkong'],
  [/JOLION/i, 'jolion'],
  [/F7\s*[Xx]/i, 'f7x'],
  [/F7/i, 'f7'],
  [/\bM6\b/i, 'm6'],
  [/POER/i, 'poer'],
  [/\bH3\b/i, 'h3'],
  [/\bH5\b/i, 'h5'],
  [/\bH7\b/i, 'h7'],
  [/\bH9\b/i, 'h9'],
]

export function detectModel(line) {
  for (const [re, slug] of SLUG_BY_KEYWORD) if (re.test(line)) return slug
  return null
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'HavalGarage-price-updater/1.0 (+https://github.com/Andrey1904-dev/HavalGarage)' } })
  if (!res.ok) throw new Error(`HTTP ${res.status} для ${url}`)
  return res.text()
}

const stripTags = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')

function appendHistory(entry) {
  try {
    const history = existsSync(HISTORY) ? JSON.parse(readFileSync(HISTORY, 'utf8')) : { entries: [] }
    const entries = Array.isArray(history.entries) ? history.entries : []
    entries.push(entry)
    writeFileSync(HISTORY, `${JSON.stringify({ entries }, null, 2)}\n`)
    return true
  } catch (e) {
    console.warn(`Предупреждение: история не обновлена (${e.message}).`)
    return false
  }
}

function readPrevious() {
  try {
    if (!existsSync(OUT)) return null
    return JSON.parse(readFileSync(OUT, 'utf8'))
  } catch {
    return null
  }
}

async function main() {
  const collected = []
  const errors = []
  const okPages = []

  for (const url of PAGES) {
    try {
      const html = await fetchText(url)
      const lines = stripTags(html).split('\n').map((l) => l.trim()).filter(Boolean)
      for (let i = 0; i < lines.length; i++) {
        const price = parsePrice(lines[i])
        if (!price) continue
        // подпись модели может быть в этой же или соседних строках
        const context = [lines[i - 3], lines[i - 2], lines[i - 1], lines[i], lines[i + 1], lines[i + 2], lines[i + 3]]
          .filter(Boolean)
          .join(' ')
        const slug = detectModel(context)
        if (!slug) continue
        collected.push({
          slug,
          price,
          trimName: null,
          sourceUrl: url,
          validFrom: parseValidFrom(context),
          fetchedAt: new Date().toISOString().slice(0, 10),
        })
      }
      okPages.push(url)
      console.log(`✓ ${url}`)
    } catch (e) {
      errors.push(`${url}: ${e.message}`)
      console.warn(`✗ ${url}: ${e.message}`)
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const isOfficial = (url) => url.includes('haval.ru')
  const officialOk = okPages.some(isOfficial)

  if (collected.length === 0) {
    console.error('Не удалось распознать ни одной цены. Существующие данные НЕ изменены.')
    appendHistory({
      checkedAt: today,
      source: PAGES[0],
      outcome: 'failed',
      summary: `Автоматический сбор не получил данных (ошибок: ${errors.length}). Существующие цены сохранены без изменений и помечены как требующие проверки.`,
      models: [],
      errors,
    })
    process.exit(1)
  }

  // минимальная цена «от» по каждой модели; официальный источник приоритетнее
  const byModel = new Map()
  for (const row of collected) {
    const prev = byModel.get(row.slug)
    if (!prev) {
      byModel.set(row.slug, row)
      continue
    }
    const prevOfficial = isOfficial(prev.sourceUrl)
    const rowOfficial = isOfficial(row.sourceUrl)
    if (rowOfficial && !prevOfficial) byModel.set(row.slug, row)
    else if (rowOfficial === prevOfficial && row.price < prev.price) byModel.set(row.slug, row)
  }

  const previous = readPrevious()
  const changes = []
  for (const [slug, row] of byModel) {
    const before = previous?.teasers?.find((t) => t.slug === slug)
    if (!before) changes.push(`${slug}: добавлено ${row.price}`)
    else if (before.price !== row.price) changes.push(`${slug}: ${before.price} → ${row.price}`)
  }

  const payload = {
    fetchedAt: new Date().toISOString(),
    source: officialOk ? 'haval.ru (официальные каталоги) + agat-ekb-haval.ru' : 'agat-ekb-haval.ru',
    priceUpdatedAt: today,
    requiresVerification: !officialOk || errors.length > 0,
    teasers: [...byModel.values()],
  }

  if (DRY) {
    console.log(JSON.stringify(payload, null, 2))
    console.log(`Изменений относительно предыдущего сбора: ${changes.length}`)
    return
  }

  writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`)
  appendHistory({
    checkedAt: today,
    source: payload.source,
    outcome: changes.length > 0 ? 'updated' : 'unchanged',
    summary:
      `Автоматический сбор тизеров цен: моделей ${byModel.size}, страниц загружено ${okPages.length}, ошибок ${errors.length}. ` +
      (changes.length > 0 ? `Изменения: ${changes.join('; ')}. ` : 'Изменений относительно прошлого сбора нет. ') +
      'Собранные данные показываются отдельной панелью и не подменяют подтверждённые цены официальных прайс-листов.',
    models: [...byModel.keys()],
    confirmedPrices: byModel.size,
    ...(errors.length > 0 ? { errors } : {}),
  })

  console.log(
    `Записано ${payload.teasers.length} тизеров цен → ${path.relative(process.cwd(), OUT)}` +
      (errors.length ? ` (ошибок загрузки: ${errors.length})` : '') +
      (officialOk ? '' : ' · официальный источник недоступен — данные помечены как требующие проверки'),
  )
  if (!officialOk) {
    console.error('Официальный источник haval.ru не ответил: подтверждённые цены каталога не изменялись.')
    process.exit(1)
  }
}

main().catch((e) => {
  console.error('Ошибка обновления:', e.message)
  console.error('Существующие данные НЕ изменены. Используйте scripts/import-price-list.mjs для ручного импорта прайс-листов.')
  appendHistory({
    checkedAt: new Date().toISOString().slice(0, 10),
    source: PAGES[0],
    outcome: 'failed',
    summary: `Сбой обновления: ${e.message}. Данные каталога сохранены без изменений.`,
    models: [],
    errors: [e.message],
  })
  process.exit(1)
})
