/**
 * Обратный расчёт первоначального взноса: «какой взнос нужен, чтобы платить меньше».
 *
 * Формула: максимальная сумма кредита при целевом платеже
 *   S = P · ((1+r)^n − 1) / (r · (1+r)^n)
 * тогда минимальный взнос = финансируемая сумма − S.
 *
 * Проверяются ограничения официальной программы (если выбрана): диапазон взноса,
 * сумма кредита, срок. Если желаемый платёж недостижим даже при максимально
 * допустимом взносе — возвращается причина и варианты (другой срок, другая цена).
 */
import { annuityPayment, principalFromPayment } from './loan'
import { MAX_TERM, MIN_TERM, downPaymentPctOf } from './credit'
import { TERM_OPTIONS } from './credit'
import { getProgram, programRateFor } from '../data/haval'

export interface RequiredDownInput {
  /** Стоимость автомобиля, ₽ */
  vehiclePrice: number
  /** Желаемый ежемесячный платёж, ₽ */
  targetMonthlyPayment: number
  /** Срок кредита, месяцев */
  termMonths: number
  /** Ставка, % годовых (для свободного расчёта) */
  annualRatePercent: number
  /** Дополнительные расходы, финансируемые кредитом (КАСКО, оборудование), ₽ */
  financedExtraCosts?: number
  /** Официальная программа — если выбран сценарий с её условиями */
  programId?: string | null
  modelId?: string | null
}

export interface TermAlternative {
  termMonths: number
  requiredDownPayment: number
  downPaymentPct: number
  maxLoanAmount: number
  achievable: boolean
}

export interface RequiredDownPlan {
  /** Финансируемая сумма: цена + расходы в кредите */
  financedAmount: number
  /** Максимальная сумма кредита при целевом платеже */
  maxLoanAmount: number
  /** Минимальный первоначальный взнос, ₽ */
  minDownPayment: number
  /** Доля взноса от цены автомобиля, % */
  downPaymentPct: number
  /** Необходимая сумма накоплений (взнос, без эксплуатационных расходов) */
  savingsNeeded: number
  /** Реальный платёж при таком взносе (округление может чуть изменить сумму) */
  actualPayment: number
  /** Достижим ли целевой платёж математически */
  achievable: boolean
  /**
   * Целевой платёж достижим только при оплате почти всей стоимости
   * (взнос ≥ 95% финансируемой суммы) — практически это покупка без кредита.
   */
  requiresAlmostFullPayment: boolean
  /** Кредит не нужен вовсе */
  noLoanNeeded: boolean
  /** Использована ставка программы */
  rateSource: 'user' | 'program'
  rate: number
  notes: string[]
  warnings: string[]
  /** Варианты по другим срокам */
  alternatives: TermAlternative[]
}

export type RequiredDownResult = { ok: true; plan: RequiredDownPlan } | { ok: false; errors: string[] }

function alternativesFor(
  financedAmount: number,
  targetPayment: number,
  rate: number,
  price: number,
): TermAlternative[] {
  const terms = [...new Set([...TERM_OPTIONS, MIN_TERM, MAX_TERM])].sort((a, b) => a - b)
  return terms.map((termMonths) => {
    const maxLoan = principalFromPayment(targetPayment, rate, termMonths)
    const required = Number.isFinite(maxLoan) ? Math.max(0, financedAmount - maxLoan) : financedAmount
    const achievable = required < financedAmount || financedAmount <= 0
    return {
      termMonths,
      requiredDownPayment: Math.min(required, financedAmount),
      downPaymentPct: downPaymentPctOf(Math.min(required, financedAmount), price),
      maxLoanAmount: Number.isFinite(maxLoan) ? Math.max(0, Math.min(maxLoan, financedAmount)) : 0,
      achievable,
    }
  })
}

