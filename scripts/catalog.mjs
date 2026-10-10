#!/usr/bin/env node
/**
 * Пайплайн импорта официального каталога HAVAL.
 *
 * Команды:
 *   discover  — обнаружить официальные документы на haval.ru/purchase/catalogues/;
 *   import    — загрузить документы, извлечь данные, нормализовать, проверить;
 *   validate  — проверить целостность текущего каталога;
 *   diff      — сравнить результат последнего импорта с каталогом;
 *   report    — сформировать отчёт об изменениях (журнал + Markdown);
 *   seed      — стартовая точка истории цен;
 *   full      — полный цикл: discover → import → validate → diff → report.
 *
 * Безопасное обновление (принцип из архитектуры данных):
 *   1. импорт во временный набор (reports/);
 *   2. проверка обязательных полей;
 *   3. сравнение с текущими данными;
 *   4. список изменений;
 *   5. применение только валидных изменений — и то лишь с флагом --apply;
 *   6. сохранение истории;
 *   7. фиксация результата в отчёте.
 *
 * Подтверждённые цены каталога НИКОГДА не заменяются неполным результатом
 * импорта: если документ не разобран, он попадает в список ручной проверки.
 *
 * Использование:
 *   npm run catalog -- discover
 *   npm run catalog -- import [--model=m6] [--apply]
 *   npm run catalog -- validate
 *   npm run catalog -- diff
 *   npm run catalog -- report [--apply]
 *   npm run catalog -- full [--apply]
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadCatalog } from './load-catalog.mjs'
import { fetchDocumentThrottled, USER_AGENT } from './lib/fetcher.mjs'
import { extractPdfText, looksLikePdf, isPdfExtractionAvailable } from './lib/pdf-text.mjs'
import { parseCataloguesPage, CATALOGUES_URL } from './lib/discover.mjs'
import { parsePriceListText, validateParsed, normalizeParsedRows } from './lib/parse-price-list.mjs'
import { diffPrices, diffDocuments, diffOffers, buildChangeEvents } from './lib/diff.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(here, '..')
const REPORTS = path.join(ROOT, 'reports')
const REGISTRY_PATH = path.join(ROOT, 'src', 'data', 'haval', 'source-documents.json')
const HISTORY_PATH = path.join(ROOT, 'src', 'data', 'haval', 'price-history.json')
const CHANGES_PATH = path.join(ROOT, 'src', 'data', 'haval', 'catalog-changes.json')
const PRICE_CHANGES_PATH = path.join(ROOT, 'src', 'data', 'haval', 'price-changes.json')
const LATEST_IMPORT = path.join(REPORTS, 'catalog-import-latest.json')

const args = process.argv.slice(2)
const command = args.find((a) => !a.startsWith('-')) ?? 'full'
const flags = new Map(
  args
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [key, value] = a.replace(/^--/, '').split('=')
      return [key, value ?? true]
    }),
)
const has = (name) => flags.has(name)
const value = (name) => flags.get(name)
const today = new Date().toISOString().slice(0, 10)

const ensureReports = () => mkdirSync(REPORTS, { recursive: true })

function startRun(commandName) {
  return {
    command: commandName,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    sources: 0,
    documentsProcessed: 0,
    documentsParsed: 0,
    documentsNeedsReview: [],
    documentsUnavailable: [],
    newModels: 0,
    newTrims: 0,
    changedPrices: 0,
    errors: [],
    warnings: [],
    applied: false,
    artifacts: [],
  }
}

function finishRun(run) {
  run.finishedAt = new Date().toISOString()
  run.durationMs = new Date(run.finishedAt) - new Date(run.startedAt)
  return run
}

function readJson(file, fallback) {
  if (!existsSync(file)) return fallback
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

const writeJson = (file, data) => {
  ensureReports()
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`)
  return path.relative(ROOT, file)
}

/* ------------------------------------------------------------------ */
/*  discover                                                           */
/* ------------------------------------------------------------------ */

