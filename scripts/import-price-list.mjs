#!/usr/bin/env node
/**
 * Структурированный импорт данных из официальных прайс-листов.
 *
 * Если автоматический сбор с сайта невозможен (сайт ограничивает доступ),
 * подготовьте JSON-файл по схеме price-lists/SCHEMA.md (значения — только из
 * официального прайс-листа) и выполните:
 *
 *   node scripts/import-price-list.mjs price-lists/my-import.json
 *
 * Файл проходит нормализацию и проверку:
 *  — известные модели (slug из каталога);
 *  — цены — положительные числа;
 *  — обязательны sourceUrl и priceUpdatedAt;
 * При ошибках импорт отклоняется целиком, существующие данные не трогаем.
 * Результат пишется в src/data/haval/prices.generated.json.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(here, '..', 'src', 'data', 'haval', 'prices.generated.json')

const KNOWN_SLUGS = ['m6', 'jolion', 'dargo', 'dargo-x', 'f7', 'f7x', 'poer', 'poer-kingkong', 'h3', 'h5', 'h9', 'h7']

const file = process.argv[2]
if (!file) {
  console.error('Использование: node scripts/import-price-list.mjs <файл.json>')
  process.exit(2)
}

let doc
try {
  doc = JSON.parse(readFileSync(path.resolve(file), 'utf8'))
} catch (e) {
  console.error(`Не удалось прочитать ${file}: ${e.message}`)
  process.exit(1)
}

const errors = []
if (!doc.sourceUrl || typeof doc.sourceUrl !== 'string' || !/^https?:\/\//.test(doc.sourceUrl)) {
  errors.push('sourceUrl обязателен и должен быть ссылкой на первоисточник')
}
if (!doc.priceUpdatedAt || !/^\d{4}-\d{2}-\d{2}$/.test(String(doc.priceUpdatedAt))) {
  errors.push('priceUpdatedAt обязателен в формате YYYY-MM-DD')
}
const trims = Array.isArray(doc.trims) ? doc.trims : []
if (trims.length === 0) errors.push('trims: пустой список')

for (const [i, t] of trims.entries()) {
  const at = `trims[${i}]`
  if (!KNOWN_SLUGS.includes(t?.modelSlug)) errors.push(`${at}: неизвестная модель "${t?.modelSlug}"`)
  if (!t?.name) errors.push(`${at}: нет названия комплектации`)
  if (typeof t?.price !== 'number' || !(t.price > 0)) errors.push(`${at}: цена должна быть положительным числом`)
}

if (errors.length > 0) {
  console.error('Импорт отклонён. Ошибки:')
  for (const e of errors) console.error(` — ${e}`)
  console.error('Существующие данные НЕ изменены.')
  process.exit(1)
}

const payload = {
  fetchedAt: new Date().toISOString(),
  source: doc.sourceUrl,
  priceUpdatedAt: doc.priceUpdatedAt,
  teasers: trims.map((t) => ({
    slug: t.modelSlug,
    trimName: t.name,
    price: t.price,
    modelYear: t.modelYear ?? null,
    productionYear: t.productionYear ?? null,
    engine: t.engine ?? null,
    transmission: t.transmission ?? null,
    drivetrain: t.drivetrain ?? null,
    sourceUrl: doc.sourceUrl,
    validFrom: t.validFrom ?? null,
    fetchedAt: doc.priceUpdatedAt,
  })),
}

writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`)
console.log(`Импортировано позиций: ${payload.teasers.length} → ${path.relative(process.cwd(), OUT)}`)
