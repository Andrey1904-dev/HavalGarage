import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { STORAGE_KEYS, loadJson, saveJson, isStorageAvailable } from '../utils/storage'
import { getModel, getTrim } from '../data/haval'
import { track } from '../utils/analytics'

/**
 * Избранное и сохранённые расчёты.
 *
 * Хранение — только localStorage браузера (без регистрации и без отправки
 * финансовых данных на сервер). При очистке локальных данных или обновлении
 * схемы приложение возвращается к пустому состоянию, а не падает:
 * записи с неизвестными моделями/комплектациями отбрасываются при загрузке.
 */

export interface FavoriteItem {
  id: string
  kind: 'model' | 'trim'
  modelId: string
  trimId: string | null
  addedAt: string
}

export interface SavedCalculation {
  id: string
  createdAt: string
  title: string
  modelId: string
  modelName: string
  trimId: string | null
  trimName: string | null
  priceType: string
  vehiclePrice: number
  discountApplied: number
  effectivePrice: number
  downPayment: number
  downPaymentPct: number
  creditAmount: number
  termMonths: number
  annualRate: number
  monthlyPayment: number
  totalPaid: number
  interestOverpay: number
  extraCosts: number
  totalCost: number
  programId: string | null
  programName: string | null
  /** Параметры стоимости владения, если расчёт сохранён вместе с ними */
  tcoSummary: string | null
}

export interface SavedComparison {
  id: string
  createdAt: string
  title: string
  trimIds: string[]
}

export type SavedPlanKind = 'savings' | 'trade-in' | 'required-down'

export interface SavedPlan {
  id: string
  createdAt: string
  kind: SavedPlanKind
  title: string
  summary: string
  /** Параметры плана для повторного открытия */
  payload: Record<string, number | string | null>
}

interface SavedContextValue {
  storageAvailable: boolean
  favorites: FavoriteItem[]
  calculations: SavedCalculation[]
  comparisons: SavedComparison[]
  plans: SavedPlan[]
  toggleFavorite: (item: Omit<FavoriteItem, 'id' | 'addedAt'>) => void
  isFavorite: (modelId: string, trimId?: string | null) => boolean
  removeFavorite: (id: string) => void
  saveCalculation: (calc: Omit<SavedCalculation, 'id' | 'createdAt'>) => string
  removeCalculation: (id: string) => void
  saveComparison: (comparison: Omit<SavedComparison, 'id' | 'createdAt'>) => string
  removeComparison: (id: string) => void
  savePlan: (plan: Omit<SavedPlan, 'id' | 'createdAt'>) => string
  removePlan: (id: string) => void
  clearAll: () => void
}

const Ctx = createContext<SavedContextValue | null>(null)

const uid = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

function validFavorites(raw: unknown): FavoriteItem[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((item): item is FavoriteItem => {
    if (!item || typeof item !== 'object') return false
    const f = item as FavoriteItem
    if (typeof f.modelId !== 'string' || !getModel(f.modelId)) return false
    if (f.trimId && !getTrim(f.trimId)) return false
    return true
  })
}

function validCalculations(raw: unknown): SavedCalculation[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((c): c is SavedCalculation => {
    if (!c || typeof c !== 'object') return false
    const calc = c as SavedCalculation
    return typeof calc.id === 'string' && typeof calc.modelId === 'string' && Number.isFinite(calc.vehiclePrice)
  })
}

function validComparisons(raw: unknown): SavedComparison[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((c): c is SavedComparison => Boolean(c) && Array.isArray((c as SavedComparison).trimIds))
    .map((c) => ({ ...c, trimIds: c.trimIds.filter((id) => Boolean(getTrim(id))) }))
    .filter((c) => c.trimIds.length > 0)
}

function validPlans(raw: unknown): SavedPlan[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((p): p is SavedPlan => Boolean(p) && typeof (p as SavedPlan).id === 'string')
}

