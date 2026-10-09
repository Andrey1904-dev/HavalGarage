import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

import {
  annuityPayment,
  principalFromPayment,
  rateFromPayment,
  remainingBalance,
  pdnRelief,
  simulatePrepayment,
  termFromPayment,
} from '../src/utils/loan'
import { addMonths, daysUntil, monthsBetween, nextPaymentDate, startOfMonth } from '../src/utils/date'
import { parseLocaleNumber, plural, pluralMonths, toDateInputValue } from '../src/utils/format'
import {
  computePurchasePlan,
  buildSchedule,
  aggregateByYear,
  downPaymentRub,
  MAX_TERM,
  MIN_TERM,
} from '../src/utils/credit'
import {
  MODELS,
  TRIMS,
  OFFERS,
  CREDIT_PROGRAMS,
  minCurrentPrice,
  programsForModel,
  programRateFor,
  trimsForModel,
  activeOffersForModel,
  CATALOG_FIXED_AT,
} from '../src/data/haval'
import { isSupabaseConfigured, submitCreditApplication, SUPABASE_URL } from '../src/lib/supabase'

const near = (actual: number, expected: number, eps = 0.5, msg?: string) =>
  assert.ok(Math.abs(actual - expected) <= eps, msg ?? `ожидалось ≈${expected}, получено ${actual}`)

/* ------------------------------------------------------------------ */
/* Кредитная математика: аннуитет, обратные задачи, досрочка, ПДН     */
/* ------------------------------------------------------------------ */

describe('аннуитет', () => {
  it('платёж по классической формуле', () => {
    near(annuityPayment(1_000_000, 12, 12), 88_848.79, 0.05)
    near(annuityPayment(1_050_000, 16.9, 60), 26_022, 50)
  })

  it('беспроцентный кредит делится поровну', () => {
    assert.equal(annuityPayment(120_000, 0, 12), 10_000)
  })

  it('некорректные входные данные дают NaN', () => {
    assert.ok(Number.isNaN(annuityPayment(0, 12, 12)))
    assert.ok(Number.isNaN(annuityPayment(100, 12, 0)))
  })

  it('срок и сумма обратны платежу', () => {
    const P = annuityPayment(1_000_000, 12, 24)
    near(termFromPayment(1_000_000, 12, P), 24, 0.01)
    near(principalFromPayment(P, 12, 24), 1_000_000, 1)
  })

  it('платёж меньше процентов — срок не определён', () => {
    assert.ok(Number.isNaN(termFromPayment(1_000_000, 12, 5_000)))
  })

  it('ставка восстанавливается бисекцией', () => {
    const P = annuityPayment(1_000_000, 18.5, 36)
    near(rateFromPayment(1_000_000, P, 36), 18.5, 0.01)
  })

  it('остаток долга: границы и середина', () => {
    assert.equal(remainingBalance(1_000_000, 12, 12, 0), 1_000_000)
    assert.equal(remainingBalance(1_000_000, 12, 12, 12), 0)
    const half = remainingBalance(1_000_000, 12, 12, 6)
    assert.ok(half > 480_000 && half < 520_000, `остаток после 6 из 12: ${half}`)
  })

  it('учитывает фактический платёж из банковского графика', () => {
    const balance = remainingBalance(1_000, 12, 12, 1, 100)
    near(balance, 910, 0.001)
    assert.notEqual(balance, remainingBalance(1_000, 12, 12, 1))
  })
})

describe('ПДН (перенесено)', () => {
  const base = { income: 100_000, totalMonthlyDebt: 60_000, annualPercent: 24, termLeft: 24 }

  it('считает предел платежей и сумму снижения', () => {
    const r = pdnRelief({ ...base, targetPercent: 50 })!
    near(r.allowedPayment, 50_000, 0.01)
    near(r.paymentToCut, 10_000, 0.01)
    assert.equal(r.reached, false)
  })

  it('переводит лишний платёж в остаток долга по аннуитету', () => {
    const r = pdnRelief({ ...base, targetPercent: 50 })!
    near(r.principalToClose, principalFromPayment(10_000, 24, 24), 0.01)
    assert.ok(r.principalToClose > 0)
  })

  it('более строгий порог требует закрыть больше', () => {
    const soft = pdnRelief({ ...base, targetPercent: 50 })!
    const hard = pdnRelief({ ...base, targetPercent: 30 })!
    assert.ok(hard.paymentToCut > soft.paymentToCut)
  })

  it('если порог соблюдён — показывает запас, а закрывать нечего', () => {
    const r = pdnRelief({ ...base, totalMonthlyDebt: 20_000, targetPercent: 30 })!
    assert.equal(r.reached, true)
    assert.equal(r.paymentToCut, 0)
    assert.ok(r.headroom > 0)
  })

  it('без дохода расчёт невозможен', () => {
    assert.equal(pdnRelief({ ...base, income: 0, targetPercent: 30 }), null)
  })
})