async function cmdDiscover(run, catalog) {
  console.log(`Поиск официальных документов: ${CATALOGUES_URL}`)
  const res = await fetchDocumentThrottled(CATALOGUES_URL, { accept: 'text/html', delayMs: 0 })
  if (!res.ok) {
    run.errors.push(`страница каталогов недоступна: ${res.error ?? res.status}`)
    console.error(`✗ страница каталогов недоступна (${res.error ?? res.status})`)
    return null
  }
  const parsed = parseCataloguesPage(res.body.toString('utf8'))
  run.sources = 1
  run.documentsProcessed = parsed.documents.length
  for (const issue of parsed.issues) run.warnings.push(issue)

  const discovered = {
    checkedAt: new Date().toISOString(),
    url: CATALOGUES_URL,
    checksum: res.checksum,
    documents: parsed.documents,
    teasers: parsed.teasers,
    issues: parsed.issues,
  }
  const file = writeJson(path.join(REPORTS, 'catalog-discovery.json'), discovered)
  run.artifacts.push(file)
  console.log(`✓ документов найдено: ${parsed.documents.length} (прайс-листов ${parsed.documents.filter((d) => d.documentType === 'price-list').length}, каталогов ${parsed.documents.filter((d) => d.documentType === 'catalogue').length})`)
  console.log(`  тизеров цен распознано: ${parsed.teasers.length}`)

  // сверка тизеров с минимальными ценами каталога
  for (const teaser of parsed.teasers) {
    const model = catalog.models.find((m) => m.id === teaser.slug)
    if (!model || model.priceFrom === null) continue
    if (model.priceFrom !== teaser.price) {
      const msg = `${model.name}: тизер «от ${teaser.price.toLocaleString('ru-RU')} ₽» отличается от минимальной цены каталога ${model.priceFrom.toLocaleString('ru-RU')} ₽ (тизер может включать выгоду)`
      run.warnings.push(msg)
      console.log(`  ! ${msg}`)
    }
  }
  return discovered
}

/* ------------------------------------------------------------------ */
/*  import                                                            */
/* ------------------------------------------------------------------ */

