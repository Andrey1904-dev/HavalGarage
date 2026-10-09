/**
 * Расчётный сценарий покупки в кредит (математическая симуляция).
 *
 * Сохраняет модель расчёта исходного калькулятора (аннуитет, нулевая ставка —
 * отдельная ветка, защита от деления на ноль) и дополняет её входными данными
 * каталога: цена комплектации, подтверждённая скидка, взнос в ₽ или %,
 * срок, ставка, дополнительные расходы.
 */
import { annuityPayment } from './loan'

export type DownPaymentMode = 'rub' | 'percent'

export const TERM_OPTIONS = [12, 24, 36, 48, 60, 72, 84] as const
export const MIN_TERM = 1
export const MAX_TERM = 120
export const MAX_RATE = 100

export interface PurchaseScenarioInput {
  /** Цена автомобиля, ₽ (null — «нет данных») */
  vehiclePrice: number | null
  /** Подтверждённая скидка, ₽ (0 — без скидки) */
  discountAmount: number
  /** Взнос в рублях (режим rub) */
  downPaymentRub: number
  /** Режим ввода взноса */
  downPaymentMode: DownPaymentMode
  /** Взнос в процентах (режим percent) */
  downPaymentPercent: number
  /** Срок кредита, месяцев */
  termMonths: number
  /** Ставка, % годовых */
  annualRatePercent: number
  /** Дополнительные расходы, включаемые в расчёт (₽, 0 — не учитываются) */
  extraCostsRub: number
}

export interface PurchasePlan {
  vehiclePrice: number
  discountApplied: number
  /** Цена после подтверждённой скидки */
  effectivePrice: number
  downPayment: number
  downPaymentPct: number
  creditAmount: number
  termMonths: number
  annualRate: number
  monthlyPayment: number
  /** Общая сумма выплат по кредиту (платёж × срок) */
  totalPaid: number
  /** Переплата по процентам */
  interestOverpay: number
  extraCosts: number
  /** Всего затрат: взнос + выплаты + доп. расходы */
  totalCost: number
  /** Кредит не требуется (взнос покрывает цену) */
  noLoanNeeded: boolean
}

export type PurchaseResult =
  | { ok: true; plan: PurchasePlan }
  | { ok: false; errors: string[] }

const round = (n: number) => Math.round(n)

/** Первоначальный взнос в рублях из параметров сценария */
export function downPaymentRub(input: PurchaseScenarioInput): number {
  const effective = Math.max(0, (input.vehiclePrice ?? 0) - Math.max(0, input.discountAmount))
  if (input.downPaymentMode === 'percent') {
    return (effective * Math.min(100, Math.max(0, input.downPaymentPercent))) / 100
  }
  return Math.max(0, input.downPaymentRub)
}

/** Процент взноса от эффективной цены */
export function downPaymentPctOf(rub: number, effectivePrice: number): number {
  if (effectivePrice <= 0) return 0
  return (rub / effectivePrice) * 100
}

/**
 * Полный расчёт сценария. Возвращает список ошибок валидации,
 * если входные данные некорректны (не допускаем деления на ноль,
 * отрицательных цен, взноса больше цены и некорректных сроков).
 */
