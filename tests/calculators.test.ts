import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  availableForLoanPayment,
  catalogCandidates,
  maxAffordablePrice,
  searchByBudget,
  sortBudgetMatches,
} from '../src/utils/budget'
import { computeRequiredDownPayment } from '../src/utils/required-down'
import { computeTco, operatingCostPerKm } from '../src/utils/tco'
import {
  computeSavingsPlan,
  monthsToReachGoal,
  projectPrice,
  requiredMonthlyContribution,
} from '../src/utils/savings'
import { computeTradeIn } from '../src/utils/tradein'
import { annuityPayment, principalFromPayment } from '../src/utils/loan'
import { computePurchasePlan } from '../src/utils/credit'
import { fmtMoney } from '../src/utils/format'
import { compareFeatures, TRIMS } from '../src/data/haval'

/**
 * Тесты новых расчётных модулей: подбор по бюджету, обратный расчёт взноса,
 * стоимость владения, план накопления, трейд-ин, округление денег.
 * Все проверки — на детерминированных контрольных значениях.
 */

const near = (actual: number, expected: number, eps = 1, msg?: string) =>
  assert.ok(Math.abs(actual - expected) <= eps, msg ?? `ожидалось ≈${expected}, получено ${actual}`)

describe('подбор по бюджету: максимальная стоимость автомобиля', () => {
  it('бюджет = взнос + тело кредита из платежа (контрольный пример)', () => {
    // платёж 40 000 ₽, ставка 12% (r = 0,01), 60 мес:
    // S = P · ((1+r)^n − 1) / (r·(1+r)^n) = 40 000 · 44,9550 ≈ 1 798 201,5 ₽
    const principal = principalFromPayment(40_000, 12, 60)
    const max = maxAffordablePrice(40_000, 500_000, 60, 12)!
    near(max, principal + 500_000, 1)
    near(principal, 1_798_201.5, 1)
  })

  it('нулевая ставка: тело = платёж × срок', () => {
    near(maxAffordablePrice(30_000, 200_000, 36, 0)!, 30_000 * 36 + 200_000, 1)
  })

  it('эксплуатационный бюджет вычитается из доступного платежа', () => {
    assert.equal(availableForLoanPayment(50_000, 10_000), 40_000)
    assert.equal(availableForLoanPayment(50_000, 0), 50_000)
    assert.equal(availableForLoanPayment(50_000, null), 50_000)
    const withMaintenance = maxAffordablePrice(50_000, 0, 60, 12, 10_000)!
    const without = maxAffordablePrice(40_000, 0, 60, 12)!
    near(withMaintenance, without, 1)
  })

  it('некорректные параметры — null, а не Infinity или NaN', () => {
    assert.equal(maxAffordablePrice(0, 500_000, 60, 12), null)
    assert.equal(maxAffordablePrice(40_000, 0, 0, 12), null)
    assert.equal(maxAffordablePrice(40_000, 0, 60, -5), null)
  })
})

