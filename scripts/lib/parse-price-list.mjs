/**
 * Разбор текста официального прайс-листа HAVAL (PDF «Максимальная цена
 * перепродажи»).
 *
 * Модуль намеренно чистый и не зависит от сети и от формата PDF: на вход
 * подаётся извлечённый текст, на выходе — структурированные записи и список
 * замечаний. Это позволяет тестировать разбор на реальных официальных
 * документах (см. tests/fixtures/) и честно сообщать о неполном результате,
 * а не подменять неудачный разбор догадками.
 */

/** Минимальная правдоподобная цена автомобиля, ₽ */
export const MIN_PLAUSIBLE_PRICE = 500_000
/** Максимальная правдоподобная цена автомобиля, ₽ */
export const MAX_PLAUSIBLE_PRICE = 50_000_000

/** Денежное значение, записанное с разделителем разрядов: «2 099 000» */
const MONEY_RE = /\d{1,3}(?:[\s\u00A0]\d{3}){2,}/g

/** Метка строки цены в документе: «МЦП* руб», «МЦП2 руб», а также OCR-варианты */
const PRICE_LABEL_RE = /м\s*[цсcщ]\s*п|млп|mlп|руб/i

/** Заголовок таблицы комплектаций (встречаются опечатки распознавания) */
const COMPLECTATION_RE = /комплектац|комплектаии|комплектц|комплектации/i

const cleanCell = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()

/** Разбить строку на ячейки: поддерживаются и markdown-таблицы, и обычный текст */
export function toCells(line) {
  const raw = String(line ?? '')
  if (raw.includes('|')) {
    const cells = raw.split('|').map(cleanCell).filter(Boolean)
    if (cells.length > 0) return cells
  }
  return raw.trim() ? [cleanCell(raw)] : []
}

/** Извлечь денежные суммы из строки */
export function moneyValues(line) {
  const text = String(line ?? '')
  const out = []
  for (const m of text.matchAll(MONEY_RE)) {
    const value = Number(m[0].replace(/[\s\u00A0]/g, ''))
    if (Number.isFinite(value) && value >= MIN_PLAUSIBLE_PRICE && value <= MAX_PLAUSIBLE_PRICE) out.push(value)
  }
  return out
}

/** Преобразовать «14.08.2026» в ISO-дату */
export function isoFromRuDate(ddmmyyyy) {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(ddmmyyyy ?? '').trim())
  if (!m) return null
  const [, d, mo, y] = m
  return `${y}-${mo}-${d}`
}