export function SavedProvider({ children }: { children: ReactNode }) {
  const storageAvailable = useMemo(() => isStorageAvailable(), [])

  const [favorites, setFavorites] = useState<FavoriteItem[]>(() =>
    loadJson<FavoriteItem[]>(STORAGE_KEYS.favorites, [], validFavorites),
  )
  const [calculations, setCalculations] = useState<SavedCalculation[]>(() =>
    loadJson<SavedCalculation[]>(STORAGE_KEYS.saved, [], validCalculations),
  )
  const [comparisons, setComparisons] = useState<SavedComparison[]>(() =>
    loadJson<SavedComparison[]>(STORAGE_KEYS.comparisons, [], validComparisons),
  )
  const [plans, setPlans] = useState<SavedPlan[]>(() =>
    loadJson<SavedPlan[]>(STORAGE_KEYS.plans, [], validPlans),
  )

  useEffect(() => {
    saveJson(STORAGE_KEYS.favorites, favorites)
  }, [favorites])
  useEffect(() => {
    saveJson(STORAGE_KEYS.saved, calculations)
  }, [calculations])
  useEffect(() => {
    saveJson(STORAGE_KEYS.comparisons, comparisons)
  }, [comparisons])
  useEffect(() => {
    saveJson(STORAGE_KEYS.plans, plans)
  }, [plans])

  const isFavorite = useCallback(
    (modelId: string, trimId: string | null = null) =>
      favorites.some((f) => f.modelId === modelId && (trimId ? f.trimId === trimId : f.trimId === null)),
    [favorites],
  )

  const toggleFavorite = useCallback(
    (item: Omit<FavoriteItem, 'id' | 'addedAt'>) => {
      setFavorites((prev) => {
        const existing = prev.find(
          (f) => f.modelId === item.modelId && f.trimId === item.trimId && f.kind === item.kind,
        )
        if (existing) {
          track('favorite_toggle', { model: item.modelId, trim: item.trimId, added: false })
          return prev.filter((f) => f.id !== existing.id)
        }
        track('favorite_toggle', { model: item.modelId, trim: item.trimId, added: true })
        return [...prev, { ...item, id: uid(), addedAt: new Date().toISOString() }]
      })
    },
    [],
  )

  const removeFavorite = useCallback((id: string) => {
    setFavorites((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const saveCalculation = useCallback((calc: Omit<SavedCalculation, 'id' | 'createdAt'>) => {
    const id = uid()
    setCalculations((prev) => [{ ...calc, id, createdAt: new Date().toISOString() }, ...prev].slice(0, 50))
    track('calculation_save', { model: calc.modelId, kind: 'credit' })
    return id
  }, [])

  const removeCalculation = useCallback((id: string) => {
    setCalculations((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const saveComparison = useCallback((comparison: Omit<SavedComparison, 'id' | 'createdAt'>) => {
    const id = uid()
    setComparisons((prev) => [{ ...comparison, id, createdAt: new Date().toISOString() }, ...prev].slice(0, 30))
    track('calculation_save', { kind: 'comparison', count: comparison.trimIds.length })
    return id
  }, [])

  const removeComparison = useCallback((id: string) => {
    setComparisons((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const savePlan = useCallback((plan: Omit<SavedPlan, 'id' | 'createdAt'>) => {
    const id = uid()
    setPlans((prev) => [{ ...plan, id, createdAt: new Date().toISOString() }, ...prev].slice(0, 30))
    track('calculation_save', { kind: plan.kind })
    return id
  }, [])

  const removePlan = useCallback((id: string) => {
    setPlans((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setFavorites([])
    setCalculations([])
    setComparisons([])
    setPlans([])
  }, [])

  const value = useMemo<SavedContextValue>(
    () => ({
      storageAvailable,
      favorites,
      calculations,
      comparisons,
      plans,
      toggleFavorite,
      isFavorite,
      removeFavorite,
      saveCalculation,
      removeCalculation,
      saveComparison,
      removeComparison,
      savePlan,
      removePlan,
      clearAll,
    }),
    [
      storageAvailable,
      favorites,
      calculations,
      comparisons,
      plans,
      toggleFavorite,
      isFavorite,
      removeFavorite,
      saveCalculation,
      removeCalculation,
      saveComparison,
      removeComparison,
      savePlan,
      removePlan,
      clearAll,
    ],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSaved(): SavedContextValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useSaved вне SavedProvider')
  return v
}