describe('подбор по бюджету: выдача', () => {
  const base = {
    maxMonthlyPayment: 60_000,
    downPaymentRub: 600_000,
    termMonths: 60,
    annualRatePercent: 16.4,
  }

  it('возвращает подходящие варианты и объясняет причины', () => {
    const r = searchByBudget(base)
    assert.equal(r.ok, true)
    if (!r.ok) return
    const fitting = r.matches.filter((m) => m.withinBudget)
    assert.ok(fitting.length > 5, `ожидалось несколько подходящих вариантов, получено ${fitting.length}`)
    for (const m of fitting) {
      assert.ok(m.reasons.length > 0, 'нет причин соответствия')
      assert.ok(m.monthlyPayment <= base.maxMonthlyPayment + 0.5)
      assert.equal(m.eligible, true)
      assert.ok(m.candidate.sourceUrl.startsWith('https://'))
    }
  })

  it('превышающие бюджет варианты не скрываются и помечены', () => {
    const r = searchByBudget({ ...base, maxMonthlyPayment: 25_000 })
    assert.equal(r.ok, true)
    if (!r.ok) return
    const over = r.matches.filter((m) => !m.withinBudget)
    assert.ok(over.length > 0, 'при платеже 25 000 ₽ должны остаться альтернативы с превышением')
    for (const m of over) {
      assert.ok(m.overBy > 0)
      assert.ok(m.reasons.some((reason) => reason.includes('превышает') || reason.includes('Превышает')))
    }
  })

  it('обязательное требование по приводу исключает неподходящие', () => {
    const r = searchByBudget({ ...base, drivetrain: 'awd' })
    if (!r.ok) return assert.fail('ожидался успешный результат')
    assert.ok(r.matches.length > 0)
    for (const m of r.matches) {
      assert.match(m.candidate.drivetrain, /полн|4wd/i)
    }
    const fwd = searchByBudget({ ...base, drivetrain: 'fwd' })
    if (!fwd.ok) return assert.fail('ожидался успешный результат')
    for (const m of fwd.matches) assert.match(m.candidate.drivetrain, /передн|2wd/i)
  })

  it('минимально необходимая функция фильтрует выдачу', () => {
    const r = searchByBudget({ ...base, requiredFeatures: ['понижающая передача'] })
    if (!r.ok) return assert.fail('ожидался успешный результат')
    const models = new Set(r.matches.map((m) => m.candidate.modelId))
    assert.ok(models.has('h5') || models.has('h9') || models.has('poer'), `рамные модели не найдены: ${[...models]}`)
    assert.equal(models.has('m6'), false, 'M6 не имеет понижающей передачи')
  })

  it('тип кузова учитывается', () => {
    const r = searchByBudget({ ...base, bodyTypes: ['Пикап'] })
    if (!r.ok) return assert.fail('ожидался успешный результат')
    assert.ok(r.matches.length > 0)
    for (const m of r.matches) assert.match(m.candidate.bodyType, /пикап/i)
  })

  it('официальная программа исключает модели вне программы и лимиты', () => {
    // HAVAL SMART: M6, DARGO, DARGO X, JOLION, F7; взнос 10–80%, срок 12–84
    const r = searchByBudget({ ...base, programId: 'haval-smart' })
    if (!r.ok) return assert.fail('ожидался успешный результат')
    assert.ok(r.matches.length > 0)
    for (const m of r.matches) {
      assert.ok(['m6', 'dargo', 'dargo-x', 'jolion', 'f7'].includes(m.candidate.modelId), m.candidate.modelId)
      assert.equal(m.rateSource, 'program')
    }
    const outOfTerm = searchByBudget({ ...base, programId: 'haval-smart', termMonths: 120 })
    if (!outOfTerm.ok) return assert.fail('ожидался успешный результат')
    assert.equal(outOfTerm.matches.length, 0, 'срок 120 мес вне диапазона программы — выдача должна быть пустой')
  })

  it('варианты с подтверждённой выгодой идут отдельными кандидатами с условиями', () => {
    const r = searchByBudget({ ...base, priceMode: 'best-available' })
    if (!r.ok) return assert.fail('ожидался успешный результат')
    const withBenefit = r.matches.filter((m) => m.candidate.priceType === 'trade-in')
    assert.ok(withBenefit.length > 0, 'не найдены цены с трейд-ин')
    for (const m of withBenefit) {
      assert.ok(m.candidate.conditions && m.candidate.conditions.length > 20)
      assert.ok(m.warnings.length > 0, 'выгода должна сопровождаться предупреждением')
    }
  })

  it('тизер без комплектации не участвует в подборе', () => {
    const candidates = catalogCandidates()
    assert.equal(candidates.some((c) => c.modelId === 'poer-kingkong'), false)
    assert.equal(candidates.some((c) => c.priceType === 'teaser'), false)
  })

  it('сортировки работают и детерминированы', () => {
    const r = searchByBudget(base)
    if (!r.ok) return assert.fail('ожидался успешный результат')
    const byPayment = sortBudgetMatches(r.matches, 'payment')
    for (let i = 1; i < byPayment.length; i++) {
      assert.ok(byPayment[i - 1].monthlyPayment <= byPayment[i].monthlyPayment)
    }
    const byPrice = sortBudgetMatches(r.matches, 'price')
    for (let i = 1; i < byPrice.length; i++) assert.ok(byPrice[i - 1].price <= byPrice[i].price)
    const byTotal = sortBudgetMatches(r.matches, 'total')
    for (let i = 1; i < byTotal.length; i++) assert.ok(byTotal[i - 1].totalCost <= byTotal[i].totalCost)
    const byFit = sortBudgetMatches(r.matches, 'fit')
    for (let i = 1; i < byFit.length; i++) assert.ok(byFit[i - 1].score >= byFit[i].score)
    // повторная сортировка даёт тот же порядок
    assert.deepEqual(
      sortBudgetMatches(r.matches, 'payment').map((m) => m.candidate.trimId),
      byPayment.map((m) => m.candidate.trimId),
    )
  })

  it('некорректные входные данные отклоняются с понятной ошибкой', () => {
    const r = searchByBudget({ ...base, maxMonthlyPayment: 0 })
    assert.equal(r.ok, false)
    if (r.ok) return
    assert.ok(r.errors.length > 0)
    assert.equal(searchByBudget({ ...base, downPaymentRub: -1 }).ok, false)
    assert.equal(searchByBudget({ ...base, termMonths: 0 }).ok, false)
    assert.equal(searchByBudget({ ...base, annualRatePercent: -3 }).ok, false)
  })

  it('взнос больше цены — кредит не нужен, платёж нулевой', () => {
    const r = searchByBudget({ ...base, downPaymentRub: 9_000_000, maxMonthlyPayment: 1 })
    if (!r.ok) return assert.fail('ожидался успешный результат')
    const noLoan = r.matches.filter((m) => m.creditAmount === 0)
    assert.ok(noLoan.length > 0)
    for (const m of noLoan) assert.equal(m.monthlyPayment, 0)
  })
})

