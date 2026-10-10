import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getTrim } from '../data/haval'
import { STORAGE_KEYS, loadJson, saveJson } from '../utils/storage'
import { track } from '../utils/analytics'

/**
 * Выбор комплектаций для сравнения (до трёх одновременно).
 * Состояние синхронизируется с localStorage и с query-параметром ?trims=
 * на странице сравнения, чтобы ссылкой можно было поделиться.
 */

export const MAX_COMPARE = 3

interface CompareContextValue {
  trimIds: string[]
  add: (trimId: string) => boolean
  remove: (trimId: string) => void
  toggle: (trimId: string) => boolean
  clear: () => void
  set: (trimIds: string[]) => void
  has: (trimId: string) => boolean
  isFull: boolean
}

const Ctx = createContext<CompareContextValue | null>(null)

export function CompareProvider({ children }: { children: ReactNode }) {
  const [trimIds, setTrimIds] = useState<string[]>(() =>
    loadJson<string[]>(STORAGE_KEYS.comparisons + '.selection', [], (raw) =>
      Array.isArray(raw) ? (raw as unknown[]).filter((id): id is string => typeof id === 'string' && Boolean(getTrim(id))) : null,
    ),
  )

  useEffect(() => {
    saveJson(STORAGE_KEYS.comparisons + '.selection', trimIds)
  }, [trimIds])

  const add = useCallback((trimId: string) => {
    if (!getTrim(trimId)) return false
    let added = false
    setTrimIds((prev) => {
      if (prev.includes(trimId)) return prev
      if (prev.length >= MAX_COMPARE) return prev
      added = true
      track('compare_change', { trim: trimId, action: 'add' })
      return [...prev, trimId]
    })
    return added
  }, [])

  const remove = useCallback((trimId: string) => {
    setTrimIds((prev) => prev.filter((id) => id !== trimId))
    track('compare_change', { trim: trimId, action: 'remove' })
  }, [])

  const toggle = useCallback(
    (trimId: string) => {
      if (trimIds.includes(trimId)) {
        remove(trimId)
        return false
      }
      return add(trimId)
    },
    [trimIds, add, remove],
  )

  const clear = useCallback(() => setTrimIds([]), [])
  const set = useCallback((next: string[]) => {
    setTrimIds(next.filter((id) => Boolean(getTrim(id))).slice(0, MAX_COMPARE))
  }, [])
  const has = useCallback((trimId: string) => trimIds.includes(trimId), [trimIds])

  const value = useMemo<CompareContextValue>(
    () => ({ trimIds, add, remove, toggle, clear, set, has, isFull: trimIds.length >= MAX_COMPARE }),
    [trimIds, add, remove, toggle, clear, set, has],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useCompare(): CompareContextValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useCompare вне CompareProvider')
  return v
}
