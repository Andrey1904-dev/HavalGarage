import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  MODELS,
  TRIMS,
  OFFICIAL_SPECS,
  MODEL_EQUIPMENT,
  PRICES,
  OFFICIAL_PRICE_COUNT,
  STOCK_ITEMS,
  STOCK_SOURCE,
  PRICE_HISTORY,
  OFFERS,
  buildPriceRecords,
  benefitPricesForTrim,
  getOfficialSpecs,
  getModelEquipment,
  getTrimTech,
  msrpForTrim,
  offersForTrim,
  priceFreshness,
  pricesForTrim,
  trimDetails,
  trimFeatureIndex,
  trimHasFeature,
  compareFeatures,
  modelSummary,
  allModelSummaries,
  pricedCurrentTrims,
  lastSuccessfulCheck,
  CATALOG_FIXED_AT,
  PRICE_STALE_AFTER_DAYS,
} from '../src/data/haval'

/**
 * Целостность нового слоя данных: официальные характеристики, оснащение,
 * нормализованные цены, наличие и история проверок.
 */

const OFFICIAL_MODEL_IDS = ['m6', 'jolion', 'dargo', 'dargo-x', 'f7', 'f7x', 'poer', 'h3', 'h5', 'h7', 'h9']

describe('официальные характеристики (specs.ts)', () => {
  it('все модели официального каталога имеют характеристики из прайс-листов', () => {
    for (const id of OFFICIAL_MODEL_IDS) {
      const specs = getOfficialSpecs(id)
      assert.ok(specs, `${id}: нет официальных характеристик`)
      assert.ok(specs.sourceUrl.includes('cdn.perxis.ru'), `${id}: источник не прайс-лист производителя`)
      assert.match(specs.verifiedAt, /^\d{4}-\d{2}-\d{2}$/)
      assert.ok(specs.engines.length > 0, `${id}: нет двигателей`)
    }
  })

  it('габариты, клиренс и колёсная база заполнены числом там, где их публикует документ', () => {
    for (const specs of OFFICIAL_SPECS) {
      if (specs.dimensions) {
        assert.ok(specs.dimensions.lengthMm! > 3000, `${specs.modelId}: длина нереалистична`)
        assert.ok(specs.dimensions.widthMm! > 1500, `${specs.modelId}: ширина нереалистична`)
        assert.ok(specs.dimensions.heightMm! > 1400, `${specs.modelId}: высота нереалистична`)
      }
      if (specs.wheelbaseMm !== null) {
        assert.ok(specs.wheelbaseMm > 2000 && specs.wheelbaseMm < 3600, `${specs.modelId}: база вне диапазона`)
      }
    }
  })

  it('мощность и момент соответствуют прайс-листам (контрольные значения)', () => {
    const m6 = getOfficialSpecs('m6')!
    assert.equal(m6.engines[0].powerHp, 143)
    assert.equal(m6.engines[0].torqueNm, 202)
    assert.equal(m6.engines[0].displacementCc, 1497)

    const h9 = getOfficialSpecs('h9')!
    assert.equal(h9.engines[0].powerHp, 218)
    assert.equal(h9.engines[0].torqueNm, 380)
    assert.equal(h9.seats, 7)

    const jolion = getOfficialSpecs('jolion')!
    assert.equal(jolion.engines.length, 2)
    assert.equal(jolion.engines[0].torqueNm, 210)
    assert.equal(jolion.engines[1].powerHp, 150)
    assert.equal(jolion.engines[1].torqueNm, 270)

    const dargoX = getOfficialSpecs('dargo-x')!
    assert.equal(dargoX.engines[0].powerHp, 192)
    assert.equal(dargoX.engines[0].torqueNm, 320)
  })

  it('неизвестные значения — null, а не догадка; список нераскрытых полей ведётся явно', () => {
    const h7 = getOfficialSpecs('h7')!
    assert.equal(h7.engines[0].displacementCc, null, 'объём двигателя H7 в прайс-листе не указан')
    assert.ok(h7.unknownFields.some((f) => f.includes('Рабочий объём')))
    for (const specs of OFFICIAL_SPECS) {
      assert.ok(Array.isArray(specs.unknownFields), `${specs.modelId}: нет списка нераскрытых полей`)
    }
  })

  it('POER: три двигателя и расход по циклам для каждой версии', () => {
    const poer = getOfficialSpecs('poer')!
    assert.equal(poer.engines.length, 3)
    assert.equal(poer.payloadKg, 975)
    const diesel = getTrimTech('poer-premium-at-diesel-2026')!
    assert.equal(diesel.torqueNm, 480)
    assert.equal(diesel.consumption?.combined, 8.4)
    const gas = getTrimTech('poer-comfort-mt-gas-2026')!
    assert.equal(gas.consumption?.city, 12.8)
  })

  it('у каждой текущей комплектации официальных моделей есть момент и расход', () => {
    // F7 2024 м.г. и F7x 2025 м.г.: прайс-листы прошлых модельных годов
    // в этой сессии не проверялись — характеристики не заполняются до подтверждения
    const unconfirmed = /^(f7-.*-2024my|f7x-.*-2025my)$/
    for (const trim of pricedCurrentTrims()) {
      if (trim.modelId === 'poer-kingkong' || unconfirmed.test(trim.id)) continue
      const tech = getTrimTech(trim.id)
      assert.ok(tech, `${trim.id}: нет технических уточнений`)
      if (tech.torqueNm !== null) assert.ok(tech.torqueNm > 100, `${trim.id}: нереалистичный момент`)
    }
  })
})