describe('досрочное погашение (перенесено)', () => {
  const common = { balance: 900_000, annualPercent: 17, payment: 26_000, termLeft: 48 }

  it('без досрочных взносов повторяет обычный график', () => {
    const p = simulatePrepayment({ ...common, mode: 'term' })!
    assert.ok(p.months > 0 && p.months <= 48)
    assert.ok(p.interest > 0)
  })

  it('разовый взнос сокращает срок и переплату', () => {
    const base = simulatePrepayment({ ...common, mode: 'term' })!
    const pre = simulatePrepayment({ ...common, oneTime: 150_000, mode: 'term' })!
    assert.ok(pre.months < base.months)
    assert.ok(pre.interest < base.interest)
  })

  it('сокращение срока выгоднее уменьшения платежа', () => {
    const byTerm = simulatePrepayment({ ...common, oneTime: 150_000, mode: 'term' })!
    const byPayment = simulatePrepayment({ ...common, oneTime: 150_000, mode: 'payment' })!
    assert.ok(byTerm.interest <= byPayment.interest)
  })

  it('взнос больше долга закрывает кредит', () => {
    const p = simulatePrepayment({ ...common, oneTime: 1_000_000, mode: 'term' })!
    assert.equal(p.months, 0)
  })

  it('платёж меньше процентов — расчёт невозможен', () => {
    assert.equal(simulatePrepayment({ ...common, payment: 1_000, mode: 'term' }), null)
  })
})

describe('даты (перенесено)', () => {
  it('addMonths не перескакивает через месяц', () => {
    const d = addMonths(new Date(2024, 0, 31), 1)
    assert.equal(d.getMonth(), 1)
    assert.equal(d.getDate(), 29) // февраль 2024
  })

  it('monthsBetween считает полные месяцы', () => {
    assert.equal(monthsBetween(new Date(2024, 0, 15), new Date(2024, 3, 14)), 2)
    assert.equal(monthsBetween(new Date(2024, 0, 15), new Date(2024, 3, 15)), 3)
  })

  it('следующий платёж — ближайший день месяца', () => {
    const from = new Date(2024, 5, 10)
    assert.equal(nextPaymentDate('2024-01-20', from).getDate(), 20)
    assert.equal(nextPaymentDate('2024-01-20', from).getMonth(), 5)
    const today = nextPaymentDate('2024-05-10', from)
    assert.equal(today.getDate(), 10)
  })

  it('daysUntil и startOfMonth', () => {
    assert.equal(daysUntil('2024-06-10', new Date(2024, 5, 10)), 0)
    assert.equal(startOfMonth(new Date(2024, 5, 17)).getDate(), 1)
  })
})

describe('форматирование (перенесено)', () => {
  it('парсит числа в русской раскладке', () => {
    assert.equal(parseLocaleNumber('1 050 000'), 1_050_000)
    assert.equal(parseLocaleNumber('16,9'), 16.9)
    assert.ok(Number.isNaN(parseLocaleNumber('')))
  })

  it('склонения', () => {
    assert.equal(plural(1, ['месяц', 'месяца', 'месяцев']), 'месяц')
    assert.equal(plural(3, ['месяц', 'месяца', 'месяцев']), 'месяца')
    assert.equal(plural(11, ['месяц', 'месяца', 'месяцев']), 'месяцев')
    assert.equal(pluralMonths(21), '21 месяц')
  })

  it('дата для input[type=date]', () => {
    assert.equal(toDateInputValue(new Date(2026, 9, 9)), '2026-10-09')
  })
})

/* ------------------------------------------------------------------ */
/* Новые тесты: расчётный сценарий покупки HAVAL                       */
/* ------------------------------------------------------------------ */

const scenario = (over: Partial<Parameters<typeof computePurchasePlan>[0]> = {}) =>
  computePurchasePlan({
    vehiclePrice: 2_099_000,
    discountAmount: 0,
    downPaymentRub: 0,
    downPaymentMode: 'percent',
    downPaymentPercent: 20,
    termMonths: 60,
    annualRatePercent: 16.4,
    extraCostsRub: 0,
    ...over,
  })

