/**
 * Тесты пайплайна импорта официальных данных.
 *
 * Разбор проверяется на тексте реальных официальных прайс-листов
 * (tests/fixtures/) — не на искусственных строках. Отдельно проверяются
 * отказ при неполном разборе, сопоставление записей с каталогом и diff.
 */
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

import {
  buildMoneyGroups,
  buildNameGroups,
  isoFromRuDate,
  moneyValues,
  normalizeParsedRows,
  normalizeTrimName,
  parsePriceListText,
  toCells,
  validateParsed,
} from '../scripts/lib/parse-price-list.mjs'
import { diffPrices, diffDocuments, diffOffers, matchTrim, trimSignature } from '../scripts/lib/diff.mjs'

const fixture = (name: string) => readFileSync(path.join(process.cwd(), 'tests', 'fixtures', name), 'utf8')

const M6_URL = 'https://cdn.perxis.ru/originals/da1hsh8beucc73999j3g/original'
const JOLION_URL = 'https://cdn.perxis.ru/originals/da1hsmobeucc73999j40/original'

describe('разбор официального прайс-листа', () => {
  test('M6: две комплектации и обе цены из документа', () => {
    const parsed = parsePriceListText(fixture('price-list-m6.txt'), { modelSlug: 'm6', url: M6_URL, expectedTrims: 2 })
    assert.equal(parsed.modelYear, 2026)
    assert.equal(parsed.productionYear, 2026)
    assert.equal(parsed.effectiveFrom, '2026-08-14')
    assert.equal(parsed.rows.length, 2)
    assert.deepEqual(parsed.rows.map((r: { price: number }) => r.price), [2_099_000, 2_349_000])
    assert.match(parsed.rows[0].name, /ОПТИМУМ/i)
    assert.equal(validateParsed(parsed).ok, true)
  })

  test('JOLION: шесть комплектаций, цены совпадают с прайс-листом', () => {
    const parsed = parsePriceListText(fixture('price-list-jolion.txt'), {
      modelSlug: 'jolion',
      url: JOLION_URL,
      expectedTrims: 6,
    })
    assert.equal(parsed.rows.length, 6)
    assert.deepEqual(
      parsed.rows.map((r: { price: number }) => r.price),
      [2_099_000, 2_499_000, 2_699_000, 2_649_000, 2_849_000, 2_949_000],
    )
    assert.equal(validateParsed(parsed).errors.length, 0)
  })

  test('дата начала действия переводится из формата документа в ISO', () => {
    assert.equal(isoFromRuDate('14.08.2026'), '2026-08-14')
    assert.equal(isoFromRuDate('не дата'), null)
  })

  test('денежные значения распознаются, а технические числа — нет', () => {
    assert.deepEqual(moneyValues('МЦП руб 2 099 000 2 349 000'), [2_099_000, 2_349_000])
    assert.deepEqual(moneyValues('Снаряженная масса, кг 1535 1565'), [])
    assert.deepEqual(moneyValues('Колесная база, мм 2680'), [])
  })

  test('строки с ценами объединяются в одну логическую строку таблицы', () => {
    const groups = buildMoneyGroups(['МЦП руб', '2 099 000', '2 349 000', 'Клиренс, мм', '170'])
    assert.equal(groups.length, 1)
    assert.deepEqual(groups[0].money, [2_099_000, 2_349_000])
    // метка строки цены стоит отдельной строкой выше значений
    assert.equal(groups[0].labelIndex, 0)
  })

  test('markdown-таблица разбирается на ячейки', () => {
    assert.deepEqual(toCells('| КОМПЛЕКТАЦИЯ | ОПТИМУМ | ПРЕМИУМ |'), ['КОМПЛЕКТАЦИЯ', 'ОПТИМУМ', 'ПРЕМИУМ'])
    assert.deepEqual(toCells('2 099 000'), ['2 099 000'])
  })

  test('названия комплектаций собираются после заголовка', () => {
    const names = buildNameGroups(['КОМПЛЕКТАЦИЯ', 'ОПТИМУМ, МТ', 'ОПТИМУМ, АТ', 'МЦП руб', '2 099 000'])
    assert.equal(names.length, 1)
    assert.deepEqual(names[0].names, ['ОПТИМУМ, МТ', 'ОПТИМУМ, АТ'])
  })
})