/** Текст строки без денежных значений и без символов таблицы */
function nonMoneyText(line) {
  return String(line ?? '')
    .replace(MONEY_RE, ' ')
    .replace(/[|×—–]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Сгруппировать подряд идущие строки с ценами в логические строки таблицы.
 *
 * Извлечение текста из PDF часто ставит каждое значение на отдельную строку
 * («МЦП руб» / «2 099 000» / «2 349 000»), поэтому соседние строки значений
 * объединяются. В markdown-таблицах все значения уже в одной строке.
 */
export function buildMoneyGroups(lines) {
  const groups = []
  let current = null
  for (let i = 0; i < lines.length; i++) {
    const money = moneyValues(lines[i])
    const isValueLine = money.length > 0 && (money.length >= 2 || nonMoneyText(lines[i]).length <= 12)
    if (!isValueLine) {
      current = null
      continue
    }
    const isAdjacent = current !== null && current.endIndex === i - 1
    if (!isAdjacent) {
      current = { startIndex: i, endIndex: i, money: [...money], labelIndex: i }
      groups.push(current)
    } else {
      current.endIndex = i
      current.money.push(...money)
    }
  }
  // метка строки цены («МЦП руб») обычно стоит отдельной строкой выше значений
  for (const g of groups) {
    if (g.startIndex > 0) {
      const above = lines[g.startIndex - 1]
      if (PRICE_LABEL_RE.test(above) && moneyValues(above).length === 0) g.labelIndex = g.startIndex - 1
    }
  }
  return groups
}

/** Названия комплектаций: после заголовка «КОМПЛЕКТАЦИЯ» до строки цены */
export function buildNameGroups(lines) {
  const groups = []
  for (let h = 0; h < lines.length; h++) {
    if (!COMPLECTATION_RE.test(lines[h])) continue
    const cells = toCells(lines[h])
    let names = cells.filter((c) => !COMPLECTATION_RE.test(c) && !PRICE_LABEL_RE.test(c))

    if (names.length === 0) {
      // названия перечислены строками ниже заголовка
      const collected = []
      for (let k = h + 1; k < lines.length && k <= h + 24; k++) {
        const line = lines[k]
        if (PRICE_LABEL_RE.test(line)) break
        if (moneyValues(line).length > 0) break
        if (COMPLECTATION_RE.test(line)) break
        const cell = cleanCell(line)
        if (!cell || cell.length < 2) continue
        collected.push(cell)
      }
      names = collected
    }

    if (names.length > 0) groups.push({ headerIndex: h, names })
  }
  return groups
}

/**
 * Разобрать текст прайс-листа.
 *
 * @param {string} text извлечённый из PDF текст
 * @param {{modelSlug: string, url: string, expectedTrims?: number|null}} context
 * @returns {{modelSlug: string, url: string, modelYear: number|null, productionYear: number|null,
 *            effectiveFrom: string|null, rows: Array<{name: string, price: number, position: number}>,
 *            issues: string[], stats: Record<string, number>}}
 */
export function parsePriceListText(text, context = {}) {
  const source = String(text ?? '')
  const lines = source.split(/\r?\n/).map(cleanCell).filter(Boolean)
  const issues = []

  const modelYearMatch = /(\d{4})\s*(?:МОДЕЛЬНЫЙ|МОДЕЛЬНОГО|МОДЕЛЬНОМ)\s*ГОД/i.exec(source)
  const productionMatch = /(\d{4})\s*(?:ГОД|Г\.)\s*ПРОИЗВОДСТВА/i.exec(source)
  const effectiveMatch = /(?:актуально|действует|действительна)\s*[^\d]{0,24}?(\d{2}\.\d{2}\.\d{4})/i.exec(source)

  const modelYear = modelYearMatch ? Number(modelYearMatch[1]) : null
  const productionYear = productionMatch ? Number(productionMatch[1]) : null
  const effectiveFrom = effectiveMatch ? isoFromRuDate(effectiveMatch[1]) : null

  const emptyResult = (extraIssues) => ({
    modelSlug: context.modelSlug ?? null,
    url: context.url ?? null,
    modelYear,
    productionYear,
    effectiveFrom,
    rows: [],
    issues: [...issues, ...extraIssues],
    stats: { lines: lines.length, priceCandidates: 0, nameCandidates: 0 },
  })

  /* --- 1. строки с ценами --- */
  const moneyGroups = buildMoneyGroups(lines)
  if (moneyGroups.length === 0) {
    return emptyResult(['в тексте не найдена строка цены (нет сумм в правдоподобном диапазоне)'])
  }

  const nameGroups = buildNameGroups(lines)

  const scoreGroup = (g) => {
    const ownLabel = toCells(lines[g.startIndex])[0] ?? lines[g.startIndex]
    let score = 0
    if (PRICE_LABEL_RE.test(ownLabel)) score += 2
    if (g.labelIndex !== g.startIndex && PRICE_LABEL_RE.test(lines[g.labelIndex])) score += 2
    const nearestNames = nameGroups
      .filter((n) => n.headerIndex < g.startIndex)
      .sort((a, b) => b.headerIndex - a.headerIndex)[0]
    if (nearestNames && g.startIndex - nearestNames.headerIndex <= 24) score += 1
    if (nonMoneyText(lines[g.startIndex]).length > 40) score -= 2
    return { ...g, score, names: nearestNames?.names ?? [], headerIndex: nearestNames?.headerIndex ?? -1 }
  }

  // одна и та же таблица часто дублируется в документе (шапка и матрица различий):
  // из повторов оставляем экземпляр с лучшей оценкой (тот, у которого есть названия)
  const byKey = new Map()
  for (const g of moneyGroups) {
    const scoredCandidate = scoreGroup(g)
    const key = g.money.join('-')
    const prev = byKey.get(key)
    if (!prev || prev.score < scoredCandidate.score) byKey.set(key, scoredCandidate)
  }
  const scored = [...byKey.values()]
  if (moneyGroups.length > scored.length) {
    issues.push(
      `таблица цен повторяется в документе ${moneyGroups.length} раз(а) — оставлен наиболее полный экземпляр`,
    )
  }

  scored.sort((a, b) => b.money.length - a.money.length || b.score - a.score)
  const best = scored[0]
  const prices = best.money
  let names = best.names

  if (scored.length > 1 && scored[1].money.length === prices.length) {
    issues.push('найдено несколько таблиц с одинаковым числом цен — выбрана наиболее полная, требуется проверка')
  }

  /* --- 2. названия комплектаций --- */
  if (names.length === 0) {
    issues.push('не найдена строка с названиями комплектаций — документ требует ручной проверки')
  } else if (names.length !== prices.length) {
    issues.push(
      `число названий комплектаций (${names.length}) не совпадает с числом цен (${prices.length}) — ` +
        'сопоставление выполнено по позициям, документ требует ручной проверки',
    )
  }

  const count = Math.min(names.length || prices.length, prices.length)
  const rows = []
  for (let i = 0; i < count; i++) {
    rows.push({
      name: names[i] ?? `Комплектация ${i + 1}`,
      price: prices[i],
      position: i,
    })
  }
  if (names.length === 0) {
    // цены без названий не считаем успешным разбором: только цена ≠ комплектация
    issues.push('цены без названий комплектаций не считаются успешным импортом')
    rows.length = 0
  }

  const expected = context.expectedTrims ?? null
  if (expected !== null && rows.length > 0 && rows.length < expected) {
    issues.push(`извлечено записей ${rows.length} из ожидаемых ${expected} — результат неполный`)
  }

  return {
    modelSlug: context.modelSlug ?? null,
    url: context.url ?? null,
    modelYear,
    productionYear,
    effectiveFrom,
    rows,
    issues,
    stats: { lines: lines.length, priceCandidates: scored.length, nameCandidates: nameGroups.length, headerIndex: best.headerIndex },
  }
}

/** Нормализация названия комплектации для сопоставления с каталогом */
export function normalizeTrimName(name) {
  let s = String(name ?? '')
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, ' ')
    .replace(/[«»"',./-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const aliases = [
    [/тех\s*плюс/g, 'техно +'],
    [/техно\s*плюс/g, 'техно +'],
    [/^техно\s*\+$/, 'техно +'],
  ]
  for (const [re, to] of aliases) s = s.replace(re, to)
  return s
}

/**
 * Проверка результата разбора.
 *
 * Импорт считается успешным только если есть хотя бы одна запись с названием
 * и правдоподобной ценой, нет дубликатов и нет критических замечаний.
 */
export function validateParsed(parsed) {
  const errors = []
  const warnings = []

  if (!Array.isArray(parsed.rows) || parsed.rows.length === 0) {
    errors.push('не извлечено ни одной записи «комплектация + цена»')
    return { ok: false, errors, warnings }
  }

  const seen = new Set()
  for (const [i, row] of parsed.rows.entries()) {
    const at = `запись ${i + 1}`
    if (!row.name || String(row.name).trim().length < 2) errors.push(`${at}: пустое название комплектации`)
    if (!Number.isFinite(row.price)) errors.push(`${at}: цена не распознана`)
    else if (row.price <= 0) errors.push(`${at}: цена должна быть положительной`)
    else if (row.price < MIN_PLAUSIBLE_PRICE || row.price > MAX_PLAUSIBLE_PRICE) {
      errors.push(`${at}: цена ${row.price} ₽ вне правдоподобного диапазона`)
    }
    const key = `${normalizeTrimName(row.name)}|${row.price}`
    if (seen.has(key)) errors.push(`${at}: дубликат («${row.name}», ${row.price} ₽)`)
    seen.add(key)
  }

  for (const issue of parsed.issues ?? []) {
    if (/не совпадает|неполный|несколько таблиц|повторяется|требует ручной проверки/.test(issue)) warnings.push(issue)
    else errors.push(issue)
  }

  return { ok: errors.length === 0, errors, warnings }
}

/**
 * Привести записи разбора к форме каталога.
 * Тип цены всегда 'msrp': прайс-лист публикует максимальную цену перепродажи.
 */
export function normalizeParsedRows(parsed) {
  const modelYear = parsed.modelYear ?? null
  const productionYear = parsed.productionYear ?? null
  return parsed.rows.map((row) => ({
    modelSlug: parsed.modelSlug,
    name: String(row.name).trim(),
    price: row.price,
    modelYear,
    productionYear,
    priceType: 'msrp',
    sourceUrl: parsed.url,
    validFrom: parsed.effectiveFrom,
  }))
}