describe('оснащение (equipment.ts)', () => {
  it('матрицы различий ссылаются только на существующие комплектации', () => {
    for (const eq of MODEL_EQUIPMENT) {
      assert.ok(MODELS.some((m) => m.id === eq.modelId), `${eq.modelId}: неизвестная модель`)
      for (const row of eq.matrix) {
        for (const trimId of Object.keys(row.values)) {
          assert.ok(TRIMS.some((t) => t.id === trimId), `${eq.modelId}: неизвестная комплектация ${trimId}`)
        }
      }
    }
  })

  it('значение «не подтверждено» не подменяется «нет»', () => {
    // комплектации F7 2024 м.г. отсутствуют в матрице 2026 м.г. → unknown
    const features = compareFeatures(['f7-optimum-15-2wd-2024my', 'f7-optimum-15-2wd-2026my'])
    const matrixRow = features.find((f) => f.feature.includes('Панорамная крыша'))
    assert.ok(matrixRow)
    assert.equal(matrixRow.values['f7-optimum-15-2wd-2026my'], 'unavailable')
    assert.equal(matrixRow.values['f7-optimum-15-2wd-2024my'], 'unknown')
  })

  it('базовое оснащение модели помечается как «есть» у всех её комплектаций', () => {
    const eq = getModelEquipment('m6')!
    assert.ok(eq.standard.length >= 5)
    const features = compareFeatures(['m6-optimum-mt-2026', 'm6-optimum-at-2026'])
    const led = features.find((f) => f.feature === 'Светодиодные фары')
    assert.ok(led)
    assert.equal(led.values['m6-optimum-mt-2026'], 'standard')
    assert.equal(led.values['m6-optimum-at-2026'], 'standard')
  })

  it('опциональные позиции помечены как optional (М6 — окраска металлик)', () => {
    const features = compareFeatures(['m6-optimum-mt-2026', 'm6-optimum-at-2026'])
    const metallic = features.find((f) => f.feature.includes('Окраска кузова металлик'))
    assert.ok(metallic)
    assert.equal(metallic.values['m6-optimum-mt-2026'], 'optional')
  })

  it('trimHasFeature проверяет требования по официальным данным', () => {
    assert.equal(trimHasFeature('h7-premium-2026', 'адаптивный круиз'), true)
    assert.equal(trimHasFeature('m6-optimum-mt-2026', 'адаптивный круиз'), false)
    assert.equal(trimHasFeature('h9-technoplus-2026', 'понижающая передача'), true)
    assert.equal(trimHasFeature('jolion-technoplus-4wd-2026', 'панорамная'), true)
    assert.equal(trimHasFeature('jolion-comfort-mt-2026', 'панорамная'), false)
    assert.equal(trimHasFeature('m6-optimum-mt-2026', ''), true)
    assert.ok(trimFeatureIndex('m6-optimum-mt-2026').length > 200)
  })
})