describe('отказ при неполном разборе', () => {
  test('название модели без цен не считается успешным импортом', () => {
    const parsed = parsePriceListText('HAVAL M6\n2026 МОДЕЛЬНЫЙ ГОД\nКОМПЛЕКТАЦИЯ\nОПТИМУМ', {
      modelSlug: 'm6',
      url: M6_URL,
    })
    assert.equal(parsed.rows.length, 0)
    const validation = validateParsed(parsed)
    assert.equal(validation.ok, false)
    assert.ok(validation.errors.length > 0)
  })

  test('цены без названий комплектаций отклоняются', () => {
    const parsed = parsePriceListText('КОМПЛЕКТАЦИЯ\nМЦП руб\n2 099 000\n2 349 000', { modelSlug: 'm6', url: M6_URL })
    assert.equal(parsed.rows.length, 0, 'без названий записи не создаются')
    assert.equal(validateParsed(parsed).ok, false)
  })

  test('неполный результат по сравнению с ожидаемым числом позиций — предупреждение', () => {
    const parsed = parsePriceListText(fixture('price-list-m6.txt'), { modelSlug: 'm6', url: M6_URL, expectedTrims: 10 })
    const validation = validateParsed(parsed)
    assert.equal(validation.ok, true, 'разбор валиден, но результат неполный')
    assert.ok(validation.warnings.some((w: string) => /неполный/.test(w)))
  })

  test('дубликаты комплектаций отклоняются', () => {
    const parsed = {
      modelSlug: 'm6',
      url: M6_URL,
      modelYear: null,
      productionYear: null,
      effectiveFrom: null,
      rows: [
        { name: 'Оптимум', price: 2_099_000, position: 0 },
        { name: 'Оптимум', price: 2_099_000, position: 1 },
      ],
      issues: [],
    }
    const validation = validateParsed(parsed)
    assert.equal(validation.ok, false)
    assert.ok(validation.errors.some((e: string) => /дубликат/.test(e)))
  })

  test('нормализация приводит записи к форме каталога с типом цены msrp', () => {
    const parsed = parsePriceListText(fixture('price-list-m6.txt'), { modelSlug: 'm6', url: M6_URL })
    const rows = normalizeParsedRows(parsed)
    assert.equal(rows.length, 2)
    for (const row of rows) {
      assert.equal(row.priceType, 'msrp')
      assert.equal(row.sourceUrl, M6_URL)
      assert.equal(row.modelSlug, 'm6')
    }
  })
})

describe('сопоставление с каталогом', () => {
  test('подпись названия разбирает уровень, привод, коробку и топливо', () => {
    const a = trimSignature('ОПТИМУМ, МТ 143 Л.С.')
    assert.equal(a.grade, 'оптимум')
    assert.equal(a.transmission, 'mt')

    const b = trimSignature('Оптимум, 1.5T MT 143')
    assert.equal(b.grade, 'оптимум')
    assert.equal(b.transmission, 'mt')

    const c = trimSignature('TEXHO + 1.5T 4WD DCT')
    assert.equal(c.grade, 'техно +')
    assert.equal(c.drivetrain, '4wd')
    assert.equal(c.transmission, 'dct')

    const d = trimSignature('Комфорт, 2.0 дизель MT 4WD')
    assert.equal(d.fuel, 'дизель')
    assert.equal(d.drivetrain, '4wd')
  })

  test('название из документа сопоставляется с комплектацией каталога', () => {
    const trims = [
      { id: 'm6-optimum-mt-2026', modelId: 'm6', name: 'Оптимум, 1.5T MT 143', basePrice: 2_099_000, modelYear: 2026, productionYear: 2026, status: 'current' },
      { id: 'm6-optimum-at-2026', modelId: 'm6', name: 'Оптимум, 1.5T AT 143', basePrice: 2_349_000, modelYear: 2026, productionYear: 2026, status: 'current' },
    ]
    const matched = matchTrim({ modelSlug: 'm6', name: 'ОПТИМУМ, МТ 143 Л.С.', price: 2_099_000, modelYear: 2026, productionYear: 2026, priceType: 'msrp', sourceUrl: M6_URL, validFrom: '2026-08-14' }, trims)
    assert.equal(matched?.id, 'm6-optimum-mt-2026')

    const at = matchTrim({ modelSlug: 'm6', name: 'ОПТИМУМ, АТ 143 Л.С.', price: 2_349_000, modelYear: 2026, productionYear: 2026, priceType: 'msrp', sourceUrl: M6_URL, validFrom: '2026-08-14' }, trims)
    assert.equal(at?.id, 'm6-optimum-at-2026')
  })

  test('неоднозначное совпадение не угадывается', () => {
    const trims = [
      { id: 'poer-comfort-gas', modelId: 'poer', name: 'Комфорт, 2.0T бензин MT 4WD', basePrice: 3_449_000, modelYear: 2026, productionYear: 2026, status: 'current' },
      { id: 'poer-comfort-diesel', modelId: 'poer', name: 'Комфорт, 2.0 дизель MT 4WD', basePrice: 3_449_000, modelYear: 2026, productionYear: 2026, status: 'current' },
    ]
    const matched = matchTrim({ modelSlug: 'poer', name: 'КОМФОРТ MT', price: 3_449_000, modelYear: 2026, productionYear: 2026, priceType: 'msrp', sourceUrl: 'x', validFrom: null }, trims)
    assert.equal(matched, null, 'топливо не указано — угадывать нельзя')
  })

  test('нормализация названий сводит «Тех Плюс» и «Техно +»', () => {
    assert.equal(normalizeTrimName('Тех Плюс, 2.0T 4WD'), normalizeTrimName('Техно +, 2.0T 4WD'))
  })
})

