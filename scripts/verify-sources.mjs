#!/usr/bin/env node
/**
 * Проверка доступности официальных источников каталога.
 *
 * Что делает:
 *  — запрашивает официальную страницу каталогов haval.ru и прайс-листы/каталоги
 *    каждой модели (обычные GET-запросы, без обхода CAPTCHA и авторизации);
 *  — сверяет тизеры цен «от X ₽» на странице каталогов с ценами приложения;
 *  — пишет отчёт reports/source-check.json (не входит в Git);
 *  — с флагом --record добавляет запись в историю проверок price-history.json;
 *  — с флагом --strict завершается ошибкой, если официальный источник недоступен
 *    или обнаружено расхождение цен.
 *
 * Подтверждённые цены каталога скрипт НЕ изменяет: расхождение фиксируется
 * в отчёте и истории, решение об обновлении принимается по официальному
 * прайс-листу (scripts/import-price-list.mjs).
 *
 * Использование:
 *   node scripts/verify-sources.mjs
 *   node scripts/verify-sources.mjs --record --strict
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadCatalog } from './load-catalog.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(here, '..')
const REPORT_DIR = path.join(ROOT, 'reports')
const REPORT = path.join(REPORT_DIR, 'source-check.json')
const HISTORY = path.join(ROOT, 'src', 'data', 'haval', 'price-history.json')

const STRICT = process.argv.includes('--strict')
const RECORD = process.argv.includes('--record')
const CATALOGUES_URL = 'https://haval.ru/purchase/catalogues/'
const TIMEOUT_MS = 20_000

const today = new Date().toISOString().slice(0, 10)

async function check(url) {
  const started = Date.now()
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'HavalGarage-source-verifier/1.0' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: 'follow',
    })
    const body = res.ok ? await res.text() : ''
    return { url, status: res.status, ok: res.ok, ms: Date.now() - started, length: body.length, body }
  } catch (e) {
    return { url, status: 0, ok: false, ms: Date.now() - started, error: e.message, body: '' }
  }
}

/** «от 2 099 000 ₽» → число */
function parseTeasers(html) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const found = []
  const KEYWORDS = [
    [/DARGO\s*X/i, 'dargo-x'],
    [/DARGO/i, 'dargo'],
    [/KINGKONG/i, 'poer-kingkong'],
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
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].replace(/\u00a0/g, ' ').match(/от\s+([\d\s\u00a0]+)\s*₽/i)
    if (!m) continue
    const price = Number(m[1].replace(/[\s\u00a0]/g, ''))
    if (!Number.isFinite(price) || price <= 0) continue
    const context = lines.slice(Math.max(0, i - 3), i + 4).join(' ')
    for (const [re, slug] of KEYWORDS) {
      if (re.test(context)) {
        found.push({ slug, price })
        break
      }
    }
  }
  return found
}

function appendHistory(entry) {
  const history = existsSync(HISTORY) ? JSON.parse(readFileSync(HISTORY, 'utf8')) : { entries: [] }
  const entries = Array.isArray(history.entries) ? history.entries : []
  entries.push(entry)
  writeFileSync(HISTORY, `${JSON.stringify({ entries }, null, 2)}\n`)
}

async function main() {
  const catalog = await loadCatalog()
  const results = { checkedAt: new Date().toISOString(), catalogues: null, priceLists: [], discrepancies: [] }

  console.log(`Проверка официальных источников · ${today}`)
  console.log(`Каталог приложения: моделей ${catalog.models.length}, комплектаций ${catalog.trimsCurrent}, официальных цен ${catalog.officialPriceCount}`)

  const catalogues = await check(CATALOGUES_URL)
  results.catalogues = { url: catalogues.url, status: catalogues.status, ok: catalogues.ok, ms: catalogues.ms }
  console.log(`${catalogues.ok ? '✓' : '✗'} ${CATALOGUES_URL} — ${catalogues.status || catalogues.error}`)

  if (catalogues.ok && catalogues.body) {
    const teasers = parseTeasers(catalogues.body)
    for (const teaser of teasers) {
      const model = catalog.models.find((m) => m.id === teaser.slug)
      if (!model) continue
      // тизер «от» может включать подтверждённую выгоду (H3, H7) — это не расхождение
      if (model.priceFrom !== null && teaser.price !== model.priceFrom) {
        results.discrepancies.push({
          model: teaser.slug,
          teaserPrice: teaser.price,
          appPriceFrom: model.priceFrom,
          note: 'тизер страницы каталогов отличается от минимальной цены приложения (возможно, тизер включает выгоду)',
        })
      }
    }
    console.log(`  распознано тизеров цен: ${teasers.length}, расхождений: ${results.discrepancies.length}`)
  }

  for (const model of catalog.models) {
    if (!model.priceListUrl) {
      results.priceLists.push({ model: model.id, url: null, status: null, ok: null, note: 'прайс-лист не опубликован' })
      continue
    }
    const res = await check(model.priceListUrl)
    results.priceLists.push({ model: model.id, url: res.url, status: res.status, ok: res.ok, ms: res.ms, note: res.error ?? null })
    console.log(`${res.ok ? '✓' : '✗'} ${model.name} — прайс-лист ${res.status || res.error}`)
  }

  const failed = results.priceLists.filter((p) => p.ok === false)
  const unavailable = failed.length + (catalogues.ok ? 0 : 1)

  mkdirSync(REPORT_DIR, { recursive: true })
  writeFileSync(REPORT, JSON.stringify(results, null, 2))
  console.log(`Отчёт: ${path.relative(ROOT, REPORT)}`)

  if (RECORD) {
    appendHistory({
      checkedAt: today,
      source: CATALOGUES_URL,
      outcome: unavailable === 0 ? 'unchanged' : 'failed',
      summary:
        `Автоматическая проверка источников: страница каталогов ${catalogues.ok ? 'доступна' : 'недоступна'}, ` +
        `прайс-листов проверено ${results.priceLists.filter((p) => p.url).length}, недоступно ${failed.length}. ` +
        (results.discrepancies.length > 0
          ? `Расхождений тизеров и цен приложения: ${results.discrepancies.length} (зафиксированы в отчёте, цены каталога не изменялись).`
          : 'Расхождений тизеров и цен приложения нет.') +
        ' Подтверждённые цены каталога скриптом не изменялись.',
      models: catalog.models.map((m) => m.id),
      confirmedPrices: catalog.officialPriceCount,
      ...(unavailable > 0 ? { errors: failed.map((f) => `${f.model}: ${f.note ?? f.status}`) } : {}),
    })
    console.log('История проверок обновлена (--record).')
  }

  if (STRICT && (unavailable > 0 || results.discrepancies.length > 0)) {
    console.error('Режим --strict: обнаружены недоступные источники или расхождения цен.')
    process.exit(1)
  }
  if (unavailable > 0) {
    console.warn('Часть источников недоступна — данные каталога не изменялись и помечены как требующие проверки.')
  }
}

main().catch((e) => {
  console.error('Ошибка проверки источников:', e.message)
  if (RECORD) {
    appendHistory({
      checkedAt: today,
      source: CATALOGUES_URL,
      outcome: 'failed',
      summary: `Проверка источников завершилась ошибкой: ${e.message}. Цены каталога не изменялись.`,
      models: [],
      errors: [e.message],
    })
  }
  process.exit(1)
})
