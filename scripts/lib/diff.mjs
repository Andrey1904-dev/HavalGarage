/**
 * Сравнение свежего импорта с текущим каталогом.
 *
 * Ничего не записывает и не перезаписывает: возвращает список различий,
 * по которому человек принимает решение. Неполный или невалидный импорт
 * не должен приводить к изменению каталога — это обеспечивается на уровне
 * пайплайна (scripts/catalog.mjs), а здесь только фиксация фактов.
 */
import { normalizeTrimName } from './parse-price-list.mjs'

/**
 * Сопоставление названий комплектаций документа с каталогом.
 *
 * Официальные прайс-листы называют комплектации иначе, чем карточки каталога
 * («ОПТИМУМ, МТ 143 Л.С.» против «Оптимум, 1.5T MT 143»), текст из PDF к тому
 * же приходит с распознаванием части букв как латинских («TEXHO +» вместо
 * «ТЕХНО +»). Поэтому сравнение идёт не по строке, а по структурированной
 * подписи: уровень оснащения, тип привода, коробка, двигатель, топливо.
 * Если по подписи находится больше одной комплектации, сопоставление
 * признаётся неоднозначным: угадывать нельзя.
 */

/** Латинские символы, которыми распознавание подменяет кириллические */
const LATIN_TO_CYRILLIC = {
  A: 'А', B: 'В', C: 'С', E: 'Е', H: 'Н', K: 'К', M: 'М', O: 'О', P: 'Р', T: 'Т', X: 'Х', Y: 'У',
  a: 'а', b: 'в', c: 'с', e: 'е', h: 'н', k: 'к', m: 'м', o: 'о', p: 'р', t: 'т', x: 'х', y: 'у',
}

/** Технические сокращения, которые остаются латиницей */
const TECH_CODES = new Set(['MT', 'AT', 'DCT', 'CVT', 'AMT', 'AWD', 'FWD', 'T', 'PLUS', 'GDI'])

const GRADES = ['комфорт', 'оптимум', 'премиум', 'техно', 'элит', 'стандарт', 'люкс', 'city', 'sport']

const TRANSMISSIONS = [
  // в документах встречается и латиница, и кириллица («МТ» кириллицей)
  [/^(MT|МТ|МКП|МКПП|МЕХ|МЕХАНИКА)/, 'mt'],
  [/^(AT|АТ|АКП|АКПП|АВТОМАТ)/, 'at'],
  [/^(DCT|DСT|РОБОТ|РОБОТИЗ|DCT450)/, 'dct'],
  [/^(CVT|ВАРИАТОР)/, 'cvt'],
  [/^(AMT|АМТ)/, 'amt'],
]

const DRIVETRAINS = [
  [/(^|[^a-zа-я])(4WD|4Х4|4X4|ПОЛНЫЙ)/, '4wd'],
  [/(^|[^a-zа-я])(2WD|ПЕРЕДНИЙ|ЗАДНИЙ)/, '2wd'],
]

const FUELS = [[/ДИЗЕЛ/, 'дизель'], [/БЕНЗИН/, 'бензин'], [/ГИБРИД/, 'гибрид'], [/ЭЛЕКТР/, 'электро']]

function transliterateLatinWord(word) {
  return word.replace(/[A-Za-z]/g, (ch) => LATIN_TO_CYRILLIC[ch] ?? ch)
}