describe('обратный расчёт первоначального взноса', () => {
  it('минимальный взнос согласован с аннуитетом', () => {
    const price = 3_000_000
    const target = 50_000
    const term = 60
    const rate = 16.4
    const r = computeRequiredDownPayment({
      vehiclePrice: price,
      targetMonthlyPayment: target,
      termMonths: term,
      annualRatePercent: rate,
    })
    assert.equal(r.ok, true)
    if (!r.ok) return
    const maxLoan = principalFromPayment(target, rate, term)
    near(r.plan.maxLoanAmount, Math.min(maxLoan, price), 1)
    near(r.plan.minDownPayment, Math.max(0, price - maxLoan), 1)
    near(r.plan.actualPayment, annuityPayment(r.plan.financedAmount - r.plan.minDownPayment, rate, term), 1)
    near(r.plan.downPaymentPct, (r.plan.minDownPayment / price) * 100, 0.01)
    assert.equal(r.plan.savingsNeeded, r.plan.minDownPayment)
  })

  it('большой платёж позволяет обойтись без взноса', () => {
    const r = computeRequiredDownPayment({
      vehiclePrice: 2_000_000,
      targetMonthlyPayment: 60_000,
      termMonths: 60,
      annualRatePercent: 12,
    })
    if (!r.ok) return assert.fail('ожидался успешный результат')
    assert.equal(r.plan.minDownPayment, 0)
    assert.equal(r.plan.achievable, true)
  })

  it('нулевая ставка: взнос = цена − платёж × срок', () => {
    const r = computeRequiredDownPayment({
      vehiclePrice: 2_400_000,
      targetMonthlyPayment: 30_000,
      termMonths: 60,
      annualRatePercent: 0,
    })
    if (!r.ok) return assert.fail('ожидался успешный результат')
    near(r.plan.minDownPayment, 2_400_000 - 30_000 * 60, 1)
  })

  it('малый платёж требует почти полной оплаты и объясняется', () => {
    const r = computeRequiredDownPayment({
      vehiclePrice: 5_000_000,
      targetMonthlyPayment: 100,
      termMonths: 84,
      annualRatePercent: 20,
    })
    if (!r.ok) return assert.fail('ожидался успешный результат')
    assert.equal(r.plan.achievable, true, 'математически платёж достижим при огромном взносе')
    assert.equal(r.plan.requiresAlmostFullPayment, true)
    assert.ok(r.plan.downPaymentPct > 95)
    assert.ok(r.plan.warnings.some((w) => w.includes('покупка без кредита')))
    assert.ok(r.plan.alternatives.length >= 7)
    // с ростом срока требуемый взнос не увеличивается
    const byTerm = [...r.plan.alternatives].sort((a, b) => a.termMonths - b.termMonths)
    for (let i = 1; i < byTerm.length; i++) {
      assert.ok(byTerm[i].requiredDownPayment <= byTerm[i - 1].requiredDownPayment + 1)
    }
  })

  it('дополнительные расходы в кредите увеличивают требуемый взнос', () => {
    const common = { vehiclePrice: 3_000_000, targetMonthlyPayment: 55_000, termMonths: 60, annualRatePercent: 16 }
    const without = computeRequiredDownPayment(common)
    const withExtra = computeRequiredDownPayment({ ...common, financedExtraCosts: 200_000 })
    if (!without.ok || !withExtra.ok) return assert.fail('ожидался успешный результат')
    assert.ok(withExtra.plan.minDownPayment > without.plan.minDownPayment)
    assert.equal(withExtra.plan.financedAmount, 3_200_000)
  })

  it('ограничения официальной программы проверяются', () => {
    // HAVAL STANDARD: взнос 20–80%, срок 36–84, ставка 26,2%, только указанные модели
    const r = computeRequiredDownPayment({
      vehiclePrice: 3_500_000,
      targetMonthlyPayment: 70_000,
      termMonths: 60,
      annualRatePercent: 10,
      programId: 'haval-standard',
      modelId: 'jolion',
    })
    if (!r.ok) return assert.fail('ожидался успешный результат')
    assert.equal(r.plan.rateSource, 'program')
    assert.equal(r.plan.rate, 26.2)
    const notInProgram = computeRequiredDownPayment({
      vehiclePrice: 4_800_000,
      targetMonthlyPayment: 70_000,
      termMonths: 60,
      annualRatePercent: 10,
      programId: 'haval-smart',
      modelId: 'h9',
    })
    assert.equal(notInProgram.ok, false, 'H9 не участвует в HAVAL SMART — расчёт должен быть отклонён')
  })

  it('некорректные данные отклоняются', () => {
    assert.equal(
      computeRequiredDownPayment({ vehiclePrice: 0, targetMonthlyPayment: 30_000, termMonths: 60, annualRatePercent: 12 }).ok,
      false,
    )
    assert.equal(
      computeRequiredDownPayment({ vehiclePrice: 2_000_000, targetMonthlyPayment: 0, termMonths: 60, annualRatePercent: 12 }).ok,
      false,
    )
    assert.equal(
      computeRequiredDownPayment({ vehiclePrice: 2_000_000, targetMonthlyPayment: 30_000, termMonths: 200, annualRatePercent: 12 })
        .ok,
      false,
    )
  })
})

