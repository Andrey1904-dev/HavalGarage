/**
 * План накопления и план покупки.
 *
 * Считает недостающую сумму, необходимое ежемесячное накопление,
 * ориентировочную дату достижения цели и несколько сценариев покупки
 * (взнос → сумма кредита → платёж).
 *
 * Важные ограничения:
 *  — цена автомобиля может измениться: проекция цены считается по указанному
 *    пользователем проценту, но приложение не обещает, что цена, скидка или
 *    кредитная программа сохранятся к расчётной дате;
 *  — доходность накоплений задаёт пользователь (по умолчанию 0% — «под матрасом»),
 *    выдуманных ставок нет;
 *  — все расчёты детерминированные: никаких «приблизительных» чисел из модели.
 */
import { annuityPayment } from './loan'
import { addMonths } from './date'
import { downPaymentPctOf } from './credit'

export interface SavingsInput {
  /** Стоимость выбранного автомобиля, ₽ */
  targetPrice: number
  /** Текущие накопления, ₽ */
  currentSavings: number
  /** Чистая сумма от продажи текущего автомобиля, ₽ (см. tradein.ts) */
  tradeInProceeds: number
  /** Желаемый первоначальный взнос, % */
  desiredDownPaymentPct: number
  /** Сумма, которую пользователь может откладывать каждый месяц, ₽ */
  monthlyContribution: number
  /** Резерв на оформление и дополнительные расходы, ₽ */
  reserveAmount: number
  /** Желаемый срок покупки, месяцев (null — рассчитать дату) */
  targetMonths: number | null
  /** Доходность накоплений, % годовых (0 — без начисления) */
  annualSavingsRatePct: number
  /** Возможное изменение цены автомобиля, % в год (0 — без изменения) */
  priceChangePerYearPct: number
  /** Ставка по кредиту для сценариев, % годовых */
  loanAnnualRatePercent: number
  /** Срок кредита для сценариев, месяцев */
  loanTermMonths: number
  /** Дата отсчёта (по умолчанию — сегодня) */
  startDate?: Date
}

export interface PurchaseScenario {
  id: string
  name: string
  description: string
  /** Через сколько месяцев от сегодняшнего дня */
  monthsFromNow: number
  targetDate: Date
  /** Накопленная сумма к дате покупки */
  availableDownPayment: number
  downPaymentPct: number
  /** Проекция цены автомобиля к дате покупки */
  projectedPrice: number
  creditAmount: number
  monthlyPayment: number
  totalPaid: number
  interestOverpay: number
  /** Хватает ли накоплений на целевой взнос */
  reachesGoal: boolean
  notes: string[]
}

export interface SavingsPlan {
  /** Цель: взнос + резерв */
  goalAmount: number
  /** Уже доступно: накопления + продажа автомобиля */
  availableNow: number
  /** Недостающая сумма */
  missingAmount: number
  /** Необходимое ежемесячное накопление к желаемой дате */
  requiredMonthly: number | null
  /** Ориентировочное число месяцев до цели при текущем взносе */
  monthsToGoal: number | null
  /** Ориентировочная дата достижения цели */
  targetDate: Date | null
  /** Накопления уже покрывают цель */
  readyNow: boolean
  /** Проекция цены автомобиля к расчётной дате */
  projectedPrice: number | null
  scenarios: PurchaseScenario[]
  warnings: string[]
}

export type SavingsResult = { ok: true; plan: SavingsPlan } | { ok: false; errors: string[] }

const MAX_MONTHS = 1200

/** Проекция цены с учётом возможного изменения, % в год */
export function projectPrice(price: number, months: number, annualChangePct: number): number {
  if (!Number.isFinite(price) || price <= 0) return Math.max(0, price)
  const years = months / 12
  const factor = Math.pow(1 + (Number.isFinite(annualChangePct) ? annualChangePct : 0) / 100, years)
  return price * factor
}

/**
 * Сколько месяцев нужно, чтобы накопить цель при ежемесячном взносе
 * и доходности накоплений. null — если цель недостижима (взнос ≤ 0).
 */