describe('сценарий покупки HAVAL', () => {
  it('взнос в процентах и аннуитетный платёж', () => {
    const r = scenario()
    assert.equal(r.ok, true)
    if (!r.ok) return
    const credit = 2_099_000 * 0.8
    near(r.plan.creditAmount, credit, 0.01)
    near(r.plan.monthlyPayment, annuityPayment(credit, 16.4, 60), 0.6)
    near(r.plan.totalPaid, r.plan.monthlyPayment * 60, 0.6)
    near(r.plan.interestOverpay, r.plan.totalPaid - credit, 0.6)
    near(r.plan.downPaymentPct, 20, 0.01)
  })

  it('взнос в рублях', () => {
    const r = scenario({ downPaymentMode: 'rub', downPaymentRub: 500_000 })
    assert.equal(r.ok, true)
    if (!r.ok) return
    near(r.plan.downPayment, 500_000, 0.01)
    near(r.plan.creditAmount, 2_099_000 - 500_000, 0.01)
  })

  it('нулевая ставка — отдельная ветка, платёж делит тело поровну', () => {
    const r = scenario({ annualRatePercent: 0 })
    assert.equal(r.ok, true)
    if (!r.ok) return
    near(r.plan.monthlyPayment, (2_099_000 * 0.8) / 60, 0.01)
    near(r.plan.interestOverpay, 0, 0.01)
  })

  it('подтверждённая скидка уменьшает тело кредита', () => {
    const r = scenario({ discountAmount: 250_000 })
    assert.equal(r.ok, true)
    if (!r.ok) return
    near(r.plan.effectivePrice, 2_099_000 - 250_000, 0.01)
    near(r.plan.creditAmount, (2_099_000 - 250_000) * 0.8, 0.01)
    near(r.plan.discountApplied, 250_000, 0.01)
  })

  it('взнос 100% — кредит не требуется', () => {
    const r = scenario({ downPaymentPercent: 100 })
    assert.equal(r.ok, true)
    if (!r.ok) return
    assert.equal(r.plan.noLoanNeeded, true)
    assert.equal(r.plan.monthlyPayment, 0)
  })

  it('дополнительные расходы входят в общие затраты, но не в тело кредита', () => {
    const r = scenario({ extraCostsRub: 90_000 })
    assert.equal(r.ok, true)
    if (!r.ok) return
    near(r.plan.creditAmount, 2_099_000 * 0.8, 0.01)
    near(r.plan.totalCost, r.plan.downPayment + r.plan.totalPaid + 90_000, 0.6)
  })

  it('взнос больше цены — ошибка валидации', () => {
    const r = scenario({ downPaymentMode: 'rub', downPaymentRub: 3_000_000 })
    assert.equal(r.ok, false)
  })

  it('скидка больше цены — ошибка', () => {
    const r = scenario({ discountAmount: 3_000_000 })
    assert.equal(r.ok, false)
  })

  it('нет цены — расчёт невозможен, а не деление на ноль', () => {
    const r = scenario({ vehiclePrice: null })
    assert.equal(r.ok, false)
  })

  it('отрицательная цена и ставка вне диапазона — ошибки', () => {
    assert.equal(scenario({ vehiclePrice: -1 }).ok, false)
    assert.equal(scenario({ annualRatePercent: -5 }).ok, false)
    assert.equal(scenario({ annualRatePercent: 150 }).ok, false)
  })

  it('некорректный срок отклоняется', () => {
    assert.equal(scenario({ termMonths: 0 }).ok, false)
    assert.equal(scenario({ termMonths: MAX_TERM + 1 }).ok, false)
    assert.equal(scenario({ termMonths: 12.5 }).ok, false)
    assert.equal(scenario({ termMonths: MIN_TERM }).ok, true)
  })

  it('downPaymentRub согласован с процентным режимом', () => {
    const input = {
      vehiclePrice: 1_000_000,
      discountAmount: 0,
      downPaymentMode: 'percent' as const,
      downPaymentPercent: 35,
      downPaymentRub: 0,
      termMonths: 12,
      annualRatePercent: 10,
      extraCostsRub: 0,
    }
    near(downPaymentRub(input), 350_000, 0.01)
  })
})

