/**
 * Трейд-ин и дополнительные расходы: сколько реально доступно на первоначальный взнос.
 *
 * Три разделённых сценария (не смешиваются):
 *  1. `self-sale`        — самостоятельная продажа текущего автомобиля;
 *  2. `down-payment`     — обычный расчёт с первоначальным взносом (без продажи);
 *  3. `official-trade-in`— официальная программа трейд-ин, если её условия подтверждены
 *                         (выгода из официального прайс-листа).
 *
 * Пользовательская оценка стоимости автомобиля НЕ выдаётся за официальную
 * оценку дилера: это всегда отмечено в предупреждениях.
 */

export type TradeInMode = 'self-sale' | 'down-payment' | 'official-trade-in'

export interface TradeInInput {
  /** Предполагаемая цена продажи текущего автомобиля, ₽ (оценка пользователя) */
  salePrice: number
  /** Остаток долга по текущему автомобилю, ₽ */
  remainingLoan: number
  /** Дополнительные расходы на продажу (снятие с учёта, доставка, подготовка), ₽ */
  sellingCosts: number
  /** Сумма, которую пользователь планирует направить на покупку HAVAL, ₽ */
  ownFunds: number
  /** Режим сценария */
  mode: TradeInMode
  /** Подтверждённая выгода официальной программы трейд-ин, ₽ (null — не подтверждена) */
  officialTradeInBenefit?: number | null
  /** Название официальной программы (если выгода подтверждена) */
  officialProgramName?: string | null
}

export interface TradeInPlan {
  /** Валовая цена продажи */
  grossSalePrice: number
  /** Погашение остатка долга */
  loanPayoff: number
  /** Расходы на продажу */
  sellingCosts: number
  /** Чистая сумма от продажи */
  netProceeds: number
  /** Собственные средства пользователя */
  ownFunds: number
  /** Подтверждённая выгода программы трейд-ин */
  officialBenefit: number
  /** Итого доступно на первоначальный взнос */
  availableForDownPayment: number
  /** Что именно вошло в сумму */
  breakdown: Array<{ label: string; amount: number; kind: 'plus' | 'minus' }>
  warnings: string[]
  notes: string[]
}

export type TradeInResult = { ok: true; plan: TradeInPlan } | { ok: false; errors: string[] }

const nonNegative = (n: number, label: string, errors: string[]): number => {
  if (!Number.isFinite(n)) {
    errors.push(`${label}: укажите число.`)
    return 0
  }
  if (n < 0) {
    errors.push(`${label} не может быть отрицательным.`)
    return 0
  }
  return n
}

export function computeTradeIn(input: TradeInInput): TradeInResult {
  const errors: string[] = []
  const salePrice = nonNegative(input.salePrice, 'Цена продажи', errors)
  const remainingLoan = nonNegative(input.remainingLoan, 'Остаток долга', errors)
  const sellingCosts = nonNegative(input.sellingCosts, 'Расходы на продажу', errors)
  const ownFunds = nonNegative(input.ownFunds, 'Собственные средства', errors)
  if (errors.length > 0) return { ok: false, errors }

  const warnings: string[] = []
  const notes: string[] = []
  const breakdown: TradeInPlan['breakdown'] = []

  let grossSalePrice = 0
  let loanPayoff = 0
  let costs = 0
  let officialBenefit = 0

  if (input.mode === 'down-payment') {
    notes.push(
      'Сценарий «обычный расчёт»: продажа текущего автомобиля не учитывается, ' +
        'взнос формируется только из собственных средств.',
    )
  } else {
    grossSalePrice = salePrice
    loanPayoff = Math.min(remainingLoan, salePrice)
    costs = sellingCosts
    if (remainingLoan > salePrice) {
      warnings.push(
        `Остаток долга (${Math.round(remainingLoan).toLocaleString('ru-RU')} ₽) больше цены продажи: ` +
          'разницу нужно погасить из собственных средств — чистая сумма от продажи равна нулю.',
      )
    }
  }

  if (input.mode === 'official-trade-in') {
    officialBenefit = Math.max(0, Number.isFinite(input.officialTradeInBenefit ?? NaN) ? (input.officialTradeInBenefit ?? 0) : 0)
    if (officialBenefit === 0) {
      warnings.push(
        'Условия официальной программы трейд-ин не подтверждены — выгода не учтена. ' +
          'Не выдаём неподтверждённую скидку за действующую.',
      )
    } else {
      notes.push(
        `Учтена подтверждённая выгода ${Math.round(officialBenefit).toLocaleString('ru-RU')} ₽` +
          `${input.officialProgramName ? ` по программе «${input.officialProgramName}»` : ''}. ` +
          'Выгода предоставляется дилером при выполнении условий программы.',
      )
    }
  }

  const netProceeds = Math.max(0, grossSalePrice - loanPayoff - costs)
  const availableForDownPayment =
    input.mode === 'down-payment' ? ownFunds + officialBenefit : ownFunds + netProceeds + officialBenefit

  if (input.mode !== 'down-payment') {
    breakdown.push({ label: 'Цена продажи текущего автомобиля', amount: grossSalePrice, kind: 'plus' })
    if (loanPayoff > 0) breakdown.push({ label: 'Погашение остатка долга', amount: loanPayoff, kind: 'minus' })
    if (costs > 0) breakdown.push({ label: 'Расходы на продажу', amount: costs, kind: 'minus' })
    breakdown.push({ label: 'Чистая сумма от продажи', amount: netProceeds, kind: 'plus' })
  }
  breakdown.push({ label: 'Собственные средства', amount: ownFunds, kind: 'plus' })
  if (officialBenefit > 0) {
    breakdown.push({ label: 'Выгода программы трейд-ин', amount: officialBenefit, kind: 'plus' })
  }

  warnings.push(
    'Цена продажи — оценка пользователя, а не официальная оценка дилера. ' +
      'Итоговая сумма трейд-ин определяется после осмотра автомобиля.',
  )
  if (input.mode === 'self-sale') {
    notes.push(
      'Самостоятельная продажа обычно даёт большую сумму, но требует времени и расходов на подготовку; ' +
        'выгода официальной программы трейд-ин в этом сценарии не применяется.',
    )
  }

  return {
    ok: true,
    plan: {
      grossSalePrice,
      loanPayoff,
      sellingCosts: costs,
      netProceeds,
      ownFunds,
      officialBenefit,
      availableForDownPayment,
      breakdown,
      warnings,
      notes,
    },
  }
}
