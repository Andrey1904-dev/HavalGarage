/**
 * Безопасная работа с локальным хранилищем браузера.
 *
 * Требования:
 *  — сохранение без регистрации (localStorage), без отправки финансовых данных на сервер;
 *  — корректная работа при очистке локальных данных, в приватном режиме
 *    и при обновлении схемы (версия ключа + миграция/сброс к значениям по умолчанию);
 *  — битые данные не ломают приложение: возвращается fallback.
 */

export const STORAGE_VERSION = 1

export const STORAGE_KEYS = {
  scenario: `haval-garage.scenario.v${STORAGE_VERSION}`,
  favorites: `haval-garage.favorites.v${STORAGE_VERSION}`,
  saved: `haval-garage.saved.v${STORAGE_VERSION}`,
  comparisons: `haval-garage.comparisons.v${STORAGE_VERSION}`,
  plans: `haval-garage.plans.v${STORAGE_VERSION}`,
  tco: `haval-garage.tco.v${STORAGE_VERSION}`,
  budget: `haval-garage.budget.v${STORAGE_VERSION}`,
  analyticsConsent: `haval-garage.analytics-consent.v${STORAGE_VERSION}`,
} as const

/** Доступно ли хранилище (приватный режим, отключённые куки, SSR) */
export function isStorageAvailable(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false
    const probe = '__haval_garage_probe__'
    localStorage.setItem(probe, '1')
    localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

export function loadJson<T>(key: string, fallback: T, migrate?: (raw: unknown) => T | null): T {
  try {
    if (!isStorageAvailable()) return fallback
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as unknown
    if (migrate) {
      const migrated = migrate(parsed)
      return migrated ?? fallback
    }
    return (parsed as T) ?? fallback
  } catch {
    return fallback
  }
}

export function saveJson(key: string, value: unknown): boolean {
  try {
    if (!isStorageAvailable()) return false
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function removeKey(key: string): void {
  try {
    if (!isStorageAvailable()) return
    localStorage.removeItem(key)
  } catch {
    /* игнорируем */
  }
}

/** Очистка всех данных приложения (кнопка «очистить сохранённое») */
export function clearAppStorage(): void {
  for (const key of Object.values(STORAGE_KEYS)) removeKey(key)
}