describe('нормализованные цены (prices.ts)', () => {
  it('базовая цена каждой комплектации записана с её типом', () => {
    for (const trim of pricedCurrentTrims()) {
      const expectedType = trim.priceType ?? 'msrp'
      const base = expectedType === 'msrp' ? msrpForTrim(trim.id) : pricesForTrim(trim.id).find((p) => p.priceType === expectedType)
      assert.ok(base, `${trim.id}: нет записи базовой цены (${expectedType})`)
      assert.equal(base.amount, trim.basePrice)
      assert.ok(base.sourceUrl.startsWith('https://'))
      assert.match(base.verifiedAt, /^\d{4}-\d{2}-\d{2}$/)
      if (expectedType === 'msrp') assert.equal(base.status, trim.priceValidFrom ? 'verified' : 'needs-check')
    }
  })

  it('выгоды хранятся отдельными записями и не уменьшают базовую цену', () => {
    const h3 = TRIMS.find((t) => t.id === 'h3-optimum-2wd-2026')!
    assert.equal(h3.basePrice, 2_749_000, 'базовая МЦП H3 не должна включать выгоду трейд-ин')
    const benefits = benefitPricesForTrim(h3.id)
    const tradeIn = benefits.find((p) => p.priceType === 'trade-in')
    assert.ok(tradeIn, 'нет записи цены с трейд-ин')
    assert.equal(tradeIn.amount, 2_549_000)
    assert.ok(tradeIn.conditions.includes('Лояльный Трейд-ин'))
  })

  it('тизер без комплектации помечен как требующий подтверждения', () => {
    const kingkong = PRICES.filter((p) => p.modelId === 'poer-kingkong')
    assert.ok(kingkong.length > 0)
    const teaser = kingkong.filter((p) => p.priceType === 'teaser')
    assert.equal(teaser.length, 1, 'тизер должен быть один')
    assert.equal(teaser[0].amount, 3_099_000)
    assert.equal(teaser[0].status, 'needs-check')
    // выгода на неподтверждённую базу не начисляется
    assert.equal(
      kingkong.some((p) => p.priceType === 'with-benefit'),
      false,
      'скидка от тизера без комплектации создала бы неподтверждённую цену',
    )
  })

  it('дубликаты комплектаций и цен не создаются', () => {
    const ids = TRIMS.map((t) => t.id)
    assert.equal(new Set(ids).size, ids.length, 'найдены дубликаты id комплектаций')
    const priceIds = PRICES.map((p) => p.id)
    assert.equal(new Set(priceIds).size, priceIds.length, 'найдены дубликаты id цен')
    // у комплектации не более одной записи каждого типа цены с одинаковой суммой
    for (const trim of pricedCurrentTrims()) {
      const records = pricesForTrim(trim.id)
      const keys = records.map((r) => `${r.priceType}:${r.amount}`)
      assert.equal(new Set(keys).size, keys.length, `${trim.id}: дубли записей цены`)
    }
  })

  it('отсутствие цены — null, а не ноль и не выдуманное значение', () => {
    for (const trim of TRIMS) {
      assert.ok(trim.basePrice === null || trim.basePrice > 100_000, `${trim.id}: подозрительная цена`)
    }
    const withoutPrice = TRIMS.filter((t) => t.basePrice === null)
    assert.equal(withoutPrice.length, 0, 'все комплектации должны иметь цену либо отсутствовать в каталоге')
  })

  it('актуальность цены: свежая, устаревшая и непроверенная', () => {
    assert.equal(priceFreshness(CATALOG_FIXED_AT).status, 'verified')
    const staleDate = new Date(new Date(CATALOG_FIXED_AT).getTime() - (PRICE_STALE_AFTER_DAYS + 10) * 86_400_000)
      .toISOString()
      .slice(0, 10)
    assert.equal(priceFreshness(staleDate).status, 'stale')
    assert.equal(priceFreshness(null).status, 'needs-check')
  })

  it('пересборка записей цен детерминирована', () => {
    const again = buildPriceRecords(CATALOG_FIXED_AT)
    assert.equal(again.length, PRICES.length)
    assert.equal(again.map((p) => p.id).join('|'), PRICES.map((p) => p.id).join('|'))
  })

  it('официальных цен не меньше, чем комплектаций в прайс-листах', () => {
    assert.ok(OFFICIAL_PRICE_COUNT >= 40, `ожидалось ≥40 официальных цен, получено ${OFFICIAL_PRICE_COUNT}`)
  })
})