describe('diff импорта и каталога', () => {
  const trims = [
    { id: 'm6-optimum-mt-2026', modelId: 'm6', name: 'Оптимум, 1.5T MT 143', basePrice: 2_099_000, modelYear: 2026, productionYear: 2026, status: 'current' },
    { id: 'm6-optimum-at-2026', modelId: 'm6', name: 'Оптимум, 1.5T AT 143', basePrice: 2_349_000, modelYear: 2026, productionYear: 2026, status: 'current' },
  ]

  test('совпадение цен не создаёт изменений', () => {
    const diff = diffPrices(
      [{ modelSlug: 'm6', name: 'ОПТИМУМ, МТ 143 Л.С.', price: 2_099_000, modelYear: 2026, productionYear: 2026, priceType: 'msrp', sourceUrl: M6_URL, validFrom: '2026-08-14' }],
      trims,
      { coveredModelIds: ['m6'] },
    )
    assert.equal(diff.unchanged.length, 1)
    assert.equal(diff.changed.length, 0)
    assert.equal(diff.added.length, 0)
    assert.equal(diff.missing.length, 1, 'вторая комплектация не пришла в импорте — это фиксируется')
  })

  test('изменение цены фиксируется с предыдущим значением', () => {
    const diff = diffPrices(
      [{ modelSlug: 'm6', name: 'ОПТИМУМ, МТ 143 Л.С.', price: 2_199_000, modelYear: 2026, productionYear: 2026, priceType: 'msrp', sourceUrl: M6_URL, validFrom: '2026-09-01' }],
      trims,
      { coveredModelIds: ['m6'] },
    )
    assert.equal(diff.changed.length, 1)
    assert.equal(diff.changed[0].previousPrice, 2_099_000)
    assert.equal(diff.changed[0].newPrice, 2_199_000)
  })

  test('новая комплектация попадает в отдельный список', () => {
    const diff = diffPrices(
      [{ modelSlug: 'm6', name: 'Премиум, 1.5T AT 143', price: 2_549_000, modelYear: 2026, productionYear: 2026, priceType: 'msrp', sourceUrl: M6_URL, validFrom: null }],
      trims,
      { coveredModelIds: ['m6'] },
    )
    assert.equal(diff.added.length, 1)
    assert.equal(diff.changed.length, 0)
  })

  test('новая контрольная сумма документа означает новую версию прайс-листа', () => {
    const diff = diffDocuments(
      [{ url: M6_URL, modelId: 'm6', checksum: 'new' }],
      [{ id: 'price-m6-2026', url: M6_URL, modelId: 'm6', checksum: 'old', parsingStatus: 'parsed', documentType: 'price-list', extractedPrices: 2, fetchedAt: null, publicationDate: null, notes: null }],
    )
    assert.equal(diff.updatedDocuments.length, 1)
    assert.equal(diff.updatedDocuments[0].previousChecksum, 'old')
  })

  test('предложение с истёкшим сроком попадает в отчёт', () => {
    const diff = diffOffers([{ id: 'o1', name: 'Выгода', validFrom: '2026-01-01', validUntil: '2026-05-01' }], '2026-10-10')
    assert.equal(diff.expired.length, 1)
  })
})