async function cmdImport(run, catalog, discovery) {
  const registry = readJson(REGISTRY_PATH, { documents: [] })
  const registryDocs = registry.documents ?? []
  const modelFilter = value('model')
  const pdfAvailable = await isPdfExtractionAvailable()
  if (!pdfAvailable) {
    run.errors.push('извлечение текста из PDF недоступно (не установлен unpdf) — документы отправлены в ручную проверку')
  }

  // документы берём из последнего discovery или из реестра
  let documents = (discovery?.documents ?? []).filter((d) => d.documentType === 'price-list')
  if (documents.length === 0) {
    documents = registryDocs
      .filter((d) => d.documentType === 'price-list' && d.url)
      .map((d) => ({ url: d.url, modelId: d.modelId, label: d.label, documentType: d.documentType }))
  }
  if (modelFilter) documents = documents.filter((d) => d.modelId === modelFilter)

  const uniqueDocs = []
  const seen = new Set()
  for (const d of documents) {
    const key = `${d.modelId}::${d.url}`
    if (seen.has(key)) continue
    seen.add(key)
    uniqueDocs.push(d)
  }

  run.sources = new Set(uniqueDocs.map((d) => d.url)).size

  const results = []
  const parsedRowsAll = []
  const discoveredDocs = []

  for (const doc of uniqueDocs) {
    const known = registryDocs.find((d) => d.url === doc.url && d.modelId === doc.modelId)
    const expected = known?.extractedPrices ?? null
    console.log(`→ ${doc.modelId ?? '—'} · ${doc.label ?? doc.documentType}`)
    const fetched = await fetchDocumentThrottled(doc.url, { accept: 'application/pdf,*/*' })
    const entry = {
      url: doc.url,
      modelId: doc.modelId ?? null,
      label: doc.label ?? null,
      documentType: doc.documentType,
      status: fetched.status,
      bytes: fetched.bytes,
      checksum: fetched.checksum,
      fetchedAt: today,
      parsingStatus: 'pending',
      extractedPrices: 0,
      notes: null,
      errors: [],
    }
    run.documentsProcessed += 1
    discoveredDocs.push({ url: doc.url, modelId: doc.modelId, checksum: fetched.checksum, label: doc.label, documentType: doc.documentType })

    if (!fetched.ok) {
      entry.parsingStatus = 'unavailable'
      entry.notes = `документ недоступен: ${fetched.error ?? fetched.status}`
      entry.errors.push(entry.notes)
      run.documentsUnavailable.push(doc.url)
      run.errors.push(`${doc.modelId}: документ недоступен (${fetched.error ?? fetched.status})`)
      console.log(`  ✗ недоступен (${fetched.error ?? fetched.status})`)
      results.push(entry)
      continue
    }

    if (!looksLikePdf(fetched.body)) {
      entry.parsingStatus = 'needs-manual-review'
      entry.notes = 'содержимое не является PDF — формат документа изменился'
      entry.errors.push(entry.notes)
      run.documentsNeedsReview.push(doc.url)
      run.warnings.push(`${doc.modelId}: содержимое не PDF`)
      console.log('  ! содержимое не PDF')
      results.push(entry)
      continue
    }

    if (!pdfAvailable) {
      entry.parsingStatus = 'needs-manual-review'
      entry.notes = 'извлечение текста из PDF недоступно'
      run.documentsNeedsReview.push(doc.url)
      results.push(entry)
      continue
    }

    const extracted = await extractPdfText(fetched.body)
    if (!extracted.ok) {
      entry.parsingStatus = 'needs-manual-review'
      entry.notes = extracted.error
      entry.errors.push(extracted.error)
      run.documentsNeedsReview.push(doc.url)
      run.warnings.push(`${doc.modelId}: ${extracted.error}`)
      console.log(`  ! ${extracted.error}`)
      results.push(entry)
      continue
    }

    const parsed = parsePriceListText(extracted.text, {
      modelSlug: doc.modelId,
      url: doc.url,
      expectedTrims: expected,
    })
    const validation = validateParsed(parsed)
    const rows = validation.ok ? normalizeParsedRows(parsed) : []

    entry.extractedPrices = rows.length
    entry.notes = parsed.issues.length > 0 ? parsed.issues.join('; ') : null
    entry.pages = extracted.pages
    entry.modelYear = parsed.modelYear
    entry.productionYear = parsed.productionYear
    entry.effectiveFrom = parsed.effectiveFrom
    entry.errors = validation.errors
    entry.warnings = validation.warnings

    if (validation.ok) {
      entry.parsingStatus = 'parsed'
      run.documentsParsed += 1
      parsedRowsAll.push(...rows)
      console.log(`  ✓ записей: ${rows.length}${parsed.issues.length > 0 ? ' (есть замечания)' : ''}`)
      for (const w of validation.warnings) console.log(`    ! ${w}`)
    } else {
      entry.parsingStatus = 'needs-manual-review'
      run.documentsNeedsReview.push(doc.url)
      run.warnings.push(`${doc.modelId}: разбор не прошёл проверку — ${validation.errors.join('; ')}`)
      console.log(`  ✗ разбор не прошёл проверку: ${validation.errors.join('; ')}`)
    }
    results.push(entry)
  }

  // безопасное обновление: результат только во временный набор
  const payload = {
    importedAt: new Date().toISOString(),
    documents: results,
    rows: parsedRowsAll,
    coveredModelIds: [...new Set(results.filter((r) => r.parsingStatus === 'parsed').map((r) => r.modelId).filter(Boolean))],
  }
  // Неудачный запуск не должен стирать результат предыдущего успешного
  // импорта: он нужен команде diff как точка сравнения. Пустой результат
  // сохраняется только под отдельным именем и явно помечается.
  if (parsedRowsAll.length === 0) {
    const emptyWarning = 'импорт не дал ни одной позиции — результат предыдущего запуска (reports/catalog-import-latest.json) сохранён'
    run.warnings.push(emptyWarning)
    writeJson(path.join(REPORTS, `catalog-import-empty-${today}.json`), payload)
    run.artifacts.push(path.join('reports', `catalog-import-empty-${today}.json`))
    console.log(`! ${emptyWarning}`)
  } else {
    const file = writeJson(LATEST_IMPORT, payload)
    writeJson(path.join(REPORTS, `catalog-import-${today}.json`), payload)
    run.artifacts.push(file)
  }
  run.newTrims = 0 // заполняется командой diff

  if (has('update-registry')) {
    const byKey = new Map(registryDocs.map((d) => [`${d.modelId}::${d.url}`, d]))
    for (const r of results) {
      const key = `${r.modelId}::${r.url}`
      const known = byKey.get(key)
      if (known) {
        known.fetchedAt = r.fetchedAt
        known.checksum = r.checksum
        known.parsingStatus = r.parsingStatus
        known.extractedPrices = r.extractedPrices
        known.notes = r.notes
        known.publicationDate = r.effectiveFrom ?? known.publicationDate
      } else {
        registryDocs.push({
          id: `auto-${r.modelId ?? 'unknown'}-${(r.checksum ?? '').slice(0, 8)}`,
          url: r.url,
          documentType: r.documentType,
          modelId: r.modelId,
          label: r.label,
          publicationDate: r.effectiveFrom ?? null,
          fetchedAt: r.fetchedAt,
          checksum: r.checksum,
          parsingStatus: r.parsingStatus,
          extractedPrices: r.extractedPrices,
          notes: r.notes,
        })
      }
    }
    writeFileSync(REGISTRY_PATH, `${JSON.stringify({ _comment: registry._comment, documents: registryDocs }, null, 2)}\n`)
    run.artifacts.push(path.relative(ROOT, REGISTRY_PATH))
    console.log(`Реестр документов обновлён: ${path.relative(ROOT, REGISTRY_PATH)}`)
  }

  return { payload, discoveredDocs, results }
}

