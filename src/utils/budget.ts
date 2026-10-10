/**
 * Подбор автомобиля по бюджету (детерминированный алгоритм, без «ИИ-арифметики»).
 *
 * Логика:
 *  1. Из доступного ежемесячного платежа вычитается бюджет на обслуживание
 *     и эксплуатацию (если задан) — так платёж по кредиту и эксплуатационные
 *     расходы не смешиваются в один неразличимый показатель.
 *  2. Максимальная сумма кредита считается обратной аннуитетной формулой
 *     S = P · ((1+r)^n − 1) / (r·(1+r)^n).
 *  3. Максимальная стоимость автомобиля = сумма кредита + первоначальный взнос.
 *  4. Обязательные ограничения (кузов, привод, минимальные функции, лимиты
 *     официальной программы) отсекают кандидата полностью: такой автомобиль
 *     не рекомендуется.
 *  5. Варианты, превышающие бюджет по платежу, НЕ скрываются — они возвращаются
 *     с явной меткой превышения и суммой превышения.
 */
import { annuityPayment, principalFromPayment } from './loan'
import { MAX_TERM, MIN_TERM, downPaymentPctOf } from './credit'
import { fmtMoney } from './format'
import {
  getModel,
  getProgram,
  getTrim,
  pricedCurrentTrims,
  pricesForTrim,
  programRateFor,
  trimHasFeature,
  type HavalModel,
  type PriceType,
  type Trim,
} from '../data/haval'

export type DrivetrainFilter = 'any' | 'fwd' | 'awd'
export type BudgetPriceMode = 'msrp' | 'best-available'
export type BudgetSort = 'payment' | 'price' | 'fit' | 'total'

export interface BudgetRequest {
  /** Максимальный комфортный ежемесячный платёж, ₽ */
  maxMonthlyPayment: number
  /** Размер первоначального взноса, ₽ */
  downPaymentRub: number
  /** Срок кредита, месяцев */
  termMonths: number
  /** Ставка, % годовых (для свободного расчёта) */
  annualRatePercent: number
  /** Официальная программа вместо свободной ставки */
  programId?: string | null
  /** Использовать подтверждённые выгоды (трейд-ин, спеццены) */
  priceMode?: BudgetPriceMode
  /** Желаемый тип кузова (пустой список — без ограничений) */
  bodyTypes?: string[]
  /** Предпочтительный привод */
  drivetrain?: DrivetrainFilter
  /** Минимально необходимые функции */
  requiredFeatures?: string[]
  /** Необязательный бюджет на обслуживание и эксплуатацию, ₽/мес */
  maintenanceBudgetMonthly?: number | null
}

export interface BudgetCandidate {
  trimId: string
  modelId: string
  modelName: string
  trimName: string
  bodyType: string
  drivetrain: string
  horsepower: number | null
  price: number
  priceType: PriceType
  priceValidFrom: string | null
  priceVerifiedAt: string
  sourceUrl: string
  /** Условия получения цены, если это не базовая МЦП */
  conditions: string | null
}

export interface BudgetMatch {
  candidate: BudgetCandidate
  model: HavalModel | null
  trim: Trim | null
  /** Цена, использованная в расчёте */
  price: number
  downPayment: number
  downPaymentPct: number
  creditAmount: number
  monthlyPayment: number
  /** Платёж + эксплуатационный бюджет (если задан) */
  totalMonthlyOutflow: number
  totalPaid: number
  interestOverpay: number
  totalCost: number
  /** Укладывается ли в бюджет */
  withinBudget: boolean
  /** На сколько ₽/мес превышен бюджет (0 — не превышен) */
  overBy: number
  /** Проходит ли обязательные ограничения */
  eligible: boolean
  /** Причины отказа по обязательным ограничениям */
  rejectionReasons: string[]
  /** Причины, по которым автомобиль подходит */
  reasons: string[]
  /** Предупреждения (условия выгоды, актуальность цены, лимиты программы) */
  warnings: string[]
  /** Оценка соответствия для сортировки «по соответствию» */
  score: number
  rate: number
  rateSource: 'user' | 'program'
}

export type BudgetResult =
  | { ok: true; matches: BudgetMatch[]; maxAffordablePrice: number; availableForLoanPayment: number }
  | { ok: false; errors: string[] }