describe('график платежей', () => {
  it('тело долга в сумме равно сумме кредита', () => {
    const points = buildSchedule(1_000_000, 16, 24)
    const principal = points.reduce((s, p) => s + p.principalPart, 0)
    near(principal, 1_000_000, 24 * 0.5 + 1)
    assert.equal(points.length, 24)
    assert.equal(points.at(-1)!.balance, 0)
  })

  it('переплата совпадает с суммой процентов', () => {
    const points = buildSchedule(1_000_000, 16, 24)
    const interest = points.reduce((s, p) => s + p.interestPart, 0)
    const payment = annuityPayment(1_000_000, 16, 24)
    near(interest, payment * 24 - 1_000_000, 24 * 0.5 + 1)
  })

  it('нулевая ставка: проценты равны нулю', () => {
    const points = buildSchedule(120_000, 0, 12)
    assert.equal(points.reduce((s, p) => s + p.interestPart, 0), 0)
  })

  it('агрегация по годам сохраняет суммы', () => {
    const raw = buildSchedule(1_000_000, 16, 36)
    const yearly = aggregateByYear(raw)
    assert.equal(yearly.length, 3)
    near(
      yearly.reduce((s, p) => s + p.principalPart, 0),
      raw.reduce((s, p) => s + p.principalPart, 0),
      1,
    )
  })
})

/* ------------------------------------------------------------------ */
/* Целостность каталога HAVAL                                          */
/* ------------------------------------------------------------------ */

describe('каталог HAVAL: согласованный список моделей', () => {
  const required = ['m6', 'jolion', 'dargo', 'dargo-x', 'f7', 'f7x', 'poer']

  it('все модели из задачи представлены', () => {
    for (const id of required) {
      assert.ok(MODELS.some((m) => m.id === id), `нет модели ${id}`)
    }
  })

  it('дополнительные модели каталога АГАТ тоже представлены', () => {
    for (const id of ['poer-kingkong', 'h3', 'h5', 'h9', 'h7']) {
      assert.ok(MODELS.some((m) => m.id === id), `нет модели ${id}`)
    }
  })

  it('у каждой модели источник — сайт дилера и фото (кроме «скоро в продаже» без цены)', () => {
    for (const m of MODELS) {
      assert.ok(m.sourceUrl.startsWith('https://agat-ekb-haval.ru/'), `${m.id}: источник не АГАТ`)
      if (m.availability === 'on-sale') assert.ok(m.image, `${m.id}: нет фотографии`)
      if (m.image) {
        assert.ok(existsSync(path.join(process.cwd(), 'public', m.image)), `${m.id}: файл фото отсутствует`)
      }
    }
  })
})