export function computeRequiredDownPayment(input: RequiredDownInput): RequiredDownResult {
  const errors: string[] = []
  const price = input.vehiclePrice
  if (!Number.isFinite(price) || price <= 0) errors.push('Укажите стоимость автомобиля больше нуля.')
  const target = input.targetMonthlyPayment
  if (!Number.isFinite(target) || target <= 0) errors.push('Укажите желаемый ежемесячный платёж больше нуля.')
  const term = input.termMonths
  if (!Number.isInteger(term) || term < MIN_TERM || term > MAX_TERM) {
    errors.push(`Срок кредита должен быть целым числом от ${MIN_TERM} до ${MAX_TERM} месяцев.`)
  }
  if (errors.length > 0) return { ok: false, errors }

  const notes: string[] = []
  const warnings: string[] = []
  const financedExtra = Number.isFinite(input.financedExtraCosts ?? NaN)
    ? Math.max(0, input.financedExtraCosts ?? 0)
    : 0
  const financedAmount = price + financedExtra
  if (financedExtra > 0) {
    notes.push(
      `Дополнительные расходы ${financedExtra.toLocaleString('ru-RU')} ₽ включены в тело кредита — ` +
        'они не должны дублироваться в расходах на владение.',
    )
  }

  /* --- ставка: свободная или программа --- */
  let rate = input.annualRatePercent
  let rateSource: 'user' | 'program' = 'user'
  if (input.programId && input.modelId) {
    const program = getProgram(input.programId)
    if (!program) {
      errors.push('Выбранная программа не найдена.')
      return { ok: false, errors }
    }
    if (!program.modelIds.includes(input.modelId)) {
      errors.push(`Программа «${program.name}» не распространяется на выбранную модель.`)
      return { ok: false, errors }
    }
    const programRate = programRateFor(input.programId, input.modelId, 20, term)
    if (programRate === null) {
      warnings.push(
        `Ставка программы «${program.name}» для срока ${term} мес не опубликована — расчёт предварительный, ` +
          'по ставке, введённой вручную.',
      )
    } else {
      rate = programRate
      rateSource = 'program'
      notes.push(
        `Использована ставка ${String(rate).replace('.', ',')}% по программе «${program.name}». ` +
          'Фактическую ставку определяет банк.',
      )
    }
  }
  if (!Number.isFinite(rate) || rate < 0) {
    errors.push('Ставка должна быть неотрицательной.')
    return { ok: false, errors }
  }

  /* --- максимальная сумма кредита при целевом платеже --- */
  const maxLoan = principalFromPayment(target, rate, term)
  const noLoanNeeded = financedAmount <= 0

  if (!Number.isFinite(maxLoan)) {
    return {
      ok: true,
      plan: {
        financedAmount,
        maxLoanAmount: 0,
        minDownPayment: financedAmount,
        downPaymentPct: 100,
        savingsNeeded: financedAmount,
        actualPayment: 0,
        achievable: false,
        requiresAlmostFullPayment: true,
        noLoanNeeded,
        rateSource,
        rate,
        notes,
        warnings: [
          ...warnings,
          'Целевой платёж не покрывает даже проценты при выбранной ставке и сроке: кредит не может быть погашен. ' +
            'Увеличьте срок, снизьте ставку или выберите автомобиль дешевле.',
        ],
        alternatives: alternativesFor(financedAmount, target, rate, price),
      },
    }
  }

  const rawRequired = financedAmount - maxLoan
  const minDownPayment = Math.max(0, Math.min(financedAmount, rawRequired))
  const downPct = downPaymentPctOf(minDownPayment, price)
  const creditAmount = Math.max(0, financedAmount - minDownPayment)
  const actualPayment = creditAmount > 0 ? annuityPayment(creditAmount, rate, term) : 0
  const achievable = rawRequired <= financedAmount && (rawRequired <= 0 || minDownPayment < financedAmount)
  const requiresAlmostFullPayment = financedAmount > 0 && minDownPayment >= financedAmount * 0.95
  if (requiresAlmostFullPayment) {
    warnings.push(
      `Для платежа ${target.toLocaleString('ru-RU')} ₽ нужно внести ${downPct.toFixed(1)}% стоимости — фактически это ` +
        'покупка без кредита. Разумнее увеличить срок или выбрать автомобиль дешевле.',
    )
  }

  if (rawRequired <= 0) {
    notes.push(
      'Целевой платёж покрывает всю сумму: первоначальный взнос может быть нулевым ' +
        '(кредит ограничен стоимостью автомобиля).',
    )
  }
  if (!achievable) {
    warnings.push(
      'Желаемый платёж недостижим при стоимости этого автомобиля: даже взнос в размере всей цены ' +
        'не даст нужного платежа. Варианты — увеличить срок, снизить ставку или выбрать модель дешевле.',
    )
  }

  /* --- ограничения официальной программы --- */
  if (rateSource === 'program' && input.programId) {
    const program = getProgram(input.programId)
    if (program) {
      if (downPct > program.downPaymentMaxPct) {
        warnings.push(
          `Требуемый взнос ${downPct.toFixed(0)}% превышает максимум программы «${program.name}» ` +
            `(${program.downPaymentMaxPct}%) — условия программы в этой комбинации не применяются.`,
        )
      }
      if (downPct < program.downPaymentMinPct) {
        notes.push(
          `Программа «${program.name}» требует взнос не менее ${program.downPaymentMinPct}%; ` +
            `расчётный минимум — ${downPct.toFixed(0)}%.`,
        )
      }
      if (program.loanAmountMax !== null && creditAmount > program.loanAmountMax) {
        warnings.push(
          `Расчётная сумма кредита ${Math.round(creditAmount).toLocaleString('ru-RU')} ₽ превышает лимит программы ` +
            `(${program.loanAmountMax.toLocaleString('ru-RU')} ₽).`,
        )
      }
      if (program.loanAmountMin !== null && creditAmount > 0 && creditAmount < program.loanAmountMin) {
        warnings.push(
          `Расчётная сумма кредита ниже минимальной по программе (${program.loanAmountMin.toLocaleString('ru-RU')} ₽).`,
        )
      }
      if (term < program.termMonthsMin || term > program.termMonthsMax) {
        warnings.push(
          `Срок ${term} мес вне диапазона программы (${program.termMonthsMin}–${program.termMonthsMax} мес).`,
        )
      }
    }
  }

  return {
    ok: true,
    plan: {
      financedAmount,
      maxLoanAmount: Math.min(maxLoan, financedAmount),
      minDownPayment,
      downPaymentPct: downPct,
      savingsNeeded: minDownPayment,
      actualPayment: Number.isFinite(actualPayment) ? actualPayment : 0,
      achievable,
      requiresAlmostFullPayment,
      noLoanNeeded,
      rateSource,
      rate,
      notes,
      warnings,
      alternatives: alternativesFor(financedAmount, target, rate, price),
    },
  }
}