/** Кандидаты из каталога: текущие комплектации с подтверждённой ценой */
export function catalogCandidates(priceMode: BudgetPriceMode = 'msrp'): BudgetCandidate[] {
  const list: BudgetCandidate[] = []
  for (const trim of pricedCurrentTrims()) {
    const model = getModel(trim.modelId)
    if (!model || trim.basePrice === null) continue
    // тизер без раскрытой комплектации не участвует в подборе: платёж по
    // неизвестной комплектации вводил бы пользователя в заблуждение
    if ((trim.priceType ?? 'msrp') === 'teaser') continue
    const base: BudgetCandidate = {
      trimId: trim.id,
      modelId: trim.modelId,
      modelName: model.name,
      trimName: trim.name,
      bodyType: model.bodyType,
      drivetrain: trim.drivetrain,
      horsepower: trim.horsepower,
      price: trim.basePrice,
      priceType: trim.priceType ?? 'msrp',
      priceValidFrom: trim.priceValidFrom,
      priceVerifiedAt: trim.priceUpdatedAt,
      sourceUrl: trim.priceSourceUrl,
      conditions: null,
    }
    list.push(base)

    if (priceMode === 'best-available') {
      // Подтверждённые выгоды — отдельными кандидатами с условиями получения
      for (const price of pricesForTrim(trim.id)) {
        if (price.priceType === 'msrp' || price.status === 'archived') continue
        list.push({ ...base, price: price.amount, priceType: price.priceType, conditions: price.conditions })
      }
    }
  }
  return list
}

/** Платёж, доступный под кредит, после вычета эксплуатационного бюджета */
export function availableForLoanPayment(maxMonthlyPayment: number, maintenanceBudgetMonthly?: number | null): number {
  const maintenance = maintenanceBudgetMonthly && maintenanceBudgetMonthly > 0 ? maintenanceBudgetMonthly : 0
  return Math.max(0, maxMonthlyPayment - maintenance)
}

/**
 * Максимальная стоимость автомобиля при заданных параметрах.
 * Возвращает null, если входные данные некорректны.
 */
export function maxAffordablePrice(
  maxMonthlyPayment: number,
  downPaymentRub: number,
  termMonths: number,
  annualRatePercent: number,
  maintenanceBudgetMonthly?: number | null,
): number | null {
  if (!(maxMonthlyPayment > 0) || !(termMonths > 0)) return null
  if (!Number.isFinite(annualRatePercent) || annualRatePercent < 0) return null
  const available = availableForLoanPayment(maxMonthlyPayment, maintenanceBudgetMonthly)
  if (available <= 0) return Math.max(0, downPaymentRub)
  const principal = principalFromPayment(available, annualRatePercent, termMonths)
  if (!Number.isFinite(principal)) return null
  return Math.max(0, downPaymentRub) + principal
}

const isAwd = (drivetrain: string): boolean => /полн|4wd|awd/i.test(drivetrain)
const isFwd = (drivetrain: string): boolean => /передн|2wd|fwd/i.test(drivetrain)

function bodyTypeMatches(bodyType: string, wanted: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^а-яa-z]/gi, '')
  const b = norm(bodyType)
  const w = norm(wanted)
  if (!w) return true
  if (b.includes(w) || w.includes(b)) return true
  // «внедорожник» ↔ «универсал», «кроссовер» ↔ «suv»
  const synonyms: Record<string, string[]> = {
    кроссовер: ['suv', 'универсал', 'внедорожник'],
    внедорожник: ['suv', 'универсал', 'кроссовер'],
    пикап: ['pickup', 'грузовой'],
    купекроссовер: ['купе', 'suv', 'кроссовер'],
  }
  return (synonyms[w] ?? []).some((s) => b.includes(s))
}

/** Проверка лимитов официальной программы для кандидата */
function checkProgram(
  programId: string,
  candidate: BudgetCandidate,
  downPaymentPct: number,
  creditAmount: number,
  termMonths: number,
): { rate: number | null; problems: string[] } {
  const program = getProgram(programId)
  const problems: string[] = []
  if (!program) return { rate: null, problems: ['Программа не найдена'] }
  if (!program.modelIds.includes(candidate.modelId)) {
    problems.push(`Модель ${candidate.modelName} не участвует в программе «${program.name}»`)
  }
  if (termMonths < program.termMonthsMin || termMonths > program.termMonthsMax) {
    problems.push(
      `Срок ${termMonths} мес вне диапазона программы (${program.termMonthsMin}–${program.termMonthsMax} мес)`,
    )
  }
  if (downPaymentPct < program.downPaymentMinPct || downPaymentPct > program.downPaymentMaxPct) {
    problems.push(
      `Взнос ${downPaymentPct.toFixed(0)}% вне диапазона программы (${program.downPaymentMinPct}–${program.downPaymentMaxPct}%)`,
    )
  }
  if (program.loanAmountMin !== null && creditAmount < program.loanAmountMin) {
    problems.push(`Сумма кредита меньше минимальной по программе (${fmtMoney(program.loanAmountMin)})`)
  }
  if (program.loanAmountMax !== null && creditAmount > program.loanAmountMax) {
    problems.push(`Сумма кредита больше максимальной по программе (${fmtMoney(program.loanAmountMax)})`)
  }
  const rate = programRateFor(programId, candidate.modelId, downPaymentPct, termMonths)
  if (rate === null && problems.length === 0) {
    problems.push('Ставка программы для этой комбинации взноса и срока не опубликована')
  }
  return { rate, problems }
}