describe('каталог HAVAL: комплектации и цены', () => {
  it('каждая комплектация ссылается на существующую модель', () => {
    for (const t of TRIMS) {
      assert.ok(MODELS.some((m) => m.id === t.modelId), `${t.id}: неизвестная модель`)
    }
  })

  it('цены положительные, источники и даты заполнения', () => {
    for (const t of TRIMS) {
      if (t.basePrice !== null) assert.ok(t.basePrice > 0, `${t.id}: некорректная цена`)
      assert.ok(/^https?:\/\//.test(t.priceSourceUrl), `${t.id}: нет источника цены`)
      assert.match(t.priceUpdatedAt, /^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('модельный год не смешивается: архив скрыт по умолчанию', () => {
    const jolionCurrent = trimsForModel('jolion')
    assert.ok(jolionCurrent.every((t) => t.modelYear === 2026))
    const withArchive = trimsForModel('jolion', true)
    assert.ok(withArchive.length > jolionCurrent.length)
  })

  it('минимальная текущая цена совпадает с официальными прайс-листами и тизерами', () => {
    assert.equal(minCurrentPrice('m6')?.basePrice, 2_099_000)
    assert.equal(minCurrentPrice('jolion')?.basePrice, 2_099_000)
    assert.equal(minCurrentPrice('dargo')?.basePrice, 3_199_000)
    assert.equal(minCurrentPrice('dargo-x')?.basePrice, 3_499_000)
    assert.equal(minCurrentPrice('f7')?.basePrice, 2_899_000)
    assert.equal(minCurrentPrice('f7x')?.basePrice, 3_599_000)
    assert.equal(minCurrentPrice('poer')?.basePrice, 3_449_000)
    assert.equal(minCurrentPrice('h3')?.basePrice, 2_749_000)
    assert.equal(minCurrentPrice('h5')?.basePrice, 4_049_000)
    assert.equal(minCurrentPrice('h7')?.basePrice, 3_999_000)
    assert.equal(minCurrentPrice('h9')?.basePrice, 4_799_000)
  })

  it('цены текущих комплектаций взяты из официальных прайс-листов производителя', () => {
    const official = TRIMS.filter((t) => t.status === 'current' && t.priceSourceUrl.includes('cdn.perxis.ru'))
    assert.ok(official.length >= 40, `ожидалось не менее 40 комплектаций из прайс-листов, получено ${official.length}`)
    for (const t of official) {
      assert.ok(t.modelYear !== null && t.productionYear !== null, `${t.id}: не указан модельный/производственный год`)
      assert.ok(t.horsepower !== null && t.horsepower > 0, `${t.id}: нет мощности двигателя`)
    }
  })

  it('модельные годы в пределах модели не смешиваются в одной записи', () => {
    const f7Current = trimsForModel('f7')
    const years = new Set(f7Current.map((t) => t.modelYear))
    assert.ok(years.has(2024) && years.has(2026))
    for (const t of f7Current) assert.ok(t.name.includes(`${t.modelYear} м.г.`), `${t.id}: год не отражён в названии`)
  })

  it('Supabase: отправка расчёта без ключей возвращает понятную ошибку и не падает', async () => {
    const result = await submitCreditApplication({
      model_id: 'm6',
      model_name: 'HAVAL M6',
      trim_id: 'm6-optimum-mt-2026',
      trim_name: 'Оптимум, 1.5T MT 143',
      vehicle_price: 2_099_000,
      discount_applied: 0,
      effective_price: 2_099_000,
      down_payment: 419_800,
      credit_amount: 1_679_200,
      term_months: 60,
      annual_rate: 16.4,
      monthly_payment: 41_395,
      total_paid: 2_483_700,
      interest_overpay: 804_500,
      extra_costs: 0,
      total_cost: 2_903_500,
      contact_name: 'Тест',
      contact_phone: '+7 900 000-00-00',
    })
    if (!isSupabaseConfigured) {
      assert.equal(result.ok, false)
      assert.match(result.ok === false ? result.error : '', /не настроена/)
    } else {
      assert.ok(SUPABASE_URL.startsWith('https://'))
    }
  })

  it('трейд-ин выгоды 200 000 ₽ для H3 и H7 подтверждены прайс-листами', () => {
    const h3 = activeOffersForModel('h3', CATALOG_FIXED_AT).find((o) => o.offerType === 'trade-in')
    const h7 = activeOffersForModel('h7', CATALOG_FIXED_AT).find((o) => o.offerType === 'trade-in')
    assert.ok(h3 && h3.discountAmount === 200_000)
    assert.ok(h7 && h7.discountAmount === 200_000)
    // Выгода не распространяется на другие модели
    assert.equal(activeOffersForModel('jolion', CATALOG_FIXED_AT).some((o) => o.offerType === 'trade-in'), false)
  })
})

describe('каталог HAVAL: предложения и программы', () => {
  it('предложения ссылаются на существующие модели и имеют источник', () => {
    for (const o of OFFERS) {
      assert.ok(o.modelIds.every((id) => MODELS.some((m) => m.id === id)))
      assert.ok(o.sourceUrl.startsWith('https://'))
      assert.ok(o.discountAmount === null || o.discountAmount > 0)
      assert.ok(o.discountPercent === null || (o.discountPercent > 0 && o.discountPercent <= 100))
    }
  })

  it('госпрограмма применяется только к M6', () => {
    const m6 = activeOffersForModel('m6', CATALOG_FIXED_AT)
    assert.ok(m6.some((o) => o.offerType === 'state-support'))
    assert.equal(activeOffersForModel('f7', CATALOG_FIXED_AT).some((o) => o.offerType === 'state-support'), false)
  })

  it('программы ссылаются на существующие модели', () => {
    for (const p of CREDIT_PROGRAMS) {
      assert.ok(p.modelIds.every((id) => MODELS.some((m) => m.id === id)), `${p.id}: неизвестная модель`)
      assert.ok(p.termMonthsMin <= p.termMonthsMax)
      assert.ok(p.downPaymentMinPct < p.downPaymentMaxPct)
    }
  })

  it('HAVAL SMART покрывает модели из публикации', () => {
    const smart = programsForModel('m6').find((p) => p.id === 'haval-smart')
    assert.ok(smart)
    for (const id of ['dargo', 'dargo-x', 'jolion', 'f7']) {
      assert.ok(programsForModel(id).some((p) => p.id === 'haval-smart'))
    }
    assert.equal(programsForModel('f7x').some((p) => p.id === 'haval-smart'), false)
  })

  it('таблица ставок SMART: 0,01% только при взносе 60–80% и 12 мес', () => {
    assert.equal(programRateFor('haval-smart', 'm6', 70, 12), 0.01)
    assert.equal(programRateFor('haval-smart', 'm6', 50, 12), 4.4)
    assert.equal(programRateFor('haval-smart', 'm6', 20, 84), 22.9)
  })

  it('льготная ставка не применяется к модели вне программы', () => {
    assert.equal(programRateFor('haval-smart', 'f7x', 70, 12), null)
  })
})