describe('стоимость владения', () => {
  const base = {
    annualMileageKm: 15_000,
    fuelConsumptionL100: 8.2,
    consumptionSource: 'official' as const,
    fuelPricePerL: 60,
    maintenancePerYear: 30_000,
    insurancePerYear: 60_000,
    transportTaxPerYear: 7_150,
    seasonalTires: 80_000,
    tireServicePerYear: 8_000,
    otherPerYear: 12_000,
    ownershipYears: 3,
    monthlyLoanPayment: 40_000,
    loanTermMonths: 60,
  }

  it('топливо считается по расходу, пробегу и цене', () => {
    const r = computeTco(base)
    if (!r.ok) return assert.fail('ожидался успешный результат')
    const fuel = r.result.categories.find((c) => c.key === 'fuel')!
    near(fuel.perYear, (15_000 * 8.2 * 60) / 100, 0.01)
    near(fuel.total, ((15_000 * 8.2 * 60) / 100) * 3, 0.01)
    assert.equal(fuel.source, 'official')
  })

  it('эксплуатация и кредитные платежи разделены', () => {
    const r = computeTco(base)
    if (!r.ok) return assert.fail('ожидался успешный результат')
    const operating = r.result.categories.reduce((s, c) => s + c.total, 0)
    near(r.result.operatingTotal, operating, 0.01)
    near(r.result.loanPaymentsTotal, 40_000 * 36, 0.01) // 36 из 60 месяцев попадают в 3 года
    near(r.result.grandTotal, operating + 40_000 * 36, 0.01)
    assert.equal(r.result.loanMonthsInPeriod, 36)
  })

  it('средняя стоимость в месяц и стоимость километра', () => {
    const r = computeTco(base)
    if (!r.ok) return assert.fail('ожидался успешный результат')
    near(r.result.monthlyAverage, r.result.grandTotal / 36, 0.01)
    near(r.result.costPerKm, r.result.grandTotal / 45_000, 0.0001)
    near(operatingCostPerKm(r.result), r.result.operatingTotal / 45_000, 0.0001)
  })

  it('страховка в теле кредита не учитывается дважды', () => {
    const r = computeTco({ ...base, loanIncludesInsurance: true })
    if (!r.ok) return assert.fail('ожидался успешный результат')
    const insurance = r.result.categories.find((c) => c.key === 'insurance')!
    assert.equal(insurance.total, 0)
    assert.ok(insurance.note && insurance.note.includes('не дублируется'))
    assert.ok(r.result.warnings.some((w) => w.includes('дважды')))
  })

  it('пропущенные тарифы не заменяются выдуманными значениями', () => {
    const r = computeTco({
      ...base,
      fuelPricePerL: null,
      maintenancePerYear: null,
      insurancePerYear: null,
      transportTaxPerYear: null,
      seasonalTires: 0,
      tireServicePerYear: 0,
      otherPerYear: 0,
      monthlyLoanPayment: 0,
      loanTermMonths: 0,
    })
    if (!r.ok) return assert.fail('ожидался успешный результат')
    assert.equal(r.result.grandTotal, 0, 'без заданных тарифов расходы должны быть нулевыми, а не «средними по рынку»')
    assert.ok(r.result.warnings.length >= 4)
    for (const c of r.result.categories) assert.equal(c.source === 'user' && c.total > 0, false)
  })

  it('налог по мощности считается только если задана ставка', () => {
    const byRate = computeTco({ ...base, transportTaxPerYear: null, horsepower: 143, taxRatePerHp: 50 })
    if (!byRate.ok) return assert.fail('ожидался успешный результат')
    const tax = byRate.result.categories.find((c) => c.key === 'tax')!
    near(tax.perYear, 143 * 50, 0.01)
    assert.equal(tax.source, 'user')

    const withoutRate = computeTco({ ...base, transportTaxPerYear: null, horsepower: 143, taxRatePerHp: null })
    if (!withoutRate.ok) return assert.fail('ожидался успешный результат')
    assert.equal(withoutRate.result.categories.find((c) => c.key === 'tax')!.total, 0)
  })

  it('расход не задан — статья помечена как отсутствующая', () => {
    const r = computeTco({ ...base, fuelConsumptionL100: null })
    if (!r.ok) return assert.fail('ожидался успешный результат')
    const fuel = r.result.categories.find((c) => c.key === 'fuel')!
    assert.equal(fuel.source, 'missing')
    assert.equal(fuel.total, 0)
  })

  it('некорректный срок владения отклоняется', () => {
    assert.equal(computeTco({ ...base, ownershipYears: 0 }).ok, false)
    assert.equal(computeTco({ ...base, ownershipYears: 50 }).ok, false)
    assert.equal(computeTco({ ...base, annualMileageKm: -100 }).ok, false)
  })

  it('кредит короче периода владения учитывается частично', () => {
    const r = computeTco({ ...base, monthlyLoanPayment: 40_000, loanTermMonths: 12, ownershipYears: 5 })
    if (!r.ok) return assert.fail('ожидался успешный результат')
    assert.equal(r.result.loanMonthsInPeriod, 12)
    near(r.result.loanPaymentsTotal, 480_000, 0.01)
    assert.ok(r.result.warnings.some((w) => w.includes('попадает')))
  })
})

