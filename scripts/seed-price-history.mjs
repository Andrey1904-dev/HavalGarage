#!/usr/bin/env node
/**
 * Стартовая точка истории цен по комплектациям.
 *
 * История начинает собираться с первого подтверждённого импорта: фиктивная
 * ретроспектива по предположениям не строится. Скрипт добавляет в
 * src/data/haval/price-changes.json две группы точек:
 *
 *  1. 'manual'  — подтверждённая цена из официального прайс-листа на дату
 *     начала её действия (или на дату снимка каталога);
 *  2. 'archive' — архивная цена прошлого модельного/производственного года
 *     той же комплектации, если сохранился документ-источник.
 *
 * Скрипт идемпотентен: существующие точки не удаляются и не изменяются,
 * добавляются только отсутствующие. Запуск:
 *
 *   node scripts/seed-price-history.mjs [--dry-run]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadCatalog } from './load-catalog.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(here, '..')
const OUT = path.join(ROOT, 'src', 'data', 'haval', 'price-changes.json')
const DRY_RUN = process.argv.includes('--dry-run')

/** Приведение названия комплектации к сопоставимому виду */
function normalizeName(name) {
  let s = String(name ?? '')
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, ' ') // «(2026 м.г.)», «(2024 г.в.)»
    .replace(/[«»"',./-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  // официальные документы называют одну и ту же комплектацию по-разному
  const aliases = [
    [/тех\s*плюс/g, 'техно +'],
    [/техно\s*плюс/g, 'техно +'],
    [/техно\s*\+\s*plus/g, 'техно +'],
  ]
  for (const [re, to] of aliases) s = s.replace(re, to)
  return s
}

const PLACEHOLDER = /тизер|комплектация не раскрыта/i

async function main() {
  const catalog = await loadCatalog()
  const current = catalog.trims.filter((t) => t.status === 'current' && t.basePrice !== null)
  const archived = catalog.trims.filter((t) => t.status === 'archive' && t.basePrice !== null)

  const existing = JSON.parse(readFileSync(OUT, 'utf8'))
  const changes = Array.isArray(existing.changes) ? existing.changes : []
  const known = new Set(changes.map((c) => c.id))

  const added = []
  const unmatched = []

  // 1) подтверждённые цены текущих комплектаций
  for (const t of current) {
    if (PLACEHOLDER.test(t.name)) continue // тизер без раскрытой комплектации — не точка истории
    const date = t.priceValidFrom ?? catalog.catalogFixedAt
    const priceType = t.priceType ?? 'msrp'
    const id = `pc-${t.id}-${date}-${priceType}`
    if (known.has(id)) continue
    added.push({
      id,
      trimId: t.id,
      previousPrice: null,
      newPrice: t.basePrice,
      previousPriceType: null,
      newPriceType: priceType,
      changedAt: date,
      sourceUrl: t.priceSourceUrl,
      origin: 'manual',
      note:
        t.priceValidFrom === null
          ? 'Дата начала действия в официальном документе не указана — указана дата снимка каталога.'
          : null,
    })
    known.add(id)
  }

  // 2) архивные цены прошлых лет той же комплектации
  const byKey = new Map()
  for (const t of current) {
    const key = `${t.modelId}::${normalizeName(t.name)}`
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key).push(t)
  }

  for (const a of archived) {
    const key = `${a.modelId}::${normalizeName(a.name)}`
    const candidates = byKey.get(key) ?? []
    let target = null
    if (candidates.length === 1) {
      target = candidates[0]
    } else if (candidates.length > 1) {
      // Одна модель может иметь несколько актуальных поколений (DARGO 2025 и 2026 м.г.).
      // Архивную запись относим к ближайшему по модельному году поколению.
      const withDistance = candidates
        .map((c) => ({ c, d: c.modelYear === null || a.modelYear === null ? 99 : Math.abs(c.modelYear - a.modelYear) }))
        .sort((x, y) => x.d - y.d)
      if (withDistance.length > 1 && withDistance[0].d === withDistance[1].d) {
        unmatched.push({
          archivedTrimId: a.id,
          name: a.name,
          reason: `неоднозначное совпадение (${candidates.length}, одинаковое расстояние по модельному году)`,
        })
        continue
      }
      target = withDistance[0].c
    }
    if (!target) {
      unmatched.push({
        archivedTrimId: a.id,
        name: a.name,
        reason: 'нет текущей комплектации с таким названием',
      })
      continue
    }
    const date = a.priceValidFrom ?? (a.productionYear ? `${a.productionYear}-01-01` : catalog.catalogFixedAt)
    const priceType = a.priceType ?? 'msrp'
    const id = `pc-${target.id}-${date}-${priceType}-archive`
    if (known.has(id)) continue
    added.push({
      id,
      trimId: target.id,
      previousPrice: null,
      newPrice: a.basePrice,
      previousPriceType: null,
      newPriceType: priceType,
      changedAt: date,
      sourceUrl: a.priceSourceUrl,
      origin: 'archive',
      note: `Архивная запись ${a.id} (${a.productionYear ?? '—'} г.в., ${a.modelYear ?? '—'} м.г.).`,
    })
    known.add(id)
  }

  console.log(`История цен: существующих точек ${changes.length}, новых ${added.length}.`)
  if (unmatched.length > 0) {
    console.log('Архивные записи без однозначного соответствия (в историю не включены):')
    for (const u of unmatched) console.log(` — ${u.archivedTrimId} («${u.name}»): ${u.reason}`)
  }

  if (DRY_RUN) {
    for (const a of added) console.log(` + ${a.trimId} · ${a.changedAt} · ${a.newPrice} ₽ · ${a.origin}`)
    console.log('--dry-run: файл не изменён.')
    return
  }

  const merged = [...changes, ...added].sort(
    (a, b) => a.trimId.localeCompare(b.trimId) || a.changedAt.localeCompare(b.changedAt),
  )
  writeFileSync(OUT, `${JSON.stringify({ _comment: existing._comment, changes: merged }, null, 2)}\n`)
  console.log(`Записано точек: ${merged.length} → ${path.relative(ROOT, OUT)}`)
}

main().catch((e) => {
  console.error('Ошибка формирования истории цен:', e.message)
  process.exit(1)
})
