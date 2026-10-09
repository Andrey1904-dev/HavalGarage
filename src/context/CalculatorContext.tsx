import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getTrim, trimsForModel, MODELS, activeOffersForModel, CATALOG_FIXED_AT } from '../data/haval'
import {
  computePurchasePlan,
  TERM_OPTIONS,
  type DownPaymentMode,
  type PurchaseResult,
} from '../utils/credit'

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
      discountRub = Math.max(0, Number(state.customDiscountRub.replace(/\s/g, '').replace(',', '.')) || 0)
    } else if (state.offerId !== 'none') {
      const offer = offers.find((o) => o.id === state.offerId)
      if (offer?.discountAmount) discountRub = offer.discountAmount
      else if (offer?.discountPercent && trim?.basePrice) {
        discountRub = Math.round((trim.basePrice * offer.discountPercent) / 100)
      }
    }

    const plan = computePurchasePlan({
      vehiclePrice: trim?.basePrice ?? null,
      discountAmount: discountRub,
      downPaymentRub: Number(state.downPaymentRub.replace(/\s/g, '').replace(',', '.')) || 0,
      downPaymentMode: state.downPaymentMode,
      downPaymentPercent: Number(state.downPaymentPercent.replace(/\s/g, '').replace(',', '.')) || 0,
      termMonths: state.termMonths,
      annualRatePercent: Number(state.annualRate.replace(/\s/g, '').replace(',', '.')) || 0,
      extraCostsRub: Number(state.extraCostsRub.replace(/\s/g, '').replace(',', '.')) || 0,
    })

    return { state, update, selectModel, trims, trim: trim ?? null, offers, discountRub, plan }
  }, [state])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useCalculator(): CalculatorContextValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useCalculator вне CalculatorProvider')
  return v
}