describe('план накопления', () => {
  const base = {
    targetPrice: 3_000_000,
    currentSavings: 300_000,
    tradeInProceeds: 200_000,
    desiredDownPaymentPct: 20,
    monthlyContribution: 40_000,
    reserveAmount: 100_000,
    targetMonths: null,
    annualSavingsRatePct: 0,
    priceChangePerYearPct: 0,
    loanAnnualRatePercent: 16.4,
    loanTermMonths: 60,
  }

  it('недостающая сумма и срок накопления', () => {
    const r = computeSavingsPlan(base)
    if (!r.ok) return assert.fail('ожидался успешный результат')
    // цель = 20% от 3 000 000 + 100 000 = 700 000; доступно 500 000 → не хватает 200 000
    near(r.plan.goalAmount, 700_000, 0.01)
    near(r.plan.availableNow, 500_000, 0.01)
    near(r.plan.missingAmount, 200_000, 0.01)
    assert.equal(r.plan.monthsToGoal, 5) // 200 000 / 40 000
    assert.equal(r.plan.readyNow, false)
    assert.ok(r.plan.targetDate instanceof Date)
  })

  it('при нулевой ставке срок = недостающая сумма / взнос', () => {
    assert.equal(monthsToReachGoal(100_000, 0, 25_000, 0), 4)
    assert.equal(monthsToReachGoal(100_000, 150_000, 25_000, 0), 0)
    assert.equal(monthsToReachGoal(100_000, 0, 0, 0), null)
  })

  it('доходность накоплений сокращает срок', () => {
    const noRate = monthsToReachGoal(1_000_000, 0, 50_000, 0)!
    const withRate = monthsToReachGoal(1_000_000, 0, 50_000, 12)!
    assert.ok(withRate < noRate, `${withRate} должно быть меньше ${noRate}`)
  })

  it('требуемый ежемесячный взнос к заданному сроку', () => {
    near(requiredMonthlyContribution(700_000, 500_000, 5, 0)!, 40_000, 0.01)
    const withRate = requiredMonthlyContribution(700_000, 500_000, 5, 12)!
    assert.ok(withRate < 40_000, 'с доходностью требуется откладывать меньше')
    assert.equal(requiredMonthlyContribution(500_000, 600_000, 5, 0), 0, 'цель уже достигнута')
    assert.equal(requiredMonthlyContribution(700_000, 0, 0, 0), null)
  })

  it('цель уже достигнута — покупка сейчас', () => {
    const r = computeSavingsPlan({ ...base, currentSavings: 800_000 })
    if (!r.ok) return assert.fail('ожидался успешный результат')
    assert.equal(r.plan.readyNow, true)
    assert.equal(r.plan.missingAmount, 0)
    assert.equal(r.plan.monthsToGoal, 0)
  })

  it('недостижимая цель объясняется', () => {
    const r = computeSavingsPlan({ ...base, monthlyContribution: 0, currentSavings: 0, tradeInProceeds: 0 })
    if (!r.ok) return assert.fail('ожидался успешный результат')
    assert.equal(r.plan.monthsToGoal, null)
    assert.ok(r.plan.warnings.some((w) => w.includes('недостижима')))
  })

  it('сценарии покупки: взнос, кредит и платёж пересчитываются', () => {
    const r = computeSavingsPlan(base)
    if (!r.ok) return assert.fail('ожидался успешный результат')
    assert.ok(r.plan.scenarios.length >= 3)
    const sorted = [...r.plan.scenarios].sort((a, b) => a.monthsFromNow - b.monthsFromNow)
    for (let i = 1; i < sorted.length; i++) {
      assert.ok(
        sorted[i].availableDownPayment >= sorted[i - 1].availableDownPayment - 1,
        'накопления не могут уменьшаться со временем',
      )
      assert.ok(sorted[i].creditAmount <= sorted[i - 1].creditAmount + 1, 'кредит должен уменьшаться')
    }
    for (const s of sorted) {
      if (s.creditAmount > 0) {
        near(s.monthlyPayment, annuityPayment(s.creditAmount, 16.4, 60), 1)
        near(s.interestOverpay, s.totalPaid - s.creditAmount, 1)
      } else {
        assert.equal(s.monthlyPayment, 0)
      }
    }
  })

  it('проекция цены учитывает возможное изменение и не обещает сохранение', () => {
    near(projectPrice(3_000_000, 12, 10), 3_300_000, 1)
    near(projectPrice(3_000_000, 24, 5), 3_307_500, 1)
    near(projectPrice(3_000_000, 12, 0), 3_000_000, 0.01)
    const r = computeSavingsPlan({ ...base, priceChangePerYearPct: 10, monthlyContribution: 20_000 })
    if (!r.ok) return assert.fail('ожидался успешный результат')
    assert.ok(r.plan.warnings.some((w) => w.includes('могут измениться')))
    const zero = computeSavingsPlan({ ...base, priceChangePerYearPct: 0 })
    if (!zero.ok) return assert.fail('ожидался успешный результат')
    assert.ok(zero.plan.warnings.some((w) => w.includes('не обещает')))
  })

  it('некорректные параметры отклоняются', () => {
    assert.equal(computeSavingsPlan({ ...base, targetPrice: 0 }).ok, false)
    assert.equal(computeSavingsPlan({ ...base, currentSavings: -5 }).ok, false)
    assert.equal(computeSavingsPlan({ ...base, desiredDownPaymentPct: 140 }).ok, false)
    assert.equal(computeSavingsPlan({ ...base, monthlyContribution: -1 }).ok, false)
  })
})

