import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  getTrim,
  trimsForModel,
  MODELS,
  activeOffersForModel,
  CATALOG_FIXED_AT,
  getProgram,
  programRateFor,
  type CreditProgram,
} from '../data/haval'
import { parseLocaleNumber } from '../utils/format'
import {
  computePurchasePlan,
  downPaymentPctOf,
  downPaymentRub as downPaymentRubOf,
  TERM_OPTIONS,
  type DownPaymentMode,
  type PurchaseResult,
} from '../utils/credit'

/**
 * Сценарий ставки:
 *  — 'free'    — свободный расчёт по ставке, введённой пользователем;
 *  — 'program' — ставка из опубликованных условий официальной программы;
 *  — 'unknown' — программа выбрана, но её ставка для комбинации не опубликована
 *                (расчёт предварительный).
 */
export type RateScenario = 'free' | 'program' | 'unknown'

/**
 * Состояние расчётного сценария (модель → комплектация → параметры кредита).
 * Сохраняется в localStorage — состояние переживает перезагрузку страницы.
 */
export interface ScenarioState {
  modelId: string
  trimId: string | null
  downPaymentMode: DownPaymentMode
  downPaymentRub: string
  downPaymentPercent: string
  termMonths: number
  annualRate: string
  offerId: string | 'none' | 'custom'
  /** Выбранная официальная кредитная программа ('none' — свободный расчёт) */
  programId: string | 'none'
  customDiscountRub: string
  extraCostsRub: string
  showArchiveTrims: boolean
}

const STORAGE_KEY = 'haval-garage.scenario.v1'

const DEFAULT_STATE: ScenarioState = {
  modelId: 'm6',
  trimId: null,
  downPaymentMode: 'percent',
  downPaymentRub: '0',
  downPaymentPercent: '20',
  termMonths: 60,
  annualRate: '16.4',
  offerId: 'none',
  programId: 'none',
  customDiscountRub: '0',
  extraCostsRub: '0',
  showArchiveTrims: false,
}

function loadState(): ScenarioState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    const parsed = JSON.parse(raw) as Partial<ScenarioState>
    const state = { ...DEFAULT_STATE, ...parsed }
    // защита от битых/устаревших данных
    if (!MODELS.some((m) => m.id === state.modelId)) state.modelId = DEFAULT_STATE.modelId
    if (state.programId !== 'none' && !getProgram(state.programId)) state.programId = 'none'
    if (!TERM_OPTIONS.includes(state.termMonths as (typeof TERM_OPTIONS)[number]) && !(state.termMonths >= 1 && state.termMonths <= 120)) {
      state.termMonths = DEFAULT_STATE.termMonths
    }
    return state
  } catch {
    return DEFAULT_STATE
  }
}

interface CalculatorContextValue {
  state: ScenarioState
  update: (patch: Partial<ScenarioState>) => void
  selectModel: (modelId: string) => void
  /** Актуальные комплектации с учётом переключателя архива */
  trims: ReturnType<typeof trimsForModel>
  /** Выбранная комплектация (первая текущая, если не задана) */
  trim: ReturnType<typeof getTrim>
  /** Подтверждённые предложения модели на дату каталога */
  offers: ReturnType<typeof activeOffersForModel>
  /** Итоговая скидка сценария, ₽ */
  discountRub: number
  /** Результат расчёта */
  plan: PurchaseResult
  /** Выбранная официальная программа (если есть) */
  program: CreditProgram | null
  /** Ставка программы для текущих взноса и срока (null — не опубликована) */
  programRate: number | null
  /** Сценарий ставки */
  rateScenario: RateScenario
  /** Нарушения ограничений выбранной программы */
  programViolations: string[]
  /** Применённая в расчёте ставка, % годовых */
  effectiveRate: number
}

const Ctx = createContext<CalculatorContextValue | null>(null)