export function monthsToReachGoal(
  goal: number,
  available: number,
  monthlyContribution: number,
  annualSavingsRatePct: number,
): number | null {
  if (!(goal > 0)) return 0
  if (available >= goal) return 0
  if (!(monthlyContribution > 0)) return null
  const i = (Number.isFinite(annualSavingsRatePct) ? annualSavingsRatePct : 0) / 100 / 12
  let balance = available
  for (let m = 1; m <= MAX_MONTHS; m++) {
    balance = balance * (1 + i) + monthlyContribution
    if (balance >= goal) return m
  }
  return null
}

/**
 * Ежемесячная сумма, которую нужно откладывать, чтобы достичь цели к сроку.
 * Учитывает доходность накоплений (будущая стоимость аннуитета).
 */
export function requiredMonthlyContribution(
  goal: number,
  available: number,
  months: number,
  annualSavingsRatePct: number,
): number | null {
  if (!(months > 0)) return null
  const i = (Number.isFinite(annualSavingsRatePct) ? annualSavingsRatePct : 0) / 100 / 12
  const grown = available * Math.pow(1 + i, months)
  const rest = goal - grown
  if (rest <= 0) return 0
  if (i === 0) return rest / months
  const factor = (Math.pow(1 + i, months) - 1) / i
  return factor > 0 ? rest / factor : null
}