/**
 * Подбор автомобилей под бюджет. Возвращает все допустимые варианты:
 * подходящие (withinBudget) и альтернативы с явным превышением.
 */
export function searchByBudget(
  request: BudgetRequest,
  candidates: BudgetCandidate[] = catalogCandidates(request.priceMode ?? 'msrp'),
): BudgetResult {
  const errors: string[] = []

  if (!Number.isFinite(request.maxMonthlyPayment) || request.maxMonthlyPayment <= 0) {
    errors.push('Укажите максимальный ежемесячный платёж больше нуля.')
  }
  if (!Number.isFinite(request.downPaymentRub) || request.downPaymentRub < 0) {
    errors.push('Первоначальный взнос не может быть отрицательным.')
  }
  if (
    !Number.isInteger(request.termMonths) ||
    request.termMonths < MIN_TERM ||
    request.termMonths > MAX_TERM
  ) {
    errors.push(`Срок кредита должен быть целым числом от ${MIN_TERM} до ${MAX_TERM} месяцев.`)
  }
  const usingProgram = Boolean(request.programId)
  if (!usingProgram && (!Number.isFinite(request.annualRatePercent) || request.annualRatePercent < 0)) {
    errors.push('Укажите ставку не менее 0% годовых или выберите официальную программу.')
  }
  if (errors.length > 0) return { ok: false, errors }

  const maintenance = request.maintenanceBudgetMonthly ?? null
  const available = availableForLoanPayment(request.maxMonthlyPayment, maintenance)
  const maxPrice =
    maxAffordablePrice(
      request.maxMonthlyPayment,
      request.downPaymentRub,
      request.termMonths,
      usingProgram ? 0 : request.annualRatePercent,
      maintenance,
    ) ?? 0

  const matches: BudgetMatch[] = []

  for (const candidate of candidates) {
    const trim = getTrim(candidate.trimId)
    const model = getModel(candidate.modelId)
    const rejectionReasons: string[] = []
    const reasons: string[] = []
    const warnings: string[] = []

    /* --- обязательные ограничения пользователя --- */
    const bodyTypes = request.bodyTypes ?? []
    if (bodyTypes.length > 0 && !bodyTypes.some((b) => bodyTypeMatches(candidate.bodyType, b))) {
      rejectionReasons.push(`Тип кузова «${candidate.bodyType}» не соответствует запросу`)
    }
    if (request.drivetrain === 'awd' && !isAwd(candidate.drivetrain)) {
      rejectionReasons.push('Требуется полный привод, у комплектации — ' + candidate.drivetrain)
    }
    if (request.drivetrain === 'fwd' && !isFwd(candidate.drivetrain)) {
      rejectionReasons.push('Требуется передний привод, у комплектации — ' + candidate.drivetrain)
    }
    for (const feature of request.requiredFeatures ?? []) {
      if (!trimHasFeature(candidate.trimId, feature)) {
        rejectionReasons.push(`Нет подтверждённых данных о функции «${feature}»`)
      }
    }
    if (rejectionReasons.length > 0) continue

    /* --- цена и взнос --- */
    const price = candidate.price
    const downPayment = Math.min(Math.max(0, request.downPaymentRub), price)
    const creditAmount = Math.max(0, price - downPayment)
    const downPct = downPaymentPctOf(downPayment, price)

    /* --- ставка: свободная или программа --- */
    let rate = request.annualRatePercent
    let rateSource: 'user' | 'program' = 'user'
    if (usingProgram && request.programId) {
      const check = checkProgram(request.programId, candidate, downPct, creditAmount, request.termMonths)
      if (check.problems.length > 0) continue // не рекомендуется: нарушены условия программы
      rate = check.rate ?? 0
      rateSource = 'program'
      const program = getProgram(request.programId)
      if (program) {
        warnings.push(
          `Ставка ${String(rate).replace('.', ',')}% по программе «${program.name}»${
            program.requiredProducts.length > 0 ? ` при условии: ${program.requiredProducts.join(', ')}` : ''
          }. Расчёт предварительный: окончательную ставку определяет банк.`,
        )
      }
    }

    if (creditAmount === 0) {
      matches.push({
        candidate,
        model: model ?? null,
        trim: trim ?? null,
        price,
        downPayment,
        downPaymentPct: 100,
        creditAmount: 0,
        monthlyPayment: 0,
        totalMonthlyOutflow: maintenance ?? 0,
        totalPaid: 0,
        interestOverpay: 0,
        totalCost: price,
        withinBudget: true,
        overBy: 0,
        eligible: true,
        rejectionReasons: [],
        reasons: ['Взнос полностью покрывает стоимость — кредит не требуется'],
        warnings,
        score: 2000,
        rate,
        rateSource,
      })
      continue
    }

    const payment = annuityPayment(creditAmount, rate, request.termMonths)
    if (!Number.isFinite(payment)) continue

    const outflow = payment + (maintenance ?? 0)
    const withinBudget = outflow <= request.maxMonthlyPayment + 0.5
    const overBy = withinBudget ? 0 : Math.round(outflow - request.maxMonthlyPayment)
    const totalPaid = payment * request.termMonths
    const overpay = Math.max(0, totalPaid - creditAmount)

    /* --- причины соответствия --- */
    if (withinBudget) {
      reasons.push(
        `Платёж ${fmtMoney(payment)}${maintenance ? ` + ${fmtMoney(maintenance)} на эксплуатацию` : ''} — в пределах бюджета`,
      )
    } else {
      reasons.push(`Превышает бюджет на ${fmtMoney(overBy)} в месяц — показан как альтернатива`)
    }
    if (candidate.priceType !== 'msrp' && candidate.conditions) {
      reasons.push(`Цена ${fmtMoney(price)} доступна при условии: ${candidate.conditions}`)
      warnings.push('Выгода не применяется автоматически — подтвердите условия у дилера.')
    }
    if (isAwd(candidate.drivetrain)) reasons.push('Полный привод')
    if (candidate.horsepower) reasons.push(`${candidate.horsepower} л.с.`)
    if (candidate.priceValidFrom) {
      reasons.push(`Цена подтверждена прайс-листом, действует с ${candidate.priceValidFrom}`)
    } else {
      warnings.push('Дата начала действия цены не опубликована — актуальность подтвердите у дилера.')
    }

    const headroom = withinBudget ? (request.maxMonthlyPayment - outflow) / request.maxMonthlyPayment : 0
    const score =
      (withinBudget ? 1000 : 0) +
      Math.round(headroom * 100) +
      (candidate.priceValidFrom ? 25 : 0) +
      (candidate.priceType === 'msrp' ? 10 : 0)

    matches.push({
      candidate,
      model: model ?? null,
      trim: trim ?? null,
      price,
      downPayment,
      downPaymentPct: downPct,
      creditAmount,
      monthlyPayment: payment,
      totalMonthlyOutflow: outflow,
      totalPaid,
      interestOverpay: overpay,
      totalCost: downPayment + totalPaid,
      withinBudget,
      overBy,
      eligible: true,
      rejectionReasons: [],
      reasons,
      warnings,
      score,
      rate,
      rateSource,
    })
  }

  return { ok: true, matches, maxAffordablePrice: maxPrice, availableForLoanPayment: available }
}

/** Сортировка результатов подбора (устойчивая, детерминированная) */
export function sortBudgetMatches(matches: BudgetMatch[], sort: BudgetSort): BudgetMatch[] {
  const copy = [...matches]
  const byTrim = (a: BudgetMatch, b: BudgetMatch) => a.candidate.trimId.localeCompare(b.candidate.trimId)
  switch (sort) {
    case 'payment':
      return copy.sort((a, b) => a.monthlyPayment - b.monthlyPayment || byTrim(a, b))
    case 'price':
      return copy.sort((a, b) => a.price - b.price || byTrim(a, b))
    case 'total':
      return copy.sort((a, b) => a.totalCost - b.totalCost || byTrim(a, b))
    case 'fit':
    default:
      return copy.sort((a, b) => b.score - a.score || a.monthlyPayment - b.monthlyPayment || byTrim(a, b))
  }
}