/* ------------------------------------------------------------------ */
/*  validate                                                          */
/* ------------------------------------------------------------------ */

function cmdValidate(run, catalog) {
  const errors = []
  const warnings = []

  const ids = new Set()
  for (const t of catalog.trims) {
    if (ids.has(t.id)) errors.push(`дублирующийся идентификатор комплектации: ${t.id}`)
    ids.add(t.id)
    if (!catalog.models.some((m) => m.id === t.modelId)) {
      errors.push(`комплектация ${t.id} ссылается на несуществующую модель ${t.modelId}`)
    }
    if (t.basePrice !== null && !(t.basePrice > 0)) errors.push(`некорректная цена у ${t.id}`)
    if (!/^https?:\/\//.test(t.priceSourceUrl ?? '')) errors.push(`нет ссылки на первоисточник у ${t.id}`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t.priceUpdatedAt ?? '')) errors.push(`нет даты фиксации у ${t.id}`)
    if (t.status === 'current' && t.basePrice === null) {
      warnings.push(`у текущей комплектации ${t.id} нет подтверждённой цены`)
    }
  }

  const modelIds = new Set(catalog.models.map((m) => m.id))
  for (const p of catalog.prices) {
    if (!modelIds.has(p.modelId)) errors.push(`цена ${p.id} ссылается на неизвестную модель ${p.modelId}`)
    if (!ids.has(p.trimId)) errors.push(`цена ${p.id} ссылается на неизвестную комплектацию ${p.trimId}`)
    if (!/^https?:\/\//.test(p.sourceUrl ?? '')) errors.push(`нет ссылки на первоисточник у цены ${p.id}`)
  }

  for (const o of catalog.offers) {
    for (const m of o.modelIds) if (!modelIds.has(m)) errors.push(`предложение ${o.id} ссылается на неизвестную модель ${m}`)
    if (o.validFrom && o.validUntil && o.validFrom > o.validUntil) {
      errors.push(`предложение ${o.id}: дата начала позже даты окончания`)
    }
  }

  for (const m of catalog.models) {
    if (m.priceListUrl === null) warnings.push(`у модели ${m.id} не опубликован официальный прайс-лист`)
  }

  const registry = readJson(REGISTRY_PATH, { documents: [] }).documents ?? []
  for (const d of registry) {
    if (d.url && !/^https?:\/\//.test(d.url)) errors.push(`документ ${d.id}: некорректная ссылка`)
  }

  run.errors.push(...errors)
  run.warnings.push(...warnings)
  console.log(`Каталог: моделей ${catalog.models.length}, комплектаций ${catalog.trims.length}, цен ${catalog.prices.length}`)
  console.log(errors.length === 0 ? '✓ ошибок целостности нет' : `✗ ошибок: ${errors.length}`)
  for (const e of errors) console.log(`  — ${e}`)
  if (warnings.length > 0) {
    console.log(`Предупреждений: ${warnings.length}`)
    for (const w of warnings.slice(0, 20)) console.log(`  — ${w}`)
  }
  return { ok: errors.length === 0, errors, warnings }
}

/* ------------------------------------------------------------------ */
/*  diff                                                              */
/* ------------------------------------------------------------------ */

function cmdDiff(run, catalog, importResult) {
  const payload = importResult?.payload ?? readJson(LATEST_IMPORT, null)
  if (!payload) {
    run.errors.push('нет результата импорта — сначала выполните `npm run catalog -- import`')
    console.error('✗ нет результата импорта (reports/catalog-import-latest.json)')
    return null
  }

  // Пустой результат импорта означает, что документы не были получены или не
  // разобраны. Сравнивать в этом случае нечего: все позиции каталога окажутся
  // «отсутствующими в импорте», и это нельзя выдавать за изменение данных.
  if ((payload.rows ?? []).length === 0) {
    const emptyRowsWarning = 'импорт не дал ни одной позиции — сравнение невозможно, состояние каталога не оценено'
    run.warnings.push(emptyRowsWarning)
    console.log(`! ${emptyRowsWarning}`)
    writeJson(path.join(REPORTS, 'catalog-diff.json'), {
      diffedAt: new Date().toISOString(),
      coveredModelIds: payload.coveredModelIds ?? [],
      emptyImport: true,
      prices: { unchanged: [], changed: [], added: [], missing: [], ambiguous: [] },
      documents: { newDocuments: [], updatedDocuments: [], missingDocuments: [] },
      newModels: [],
    })
    return null
  }

  const priceDiff = diffPrices(payload.rows, catalog.trims, { coveredModelIds: payload.coveredModelIds })
  const registry = readJson(REGISTRY_PATH, { documents: [] }).documents ?? []
  const documentDiff = diffDocuments(importResult?.discoveredDocs ?? [], registry)

  const modelIdsInImport = [...new Set(payload.rows.map((r) => r.modelSlug))]
  run.newModels = modelIdsInImport.filter((id) => !catalog.models.some((m) => m.id === id)).length
  run.newTrims = priceDiff.added.length
  run.changedPrices = priceDiff.changed.length

  const diff = {
    diffedAt: new Date().toISOString(),
    coveredModelIds: payload.coveredModelIds,
    prices: priceDiff,
    documents: documentDiff,
    newModels: modelIdsInImport.filter((id) => !catalog.models.some((m) => m.id === id)),
  }
  const file = writeJson(path.join(REPORTS, 'catalog-diff.json'), diff)
  run.artifacts.push(file)

  console.log(`Сравнение с каталогом: без изменений ${priceDiff.unchanged.length}, изменений ${priceDiff.changed.length}, новых ${priceDiff.added.length}, отсутствуют в импорте ${priceDiff.missing.length}, неоднозначных ${priceDiff.ambiguous.length}`)
  for (const c of priceDiff.changed) {
    console.log(`  ≠ ${c.trimId}: ${c.previousPrice.toLocaleString('ru-RU')} → ${c.newPrice.toLocaleString('ru-RU')} ₽`)
  }
  for (const a of priceDiff.added) console.log(`  + новая: ${a.modelSlug} ${a.name} — ${a.price.toLocaleString('ru-RU')} ₽`)
  for (const m of priceDiff.missing) console.log(`  − нет в импорте: ${m.trimId} (${m.price.toLocaleString('ru-RU')} ₽)`)
  for (const d of documentDiff.updatedDocuments) console.log(`  ↻ обновлён документ: ${d.label ?? d.url}`)
  for (const d of documentDiff.newDocuments) console.log(`  + новый документ: ${d.url}`)
  return diff
}

/* ------------------------------------------------------------------ */
/*  report                                                            */
/* ------------------------------------------------------------------ */

function cmdReport(run, catalog, diff) {
  const stored = diff ?? readJson(path.join(REPORTS, 'catalog-diff.json'), null)
  if (!stored) {
    run.errors.push('нет данных для отчёта — сначала выполните diff')
    console.error('✗ нет данных diff для отчёта')
    return null
  }
  const registry = readJson(REGISTRY_PATH, { documents: [] }).documents ?? []
  const offerDiff = diffOffers(catalog.offers, today)
  const documentDiff = stored.documents ?? { newDocuments: [], updatedDocuments: [], missingDocuments: [] }
  const events = buildChangeEvents(
    { priceDiff: stored.prices, documentDiff, offerDiff, discoveredModels: stored.newModels ?? [], knownModelIds: catalog.models.map((m) => m.id) },
    today,
  )

  const md = [
    '# Отчёт об изменениях официального каталога HAVAL',
    '',
    `Дата формирования: **${today}**. Снимок каталога: **${catalog.catalogFixedAt}**.`,
    `Комплектаций в каталоге: **${catalog.trims.length}**, подтверждённых цен: **${catalog.officialPriceCount}**.`,
    '',
    '## Результат сравнения',
    '',
    ...(stored.emptyImport
      ? [
          '**Сравнение не выполнено: импорт не дал ни одной позиции.**',
          'Документы не были получены или не разобраны (нет доступа к источнику, изменён формат прайс-листа).',
          'Нули в таблице ниже означают отсутствие данных для сравнения, а не подтверждённое отсутствие изменений.',
          '',
        ]
      : []),
    `| Показатель | Значение |`,
    `| --- | --- |`,
    `| Цен без изменений | ${stored.prices.unchanged.length} |`,
    `| Изменённых цен | ${stored.prices.changed.length} |`,
    `| Новых комплектаций | ${stored.prices.added.length} |`,
    `| Комплектаций, отсутствующих в импорте | ${stored.prices.missing.length} |`,
    `| Неоднозначных сопоставлений | ${stored.prices.ambiguous.length} |`,
    `| Обновлённых документов | ${documentDiff.updatedDocuments.length} |`,
    `| Новых документов | ${documentDiff.newDocuments.length} |`,
    `| Предложений с истёкшим сроком | ${offerDiff.expired.length} |`,
    '',
    '## События',
    '',
    stored.emptyImport
      ? 'Состояние каталога не оценено: сравнение невозможно без результата импорта.'
      : events.length === 0
        ? 'Изменений не обнаружено.'
      : events.map((e) => `- **${e.detectedAt}** · ${e.summary}${e.sourceUrl ? ` · [источник](${e.sourceUrl})` : ''}`).join('\n'),
    '',
    '## Документы, требующие ручной проверки',
    '',
    registry.filter((d) => d.parsingStatus === 'needs-manual-review' || d.parsingStatus === 'unavailable').length === 0
      ? 'Таких документов нет.'
      : registry
          .filter((d) => d.parsingStatus === 'needs-manual-review' || d.parsingStatus === 'unavailable')
          .map((d) => `- ${d.modelId ?? '—'} · ${d.label ?? d.documentType} · ${d.notes ?? d.url ?? '—'}`)
          .join('\n'),
    '',
    '---',
    '',
    'Отчёт сформирован автоматически. Подтверждённые цены каталога отчёт не изменяет:',
    'решение об обновлении принимается по официальному прайс-листу.',
  ].join('\n')

  const mdFile = writeJson(path.join(REPORTS, 'catalog-changes.md'), { markdown: md })
  ensureReports()
  const mdPath = path.join(REPORTS, 'catalog-changes.md')
  writeFileSync(mdPath, `${md}\n`)
  run.artifacts.push('reports/catalog-changes.md', mdFile)
  console.log(`Отчёт: reports/catalog-changes.md (событий: ${events.length})`)

  if (events.length > 0 && has('apply')) {
    const changesFile = readJson(CHANGES_PATH, { events: [] })
    const known = new Set((changesFile.events ?? []).map((e) => e.id))
    const added = events.filter((e) => !known.has(e.id))
    const merged = [...(changesFile.events ?? []), ...added].sort((a, b) => b.detectedAt.localeCompare(a.detectedAt))
    writeFileSync(CHANGES_PATH, `${JSON.stringify({ _comment: changesFile._comment, events: merged }, null, 2)}\n`)
    run.applied = true
    run.artifacts.push(path.relative(ROOT, CHANGES_PATH))
    console.log(`Журнал изменений дополнен: ${added.length} событий → ${path.relative(ROOT, CHANGES_PATH)}`)
  }

  if (has('apply') && stored.prices.changed.length > 0) {
    const priceChangesFile = readJson(PRICE_CHANGES_PATH, { changes: [] })
    const known = new Set((priceChangesFile.changes ?? []).map((c) => c.id))
    const added = []
    for (const c of stored.prices.changed) {
      const id = `pc-${c.trimId}-${today}-msrp-import`
      if (known.has(id)) continue
      added.push({
        id,
        trimId: c.trimId,
        previousPrice: c.previousPrice,
        newPrice: c.newPrice,
        previousPriceType: 'msrp',
        newPriceType: 'msrp',
        changedAt: today,
        sourceUrl: c.sourceUrl,
        origin: 'import',
        note: 'Зафиксировано пайплайном импорта при сравнении с официальным прайс-листом.',
      })
    }
    if (added.length > 0) {
      const merged = [...(priceChangesFile.changes ?? []), ...added].sort(
        (a, b) => a.trimId.localeCompare(b.trimId) || a.changedAt.localeCompare(b.changedAt),
      )
      writeFileSync(PRICE_CHANGES_PATH, `${JSON.stringify({ _comment: priceChangesFile._comment, changes: merged }, null, 2)}\n`)
      run.artifacts.push(path.relative(ROOT, PRICE_CHANGES_PATH))
      console.log(`История цен дополнена: ${added.length} точек → ${path.relative(ROOT, PRICE_CHANGES_PATH)}`)
    }
    console.log(
      'Внимание: цены в src/data/haval/trims.ts пайплайн не перезаписывает — ' +
        'обновите данные вручную по официальному прайс-листу или через npm run import:price-list.',
    )
  }

  appendHistory(run, catalog)
  return { events, markdown: md }
}

function appendHistory(run, catalog) {
  if (!has('apply') && !has('record')) return
  const history = readJson(HISTORY_PATH, { entries: [] })
  const entries = Array.isArray(history.entries) ? history.entries : []
  entries.push({
    checkedAt: today,
    source: CATALOGUES_URL,
    outcome: run.errors.length === 0 ? (run.changedPrices > 0 || run.newTrims > 0 ? 'updated' : 'unchanged') : 'failed',
    summary:
      `Пайплайн импорта (${run.command}): источников ${run.sources}, документов обработано ${run.documentsProcessed}, ` +
      `разобрано ${run.documentsParsed}, в ручную проверку ${run.documentsNeedsReview.length}, недоступно ${run.documentsUnavailable.length}. ` +
      `Изменённых цен ${run.changedPrices}, новых комплектаций ${run.newTrims}. ` +
      (run.errors.length > 0 ? 'Завершено с ошибками: подтверждённые цены каталога не изменялись.' : 'Подтверждённые цены каталога не изменены автоматически.'),
    models: catalog.models.map((m) => m.id),
    confirmedPrices: catalog.officialPriceCount,
    ...(run.errors.length > 0 ? { errors: run.errors.slice(0, 20) } : {}),
  })
  writeFileSync(HISTORY_PATH, `${JSON.stringify({ entries }, null, 2)}\n`)
  console.log(`История проверок обновлена: ${path.relative(ROOT, HISTORY_PATH)}`)
}

/* ------------------------------------------------------------------ */
/*  main                                                              */
/* ------------------------------------------------------------------ */

async function main() {
  ensureReports()
  const catalog = await loadCatalog()
  const run = startRun(command)
  console.log(`HavalGarage · пайплайн каталога · команда «${command}» · ${today}`)
  console.log(`User-Agent: ${USER_AGENT}`)

  let discovery = readJson(path.join(REPORTS, 'catalog-discovery.json'), null)
  let importResult = null
  let diff = null

  if (command === 'discover' || command === 'full') discovery = await cmdDiscover(run, catalog)
  if (command === 'import' || command === 'full') importResult = await cmdImport(run, catalog, discovery)
  if (command === 'validate' || command === 'full') cmdValidate(run, catalog)
  if (command === 'diff' || command === 'full') diff = cmdDiff(run, catalog, importResult)
  if (command === 'report' || command === 'full') cmdReport(run, catalog, diff)
  if (command === 'seed') {
    console.log('Используйте: node scripts/seed-price-history.mjs')
  }

  finishRun(run)
  const manifest = writeJson(path.join(REPORTS, `catalog-run-${command}-${Date.now()}.json`), run)
  writeJson(path.join(REPORTS, 'catalog-run-latest.json'), run)
  run.artifacts.push(manifest)

  console.log('')
  console.log('Итог запуска:')
  console.log(`  источников: ${run.sources} · документов обработано: ${run.documentsProcessed} · разобрано: ${run.documentsParsed}`)
  console.log(`  в ручную проверку: ${run.documentsNeedsReview.length} · недоступно: ${run.documentsUnavailable.length}`)
  console.log(`  новых моделей: ${run.newModels} · новых комплектаций: ${run.newTrims} · изменённых цен: ${run.changedPrices}`)
  console.log(`  ошибок: ${run.errors.length} · предупреждений: ${run.warnings.length} · изменения применены: ${run.applied ? 'да' : 'нет'}`)
  if (run.errors.length > 0) {
    for (const e of run.errors.slice(0, 10)) console.log(`  ✗ ${e}`)
  }
  console.log(`  отчёт запуска: ${manifest}`)

  if (has('strict') && run.errors.length > 0) process.exit(1)
}

main().catch((e) => {
  console.error('Ошибка пайплайна каталога:', e?.stack ?? e)
  process.exit(1)
})

export { readdirSync }
