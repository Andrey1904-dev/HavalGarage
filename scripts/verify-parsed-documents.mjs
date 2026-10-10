#!/usr/bin/env node
/**
 * Сверка каталога с официальными прайс-листами по заранее сохранённому
 * тексту документов (tests/fixtures/).
 *
 * Зачем: пайплайн `npm run catalog import` требует доступа к haval.ru, а в
 * изолированном окружении (и при лимите сети) запрос недоступен. Этот скрипт
 * прогоняет тот же самый разбор и то же самое сравнение, но по сохранённому
 * тексту официальных документов, и отвечает на вопрос: совпадают ли цены
 * приложения с официальными прайс-листами.
 *
 * Запуск: node scripts/verify-parsed-documents.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadCatalog } from './load-catalog.mjs'
import { parsePriceListText, validateParsed, normalizeParsedRows } from './lib/parse-price-list.mjs'
import { diffPrices } from './lib/diff.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(here, '..')
const FIXTURES = [
  { slug: 'm6', file: 'tests/fixtures/price-list-m6.txt', url: 'https://cdn.perxis.ru/originals/da1hsh8beucc73999j3g/original' },
  { slug: 'jolion', file: 'tests/fixtures/price-list-jolion.txt', url: 'https://cdn.perxis.ru/originals/da1hsmobeucc73999j40/original' },
]

const catalog = await loadCatalog()
const rows = []
let failed = 0

console.log('Сверка каталога с текстом официальных прайс-листов\n')

for (const fixture of FIXTURES) {
  const text = readFileSync(path.join(ROOT, fixture.file), 'utf8')
  const parsed = parsePriceListText(text, { modelSlug: fixture.slug, url: fixture.url })
  const validation = validateParsed(parsed)
  console.log(`${fixture.slug}: модельный год ${parsed.modelYear}, год выпуска ${parsed.productionYear}, действует с ${parsed.effectiveFrom ?? '—'}`)
  console.log(`  извлечено записей: ${parsed.rows.length} · проверка: ${validation.ok ? 'пройдена' : 'НЕ пройдена'}`)
  for (const w of validation.warnings) console.log(`  ! ${w}`)
  for (const e of validation.errors) console.log(`  ✗ ${e}`)
  for (const row of parsed.rows) console.log(`  · ${row.name} — ${row.price.toLocaleString('ru-RU')} ₽`)
  if (!validation.ok) failed++
  if (validation.ok) rows.push(...normalizeParsedRows(parsed))
  console.log('')
}

const diff = diffPrices(rows, catalog.trims, { coveredModelIds: [...new Set(rows.map((r) => r.modelSlug))] })
console.log('Сравнение с каталогом приложения:')
console.log(`  совпало: ${diff.unchanged.length} · расхождений: ${diff.changed.length} · новых: ${diff.added.length} · отсутствует в документах: ${diff.missing.length} · неоднозначных: ${diff.ambiguous.length}`)
for (const c of diff.changed) {
  console.log(`  ≠ ${c.trimId}: в каталоге ${c.previousPrice.toLocaleString('ru-RU')} ₽, в документе ${c.newPrice.toLocaleString('ru-RU')} ₽`)
}
for (const a of diff.added) console.log(`  + ${a.modelSlug} «${a.name}» — ${a.price.toLocaleString('ru-RU')} ₽ (в каталоге нет)`)
for (const m of diff.missing) console.log(`  − ${m.trimId} (${m.price.toLocaleString('ru-RU')} ₽) не найдена в документах`)
for (const x of diff.ambiguous) console.log(`  ? ${x.row.name}: ${x.reason}`)

mkdirSync(path.join(ROOT, 'reports'), { recursive: true })
writeFileSync(
  path.join(ROOT, 'reports', 'fixture-verification.json'),
  `${JSON.stringify({ checkedAt: new Date().toISOString(), fixtures: FIXTURES.map((f) => f.slug), diff }, null, 2)}\n`,
)

// Успех — это не только отсутствие ошибок разбора: любое расхождение с
// каталогом (изменённая, новая, пропавшая или неоднозначная позиция) означает,
// что данные приложения нужно пересмотреть, поэтому все четыре списка обязаны
// быть пустыми, а список совпадений — непустым.
const problems = [
  ['изменённых цен', diff.changed.length],
  ['новых позиций в документах', diff.added.length],
  ['позиций каталога, отсутствующих в документах', diff.missing.length],
  ['неоднозначных сопоставлений', diff.ambiguous.length],
].filter(([, count]) => count > 0)

const ok = failed === 0 && problems.length === 0 && diff.unchanged.length > 0
if (failed > 0) console.log(`\n✗ разбор не прошёл проверку у ${failed} из ${FIXTURES.length} документов`)
for (const [label, count] of problems) console.log(`\n✗ обнаружено: ${label} — ${count}`)
if (diff.unchanged.length === 0) console.log('\n✗ ни одна позиция каталога не совпала с документами')
console.log(`\nИтог: ${ok ? 'цены каталога совпадают с официальными документами' : 'обнаружены расхождения — см. вывод выше'}`)
process.exit(ok ? 0 : 1)