describe('предложения: ограничения и условия', () => {
  it('выгода трейд-ин не распространяется на модели вне программы', () => {
    assert.equal(
      offersForTrim('jolion-comfort-mt-2026', 'jolion', 2026, CATALOG_FIXED_AT).some((o) => o.offerType === 'trade-in'),
      false,
    )
    const h3Offers = offersForTrim('h3-optimum-2wd-2026', 'h3', 2026, CATALOG_FIXED_AT)
    assert.ok(h3Offers.some((o) => o.offerType === 'trade-in'))
  })

  it('предложение с ограничением по модельному году не применяется к другому году', () => {
    const h3_2026 = offersForTrim('h3-optimum-2wd-2026', 'h3', 2026, CATALOG_FIXED_AT)
    const h3_other = offersForTrim('h3-optimum-2wd-2026', 'h3', 2024, CATALOG_FIXED_AT)
    assert.ok(h3_2026.some((o) => o.id === 'h3-trade-in-loyal-200k'))
    assert.equal(
      h3_other.some((o) => o.id === 'h3-trade-in-loyal-200k'),
      false,
      'выгода 2026 м.г. не должна применяться к 2024 м.г.',
    )
  })

  it('у каждого предложения есть условия получения, источник и статус', () => {
    for (const o of OFFERS) {
      assert.ok(o.name.length > 3, `${o.id}: нет названия`)
      assert.ok(o.eligibilityConditions.length > 10, `${o.id}: нет условий получения`)
      assert.ok(o.sourceUrl.startsWith('https://'), `${o.id}: нет источника`)
      assert.ok(['active', 'expired', 'unverified'].includes(o.status), `${o.id}: некорректный статус`)
    }
  })

  it('предложение, которого ещё нет на дату проверки, не активно', () => {
    const future = '2020-01-01'
    assert.equal(offersForTrim('h3-optimum-2wd-2026', 'h3', 2026, future).length, 0)
  })
})

describe('автомобили в наличии', () => {
  it('источник помечен как недоступный, фиктивных позиций нет', () => {
    assert.equal(STOCK_SOURCE.available, false)
    assert.ok(STOCK_SOURCE.reason.length > 50)
    assert.ok(STOCK_SOURCE.officialUrl.includes('haval.ru'))
    for (const item of STOCK_ITEMS) {
      assert.ok(item.sourceUrl.startsWith('https://'), 'нет первоисточника')
      assert.equal(item.vehicleId, null, 'VIN не публикуется источником — выдумывать нельзя')
      assert.ok(['confirmed', 'unverified'].includes(item.status))
      assert.match(item.verifiedAt, /^\d{4}-\d{2}-\d{2}$/)
      assert.ok(item.price > 0)
    }
  })
})

describe('история проверок и агрегированные выборки', () => {
  it('история содержит запись успешной проверки', () => {
    assert.ok(PRICE_HISTORY.length > 0)
    assert.equal(lastSuccessfulCheck(), '2026-10-09')
    for (const e of PRICE_HISTORY) {
      assert.match(e.checkedAt, /^\d{4}-\d{2}-\d{2}$/)
      assert.ok(['updated', 'unchanged', 'failed', 'manual-verification'].includes(e.outcome))
      assert.ok(e.models.every((id) => MODELS.some((m) => m.id === id)), `${e.checkedAt}: неизвестная модель в истории`)
    }
  })

  it('сводка по модели возвращает диапазон цен и мощности', () => {
    const jolion = modelSummary('jolion')!
    assert.equal(jolion.priceFrom, 2_099_000)
    assert.equal(jolion.priceTo, 2_949_000)
    assert.equal(jolion.powerRange, '143–150 л.с.')
    assert.equal(allModelSummaries().length, MODELS.length)
    assert.equal(modelSummary('unknown'), null)
  })

  it('trimDetails соединяет данные комплектации и официальные характеристики', () => {
    const d = trimDetails('h9-technoplus-2026')!
    assert.equal(d.trim.basePrice, 5_299_000)
    assert.equal(d.torqueNm, 380)
    assert.equal(d.consumption?.combined, 10.6)
    assert.equal(d.dimensionsText, '4950 × 1976 × 1930 мм')
    assert.equal(d.wheelbaseMm, 2850)
    assert.ok(d.colorsExterior.length >= 3)
    assert.equal(trimDetails('no-such-trim'), null)
  })

  it('для модели без прайс-листа характеристики отсутствуют, а не выдуманы', () => {
    assert.equal(getOfficialSpecs('poer-kingkong'), null)
    assert.equal(getModelEquipment('poer-kingkong'), null)
    const kingkong = MODELS.find((m) => m.id === 'poer-kingkong')!
    assert.equal(kingkong.priceListUrl, null)
    assert.equal(kingkong.catalogueUrl, null)
  })
})