export function computePurchasePlan(input: PurchaseScenarioInput): PurchaseResult {
  const errors: string[] = []

  const price = input.vehiclePrice
  if (price === null || !Number.isFinite(price)) {
    return { ok: false, errors: ['По выбранной комплектации нет подтверждённой цены — расчёт невозможен.'] }
  }
  if (price <= 0) errors.push('Стоимость автомобиля должна быть больше нуля.')

  const discount = input.discountAmount
  if (!Number.isFinite(discount) || discount < 0) {
    errors.push('Скидка не может быть отрицательной.')
  } else if (discount > price) {
    errors.push('Скидка больше стоимости автомобиля.')
  }
  const effectivePrice = Math.max(0, price - Math.max(0, discount))

  const term = input.termMonths
  if (!Number.isFinite(term) || !Number.isInteger(term) || term < MIN_TERM || term > MAX_TERM) {
    errors.push(`Срок кредита должен быть целым числом от ${MIN_TERM} до ${MAX_TERM} месяцев.`)
  }

  const rate = input.annualRatePercent
  if (!Number.isFinite(rate) || rate < 0 || rate > MAX_RATE) {
    errors.push(`Процентная ставка должна быть от 0 до ${MAX_RATE}% годовых.`)
  }

  const dpRub = downPaymentRub({ ...input, vehiclePrice: effectivePrice, discountAmount: 0 })
  if (input.downPaymentMode === 'percent') {
    if (!Number.isFinite(input.downPaymentPercent) || input.downPaymentPercent < 0 || input.downPaymentPercent > 100) {
      errors.push('Первоначальный взнос в процентах должен быть от 0 до 100%.')
    }
  } else if (dpRub > effectivePrice) {
    errors.push('Первоначальный взнос не может быть больше стоимости автомобиля.')
  }

  const extra = Number.isFinite(input.extraCostsRub) && input.extraCostsRub > 0 ? input.extraCostsRub : 0

  if (errors.length > 0) return { ok: false, errors }

  const downPayment = Math.min(dpRub, effectivePrice)
  const creditAmount = effectivePrice - downPayment
  const noLoanNeeded = creditAmount <= 0

  let monthlyPayment = 0
  let totalPaid = 0
  let overpay = 0
  if (!noLoanNeeded && term > 0) {
    monthlyPayment = annuityPayment(creditAmount, rate, term)
    if (!Number.isFinite(monthlyPayment)) {
      return { ok: false, errors: ['Не удалось рассчитать платёж: проверьте сумму, ставку и срок кредита.'] }
    }
    totalPaid = monthlyPayment * term
    overpay = Math.max(0, totalPaid - creditAmount)
  }

  return {
    ok: true,
    plan: {
      vehiclePrice: price,
      discountApplied: Math.max(0, discount),
      effectivePrice,
      downPayment,
      downPaymentPct: downPaymentPctOf(downPayment, effectivePrice),
      creditAmount,
      termMonths: term,
      annualRate: rate,
      monthlyPayment,
      totalPaid,
      interestOverpay: overpay,
      extraCosts: extra,
      totalCost: downPayment + totalPaid + extra,
      noLoanNeeded,
    },
  }
}

/* ------------------------------------------------------------------ */
/*  График платежей для диаграммы                                      */
/* ------------------------------------------------------------------ */

export interface SchedulePoint {
  month: number
  year: number
  label: string
  interestPart: number
  principalPart: number
  balance: number
}

/** Помесячный аннуитетный график: проценты начисляются на остаток долга */
export function buildSchedule(
  creditAmount: number,
  annualRate: number,
  termMonths: number,
): SchedulePoint[] {
  if (!(creditAmount > 0) || !(termMonths > 0)) return []
  const payment = annuityPayment(creditAmount, annualRate, termMonths)
  if (!Number.isFinite(payment)) return []
  const r = annualRate / 12 / 100
  const points: SchedulePoint[] = []
  let balance = creditAmount
  for (let m = 1; m <= termMonths && balance > 0.005; m++) {
    const interest = balance * r
    let principal = payment - interest
    if (principal > balance) principal = balance // последний платёж «в ноль»
    balance = Math.max(0, balance - principal)
    points.push({
      month: m,
      year: Math.ceil(m / 12),
      label: `${m}`,
      interestPart: round(interest),
      principalPart: round(principal),
      balance: round(balance),
    })
  }
  return points
}

/** Агрегация графика по годам (для читаемости длинных сроков) */
export function aggregateByYear(points: SchedulePoint[]): SchedulePoint[] {
  const byYear = new Map<number, SchedulePoint>()
  for (const p of points) {
    const acc = byYear.get(p.year)
    if (acc) {
      acc.interestPart += p.interestPart
      acc.principalPart += p.principalPart
      acc.balance = p.balance
      acc.month = p.month
      acc.label = `${p.year} год`
    } else {
      byYear.set(p.year, { ...p, label: `${p.year} год` })
    }
  }
  return [...byYear.values()]
}