export function CalculatorProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ScenarioState>(loadState)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* приватный режим — игнорируем */
    }
  }, [state])

  const update = (patch: Partial<ScenarioState>) => setState((s) => ({ ...s, ...patch }))

  const selectModel = (modelId: string) =>
    setState((s) => {
      const firstTrim = trimsForModel(modelId)[0] ?? null
      return { ...s, modelId, trimId: firstTrim?.id ?? null, offerId: 'none' }
    })

  const value = useMemo<CalculatorContextValue>(() => {
    const trims = trimsForModel(state.modelId, state.showArchiveTrims)
    let trim = state.trimId ? getTrim(state.trimId) : undefined
    if (!trim || trim.modelId !== state.modelId) trim = trims[0]
    const offers = activeOffersForModel(state.modelId, CATALOG_FIXED_AT)

    let discountRub = 0
    if (state.offerId === 'custom') {
      discountRub = Math.max(0, parseLocaleNumber(state.customDiscountRub) || 0)
    } else if (state.offerId !== 'none') {
      const offer = offers.find((o) => o.id === state.offerId)
      if (offer?.discountAmount) discountRub = offer.discountAmount
      else if (offer?.discountPercent && trim?.basePrice) {
        discountRub = Math.round((trim.basePrice * offer.discountPercent) / 100)
      }
    }

    const userRate = parseLocaleNumber(state.annualRate) || 0
    const price = trim?.basePrice ?? null

    /* --- сценарий официальной программы --- */
    const program = state.programId !== 'none' ? (getProgram(state.programId) ?? null) : null
    const effectivePrice = Math.max(0, (price ?? 0) - discountRub)
    const dpRub = downPaymentRubOf({
      vehiclePrice: effectivePrice,
      discountAmount: 0,
      downPaymentRub: parseLocaleNumber(state.downPaymentRub) || 0,
      downPaymentMode: state.downPaymentMode,
      downPaymentPercent: parseLocaleNumber(state.downPaymentPercent) || 0,
      termMonths: state.termMonths,
      annualRatePercent: userRate,
      extraCostsRub: 0,
    })
    const dpPct = downPaymentPctOf(Math.min(dpRub, effectivePrice), effectivePrice)

    let programRate: number | null = null
    let rateScenario: RateScenario = 'free'
    const programViolations: string[] = []
    if (program) {
      rateScenario = 'unknown'
      if (!program.modelIds.includes(state.modelId)) {
        programViolations.push(`Модель не участвует в программе «${program.name}» — льготная ставка не применяется.`)
      } else {
        programRate = programRateFor(program.id, state.modelId, dpPct, state.termMonths)
        rateScenario = programRate !== null ? 'program' : 'unknown'
        if (state.termMonths < program.termMonthsMin || state.termMonths > program.termMonthsMax) {
          programViolations.push(
            `Срок ${state.termMonths} мес вне диапазона программы (${program.termMonthsMin}–${program.termMonthsMax} мес).`,
          )
        }
        if (dpPct < program.downPaymentMinPct || dpPct > program.downPaymentMaxPct) {
          programViolations.push(
            `Взнос ${dpPct.toFixed(0)}% вне диапазона программы (${program.downPaymentMinPct}–${program.downPaymentMaxPct}%).`,
          )
        }
        const creditAmount = Math.max(0, effectivePrice - Math.min(dpRub, effectivePrice))
        if (program.loanAmountMin !== null && creditAmount < program.loanAmountMin) {
          programViolations.push(`Сумма кредита меньше минимальной по программе (${program.loanAmountMin} ₽).`)
        }
        if (program.loanAmountMax !== null && creditAmount > program.loanAmountMax) {
          programViolations.push(`Сумма кредита больше максимальной по программе (${program.loanAmountMax} ₽).`)
        }
      }
    }

    const effectiveRate = rateScenario === 'program' && programRate !== null ? programRate : userRate

    const plan = computePurchasePlan({
      vehiclePrice: price ?? null,
      discountAmount: discountRub,
      downPaymentRub: parseLocaleNumber(state.downPaymentRub) || 0,
      downPaymentMode: state.downPaymentMode,
      downPaymentPercent: parseLocaleNumber(state.downPaymentPercent) || 0,
      termMonths: state.termMonths,
      annualRatePercent: effectiveRate,
      extraCostsRub: parseLocaleNumber(state.extraCostsRub) || 0,
    })

    return {
      state,
      update,
      selectModel,
      trims,
      trim: trim ?? null,
      offers,
      discountRub,
      plan,
      program,
      programRate,
      rateScenario,
      programViolations,
      effectiveRate,
    }
  }, [state])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useCalculator(): CalculatorContextValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useCalculator вне CalculatorProvider')
  return v
}