describe('трейд-ин и дополнительные расходы', () => {
  it('чистая сумма от самостоятельной продажи', () => {
    const r = computeTradeIn({
      salePrice: 1_500_000,
      remainingLoan: 400_000,
      sellingCosts: 50_000,
      ownFunds: 200_000,
      mode: 'self-sale',
    })
    if (!r.ok) return assert.fail('ожидался успешный результат')
    near(r.plan.netProceeds, 1_050_000, 0.01)
    near(r.plan.availableForDownPayment, 1_250_000, 0.01)
    assert.equal(r.plan.officialBenefit, 0)
    assert.ok(r.plan.warnings.some((w) => w.includes('оценка пользователя')))
  })

  it('официальный трейд-ин добавляет только подтверждённую выгоду', () => {
    const r = computeTradeIn({
      salePrice: 1_500_000,
      remainingLoan: 0,
      sellingCosts: 0,
      ownFunds: 0,
      mode: 'official-trade-in',
      officialTradeInBenefit: 200_000,
      officialProgramName: 'Лояльный Трейд-ин',
    })
    if (!r.ok) return assert.fail('ожидался успешный результат')
    near(r.plan.availableForDownPayment, 1_700_000, 0.01)
    assert.equal(r.plan.officialBenefit, 200_000)
    assert.ok(r.plan.notes.some((n) => n.includes('Лояльный Трейд-ин')))
  })

  it('неподтверждённая выгода не начисляется', () => {
    const r = computeTradeIn({
      salePrice: 1_000_000,
      remainingLoan: 0,
      sellingCosts: 0,
      ownFunds: 0,
      mode: 'official-trade-in',
      officialTradeInBenefit: null,
    })
    if (!r.ok) return assert.fail('ожидался успешный результат')
    assert.equal(r.plan.officialBenefit, 0)
    near(r.plan.availableForDownPayment, 1_000_000, 0.01)
    assert.ok(r.plan.warnings.some((w) => w.includes('не подтверждены')))
  })

  it('обычный расчёт со взносом игнорирует продажу', () => {
    const r = computeTradeIn({
      salePrice: 1_500_000,
      remainingLoan: 400_000,
      sellingCosts: 50_000,
      ownFunds: 300_000,
      mode: 'down-payment',
    })
    if (!r.ok) return assert.fail('ожидался успешный результат')
    near(r.plan.availableForDownPayment, 300_000, 0.01)
    assert.equal(r.plan.grossSalePrice, 0)
  })

  it('долг больше цены продажи — чистая сумма ноль, с предупреждением', () => {
    const r = computeTradeIn({
      salePrice: 800_000,
      remainingLoan: 1_000_000,
      sellingCosts: 20_000,
      ownFunds: 100_000,
      mode: 'self-sale',
    })
    if (!r.ok) return assert.fail('ожидался успешный результат')
    assert.equal(r.plan.netProceeds, 0)
    near(r.plan.availableForDownPayment, 100_000, 0.01)
    assert.ok(r.plan.warnings.some((w) => w.includes('больше цены продажи')))
  })

  it('отрицательные значения отклоняются', () => {
    assert.equal(
      computeTradeIn({ salePrice: -1, remainingLoan: 0, sellingCosts: 0, ownFunds: 0, mode: 'self-sale' }).ok,
      false,
    )
  })
})