export function computeSavingsPlan(input: SavingsInput): SavingsResult {
  const errors: string[] = []
  const price = input.targetPrice
  if (!Number.isFinite(price) || price <= 0) errors.push('Укажите стоимость автомобиля больше нуля.')
  if (!Number.isFinite(input.currentSavings) || input.currentSavings < 0) {
    errors.push('Текущие накопления не могут быть отрицательными.')
  }
  if (!Number.isFinite(input.desiredDownPaymentPct) || input.desiredDownPaymentPct < 0 || input.desiredDownPaymentPct > 100) {
    errors.push('Желаемый первоначальный взнос должен быть от 0 до 100%.')
  }
  if (!Number.isFinite(input.monthlyContribution) || input.monthlyContribution < 0) {
    errors.push('Ежемесячная сумма накопления не может быть отрицательной.')
  }
  if (errors.length > 0) return { ok: false, errors }

  const warnings: string[] = []
  const start = input.startDate ?? new Date()
  const reserve = Math.max(0, Number.isFinite(input.reserveAmount) ? input.reserveAmount : 0)
  const tradeIn = Math.max(0, Number.isFinite(input.tradeInProceeds) ? input.tradeInProceeds : 0)
  const desiredDown = (price * input.desiredDownPaymentPct) / 100
  const goal = desiredDown + reserve
  const availableNow = Math.max(0, input.currentSavings) + tradeIn
  const missingAmount = Math.max(0, goal - availableNow)
  const readyNow = missingAmount <= 0

  const monthsToGoal = monthsToReachGoal(
    goal,
    availableNow,
    input.monthlyContribution,
    input.annualSavingsRatePct,
  )

  if (!readyNow && monthsToGoal === null) {
    warnings.push(
      'При текущей сумме ежемесячного накопления цель недостижима в горизонте 100 лет: ' +
        'увеличьте ежемесячный взнос, снизьте целевой взнос или выберите автомобиль дешевле.',
    )
  }

  const targetMonths =
    input.targetMonths !== null && Number.isFinite(input.targetMonths) && input.targetMonths > 0
      ? Math.round(input.targetMonths)
      : monthsToGoal

  const requiredMonthly =
    targetMonths !== null && targetMonths > 0
      ? requiredMonthlyContribution(goal, availableNow, targetMonths, input.annualSavingsRatePct)
      : null

  if (targetMonths !== null && requiredMonthly !== null && requiredMonthly > input.monthlyContribution) {
    warnings.push(
      `Чтобы успеть к желаемому сроку (${targetMonths} мес), нужно откладывать ` +
        `${Math.ceil(requiredMonthly).toLocaleString('ru-RU')} ₽ в месяц — больше текущей суммы ` +
        `${Math.round(input.monthlyContribution).toLocaleString('ru-RU')} ₽.`,
    )
  }

  const targetDate = targetMonths !== null ? addMonths(start, targetMonths) : null
  const projectedPrice =
    targetMonths !== null ? projectPrice(price, targetMonths, input.priceChangePerYearPct) : null

  if ((input.priceChangePerYearPct ?? 0) !== 0) {
    warnings.push(
      'Цена автомобиля, скидки и условия кредитных программ могут измениться к расчётной дате — ' +
        'проекция цены носит справочный характер и не является гарантией.',
    )
  } else {
    warnings.push(
      'Расчёт не учитывает изменение цены: приложение не обещает, что цена, скидка или кредитная программа ' +
        'сохранятся к дате покупки.',
    )
  }
  if (reserve === 0) {
    warnings.push('Резерв на оформление и дополнительные расходы не задан — он не учтён в цели накопления.')
  }

  /* ---------------- Сценарии покупки ---------------- */
  const scenarioAt = (months: number, id: string, name: string, description: string): PurchaseScenario => {
    const date = addMonths(start, months)
    const i = (Number.isFinite(input.annualSavingsRatePct) ? input.annualSavingsRatePct : 0) / 100 / 12
    let balance = availableNow
    for (let m = 1; m <= months; m++) balance = balance * (1 + i) + input.monthlyContribution
    const projected = projectPrice(price, months, input.priceChangePerYearPct)
    const down = Math.min(balance, projected)
    const credit = Math.max(0, projected - down)
    const payment = credit > 0 ? annuityPayment(credit, input.loanAnnualRatePercent, input.loanTermMonths) : 0
    const totalPaid = Number.isFinite(payment) ? payment * input.loanTermMonths : 0
    const notes: string[] = []
    if (down + reserve < desiredDown + reserve) {
      notes.push('Накоплений пока не хватает на целевой взнос — платёж будет выше расчётного.')
    }
    if (credit > 0 && !Number.isFinite(payment)) {
      notes.push('Не удалось рассчитать платёж: проверьте ставку и срок кредита.')
    }
    if (reserve > 0 && balance < down + reserve) {
      notes.push('Резерв на оформление не сформирован к этой дате.')
    }
    return {
      id,
      name,
      description,
      monthsFromNow: months,
      targetDate: date,
      availableDownPayment: down,
      downPaymentPct: downPaymentPctOf(down, projected),
      projectedPrice: projected,
      creditAmount: credit,
      monthlyPayment: Number.isFinite(payment) ? payment : 0,
      totalPaid,
      interestOverpay: Math.max(0, totalPaid - credit),
      reachesGoal: balance >= goal,
      notes,
    }
  }

  const scenarios: PurchaseScenario[] = [
    scenarioAt(0, 'now', 'Купить сейчас', 'Взнос — только текущие накопления и сумма от продажи автомобиля'),
  ]
  if (monthsToGoal !== null && monthsToGoal > 0) {
    scenarios.push(
      scenarioAt(
        monthsToGoal,
        'goal',
        'Накопить до целевого взноса',
        `Целевой взнос ${input.desiredDownPaymentPct}% плюс резерв — через ${monthsToGoal} мес`,
      ),
    )
  }
  for (const extra of [6, 12, 24]) {
    if (monthsToGoal !== null && extra === monthsToGoal) continue
    scenarios.push(
      scenarioAt(
        extra,
        `plus-${extra}`,
        `Откладывать ещё ${extra} мес`,
        'Дополнительные накопления увеличивают взнос и снижают платёж',
      ),
    )
  }
  if (targetMonths !== null && !scenarios.some((s) => s.monthsFromNow === targetMonths)) {
    scenarios.push(
      scenarioAt(targetMonths, 'target', 'К желаемой дате покупки', 'Срок, указанный пользователем'),
    )
  }
  scenarios.sort((a, b) => a.monthsFromNow - b.monthsFromNow)

  return {
    ok: true,
    plan: {
      goalAmount: goal,
      availableNow,
      missingAmount,
      requiredMonthly,
      monthsToGoal,
      targetDate,
      readyNow,
      projectedPrice,
      scenarios,
      warnings,
    },
  }
}