/** Разобрать название комплектации на структурированную подпись */
export function trimSignature(name) {
  const raw = String(name ?? '')
    .replace(/[«»"'|,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const upper = raw.toUpperCase()
  const tokens = raw
    .split(/\s+/)
    .map((t) => (t === '+' ? '+' : t.replace(/^[.+-]+|[.+-]+$/g, '')))
    .filter(Boolean)

  const words = []
  const codes = new Set()

  for (const token of tokens) {
    if (token === '+' || /^ПЛЮС$/i.test(token)) {
      codes.add('+')
      continue
    }
    if (/\d/.test(token)) {
      codes.add(token.toUpperCase().replace(/\s/g, ''))
      continue
    }
    const upperToken = token.toUpperCase()
    if (TECH_CODES.has(upperToken)) {
      codes.add(upperToken)
      continue
    }
    if (/[А-Яа-яЁё]/.test(token)) {
      words.push(token.toLowerCase())
      continue
    }
    // слово латиницей без цифр — почти наверняка результат распознавания кириллицы
    words.push(transliterateLatinWord(token).toLowerCase())
  }

  // уровень оснащения: первое известное слово-название комплектации
  let grade = null
  for (const word of words) {
    if (GRADES.includes(word)) {
      grade = word
      break
    }
  }
  if (grade === null && words.length > 0) grade = words[0]
  if (grade !== null && (codes.has('+') || /\bПЛЮС\b/i.test(upper))) grade = `${grade} +`

  let transmission = null
  for (const token of [...codes, ...words.map((w) => w.toUpperCase())]) {
    const found = TRANSMISSIONS.find(([re]) => re.test(String(token)))
    if (found) {
      transmission = found[1]
      break
    }
  }

  let drivetrain = null
  for (const [re, value] of DRIVETRAINS) {
    if (re.test(` ${upper} `)) {
      drivetrain = value
      break
    }
  }

  let fuel = null
  for (const [re, value] of FUELS) {
    if (re.test(upper)) {
      fuel = value
      break
    }
  }

  const engines = new Set()
  for (const code of codes) {
    const m = /^(\d[.,]\d)T?$/.exec(code)
    if (m) engines.add(`${m[1].replace(',', '.')}t`)
  }

  const power = /(\d{3})\s*(?:Л\.?\s?С\.?|HP)?/.exec(upper)
  const horsepower = power ? Number(power[1]) : null

  return { grade, transmission, drivetrain, fuel, engines: [...engines].sort(), horsepower }
}

/** Совместимы ли две подписи (неизвестное значение не препятствует совпадению) */
function signaturesCompatible(a, b) {
  if (a.grade !== b.grade) return false
  if (a.transmission && b.transmission && a.transmission !== b.transmission) return false
  if (a.drivetrain && b.drivetrain && a.drivetrain !== b.drivetrain) return false
  if (a.fuel && b.fuel && a.fuel !== b.fuel) return false
  if (a.horsepower && b.horsepower && a.horsepower !== b.horsepower) return false
  if (a.engines.length > 0 && b.engines.length > 0 && a.engines.join() !== b.engines.join()) return false
  return true
}

/** Найти комплектацию каталога, соответствующую записи импорта */
export function matchTrim(row, trims) {
  const candidates = trims.filter((t) => t.modelId === row.modelSlug && t.basePrice !== null)
  if (candidates.length === 0) return null

  // 1. точное совпадение нормализованного названия
  const wanted = normalizeTrimName(row.name)
  const exact = candidates.filter((t) => normalizeTrimName(t.name) === wanted)
  if (exact.length === 1) return exact[0]

  // 2. совпадение по структурированной подписи
  const signature = trimSignature(row.name)
  const bySignature = candidates.filter((t) => signaturesCompatible(signature, trimSignature(t.name)))
  if (bySignature.length === 1) return bySignature[0]
  if (bySignature.length === 0) return null

  // 3. несколько поколений с одинаковой подписью — уточняем по модельному году
  if (row.modelYear !== null && row.modelYear !== undefined) {
    const byYear = bySignature.filter((t) => t.modelYear === row.modelYear)
    if (byYear.length === 1) return byYear[0]
    if (byYear.length > 1) {
      const byProduction = byYear.filter((t) => t.productionYear === row.productionYear)
      if (byProduction.length === 1) return byProduction[0]
      return null // неоднозначно — лучше не менять данные, чем угадать
    }
  }
  return null // неоднозначно
}

/**
 * Сравнить цены импорта с каталогом.
 *
 * @returns {{unchanged: Array, changed: Array, added: Array, missing: Array, ambiguous: Array}}
 */
export function diffPrices(rows, trims, { coveredModelIds } = {}) {
  const current = trims.filter((t) => t.status === 'current')
  const covered = coveredModelIds && coveredModelIds.length > 0
    ? current.filter((t) => coveredModelIds.includes(t.modelId))
    : current

  const unchanged = []
  const changed = []
  const added = []
  const ambiguous = []
  const matched = new Set()

  for (const row of rows) {
    const trim = matchTrim(row, current)
    if (!trim) {
      const fuzzy = covered.some((t) => normalizeTrimName(t.name) === normalizeTrimName(row.name))
      if (fuzzy) {
        ambiguous.push({ row, reason: 'найдено несколько комплектаций с таким названием — сопоставление неоднозначно' })
      } else {
        added.push(row)
      }
      continue
    }
    matched.add(trim.id)
    if (trim.basePrice === row.price) {
      unchanged.push({ trimId: trim.id, price: row.price })
    } else {
      changed.push({
        trimId: trim.id,
        modelId: trim.modelId,
        name: trim.name,
        previousPrice: trim.basePrice,
        newPrice: row.price,
        modelYear: row.modelYear ?? trim.modelYear,
        productionYear: row.productionYear ?? trim.productionYear,
        sourceUrl: row.sourceUrl,
        validFrom: row.validFrom ?? null,
      })
    }
  }

  const missing = covered
    .filter((t) => !matched.has(t.id) && t.basePrice !== null)
    .map((t) => ({ trimId: t.id, modelId: t.modelId, name: t.name, price: t.basePrice, modelYear: t.modelYear }))

  return { unchanged, changed, added, missing, ambiguous }
}

/** Документы, которых нет в реестре, и документы с изменившейся контрольной суммой */
export function diffDocuments(discovered, registry) {
  const byUrl = new Map(registry.map((d) => [d.url, d]))
  const newDocuments = []
  const updatedDocuments = []

  for (const doc of discovered) {
    const known = byUrl.get(doc.url)
    if (!known) {
      newDocuments.push(doc)
      continue
    }
    if (doc.checksum && known.checksum && doc.checksum !== known.checksum) {
      updatedDocuments.push({ ...known, previousChecksum: known.checksum, checksum: doc.checksum, fetchedAt: doc.fetchedAt })
    }
  }

  const missingDocuments = registry
    .filter((d) => d.url && d.parsingStatus !== 'unavailable' && !discovered.some((x) => x.url === d.url))
    .map((d) => ({ id: d.id, url: d.url, modelId: d.modelId }))

  return { newDocuments, updatedDocuments, missingDocuments }
}

/** Предложения, у которых истёк или ещё не наступил период действия */
export function diffOffers(offers, todayIso) {
  const expired = []
  const notStarted = []
  for (const offer of offers) {
    if (offer.validUntil && offer.validUntil < todayIso) {
      expired.push({ id: offer.id, name: offer.name, validUntil: offer.validUntil })
    }
    if (offer.validFrom && offer.validFrom > todayIso) {
      notStarted.push({ id: offer.id, name: offer.name, validFrom: offer.validFrom })
    }
  }
  return { expired, notStarted }
}

/** События мониторинга для журнала src/data/haval/catalog-changes.json */
export function buildChangeEvents({ priceDiff, documentDiff, offerDiff, discoveredModels = [], knownModelIds = [] }, todayIso) {
  const events = []
  let n = 0
  const nextId = (kind) => `ce-${todayIso}-${kind}-${++n}`

  for (const modelId of discoveredModels) {
    if (!knownModelIds.includes(modelId)) {
      events.push({
        id: nextId('new-model'),
        kind: 'new-model',
        detectedAt: todayIso,
        modelId,
        trimId: null,
        summary: `В официальном каталоге обнаружена модель, отсутствующая в приложении: ${modelId}.`,
        previousValue: null,
        newValue: modelId,
        sourceUrl: 'https://haval.ru/purchase/catalogues/',
      })
    }
  }

  for (const row of priceDiff.added) {
    events.push({
      id: nextId('new-trim'),
      kind: 'new-trim',
      detectedAt: todayIso,
      modelId: row.modelSlug,
      trimId: null,
      summary: `Новая комплектация «${row.name}» — ${row.price.toLocaleString('ru-RU')} ₽.`,
      previousValue: null,
      newValue: String(row.price),
      sourceUrl: row.sourceUrl,
    })
  }

  for (const change of priceDiff.changed) {
    events.push({
      id: nextId('price-changed'),
      kind: 'price-changed',
      detectedAt: todayIso,
      modelId: change.modelId,
      trimId: change.trimId,
      summary: `Изменилась цена «${change.name}»: ${change.previousPrice.toLocaleString('ru-RU')} → ${change.newPrice.toLocaleString('ru-RU')} ₽.`,
      previousValue: String(change.previousPrice),
      newValue: String(change.newPrice),
      sourceUrl: change.sourceUrl,
    })
  }

  for (const doc of documentDiff.updatedDocuments) {
    events.push({
      id: nextId('price-list-updated'),
      kind: 'price-list-updated',
      detectedAt: todayIso,
      modelId: doc.modelId,
      trimId: null,
      summary: `Опубликована новая версия документа «${doc.label ?? doc.id}» (контрольная сумма изменилась).`,
      previousValue: doc.previousChecksum,
      newValue: doc.checksum,
      sourceUrl: doc.url,
    })
  }

  for (const doc of documentDiff.newDocuments) {
    events.push({
      id: nextId('price-list-updated'),
      kind: 'price-list-updated',
      detectedAt: todayIso,
      modelId: doc.modelId,
      trimId: null,
      summary: `Обнаружен новый документ: «${doc.label ?? doc.documentType}».`,
      previousValue: null,
      newValue: doc.url,
      sourceUrl: doc.url,
    })
  }

  for (const offer of offerDiff.expired) {
    events.push({
      id: nextId('offer-expired'),
      kind: 'offer-expired',
      detectedAt: todayIso,
      modelId: null,
      trimId: null,
      summary: `Срок действия предложения «${offer.name}» истёк ${offer.validUntil}.`,
      previousValue: offer.validUntil,
      newValue: null,
      sourceUrl: null,
    })
  }

  return events
}