describe('округление денег и изменение цены', () => {
  it('промежуточные вычисления не округляются, округляется только вывод', () => {
    const plan = computePurchasePlan({
      vehiclePrice: 2_099_000,
      discountAmount: 0,
      downPaymentRub: 0,
      downPaymentMode: 'percent',
      downPaymentPercent: 20,
      termMonths: 60,
      annualRatePercent: 16.4,
      extraCostsRub: 0,
    })
    if (!plan.ok) return assert.fail('ожидался успешный результат')
    const exact = annuityPayment(2_099_000 * 0.8, 16.4, 60)
    assert.equal(plan.plan.monthlyPayment, exact, 'платёж не должен быть округлён внутри расчёта')
    assert.ok(!Number.isInteger(exact), 'контрольное значение обязано быть дробным')
    assert.match(fmtMoney(exact), /₽/)
    // округление при выводе: 41 192.7… → 41 193 ₽
    assert.match(fmtMoney(exact), /41\s?193/)
  })

  it('форматирование рублей: тысячи разделены, копеек нет', () => {
    assert.equal(fmtMoney(1000).replace(/\s/g, ' '), '1 000 ₽'.replace(/\s/g, ' '))
    assert.match(fmtMoney(2_099_000), /^2\s?099\s?000\s?₽$/)
    assert.match(fmtMoney(1234.56), /1\s?235/)
  })

  it('изменение цены пропорционально меняет платёж и переплату', () => {
    const cheap = computePurchasePlan({
      vehiclePrice: 2_000_000, discountAmount: 0, downPaymentRub: 0, downPaymentMode: 'percent',
      downPaymentPercent: 20, termMonths: 60, annualRatePercent: 16.4, extraCostsRub: 0,
    })
    const expensive = computePurchasePlan({
      vehiclePrice: 4_000_000, discountAmount: 0, downPaymentRub: 0, downPaymentMode: 'percent',
      downPaymentPercent: 20, termMonths: 60, annualRatePercent: 16.4, extraCostsRub: 0,
    })
    if (!cheap.ok || !expensive.ok) return assert.fail('ожидался успешный результат')
    near(expensive.plan.monthlyPayment, cheap.plan.monthlyPayment * 2, 0.01)
    near(expensive.plan.interestOverpay, cheap.plan.interestOverpay * 2, 0.01)
    near(expensive.plan.totalCost, cheap.plan.totalCost * 2, 0.01)
  })

  it('скидка уменьшает тело кредита, но не смешивается с ценой', () => {
    const r = computePurchasePlan({
      vehiclePrice: 2_749_000, discountAmount: 200_000, downPaymentRub: 0, downPaymentMode: 'percent',
      downPaymentPercent: 20, termMonths: 60, annualRatePercent: 16.4, extraCostsRub: 0,
    })
    if (!r.ok) return assert.fail('ожидался успешный результат')
    assert.equal(r.plan.vehiclePrice, 2_749_000)
    assert.equal(r.plan.effectivePrice, 2_549_000)
    near(r.plan.creditAmount, 2_549_000 * 0.8, 0.01)
  })
})

describe('сравнение комплектаций: данные для интерфейса', () => {
  it('разные модели сравниваются, неизвестные позиции помечаются', () => {
    const features = compareFeatures(['m6-optimum-mt-2026', 'h9-technoplus-2026'])
    assert.ok(features.length > 20)
    const groups = new Set(features.map((f) => f.group))
    assert.ok(groups.size >= 5)
    for (const f of features) {
      assert.ok(f.values['m6-optimum-mt-2026'] !== undefined)
      assert.ok(['standard', 'optional', 'unavailable', 'unknown'].includes(f.values['h9-technoplus-2026']))
    }
  })

  it('пустой набор и неизвестные id не ломают расчёт', () => {
    assert.deepEqual(compareFeatures([]), [])
    assert.deepEqual(compareFeatures(['no-such-trim']), [])
  })

  it('все комплектации каталога доступны для сравнения', () => {
    for (const trim of TRIMS) {
      if (trim.status !== 'current') continue
      const features = compareFeatures([trim.id])
      assert.ok(Array.isArray(features))
    }
  })
})
