/**
 * Обезличенная аналитика событий.
 *
 * Принципы:
 *  — собираются только события взаимодействия с расчётами (открытие модели,
 *    запуск калькулятора, изменение параметров, сравнение, сохранение,
 *    переход к официальному источнику);
 *  — НЕ собираются имя, телефон, адрес, банковские реквизиты, VIN и другие
 *    персональные данные;
 *  — внешняя система аналитики подключается только после явного согласия
 *    пользователя и только если передан провайдер (по умолчанию провайдера нет —
 *    события остаются в локальном кольцевом буфере для отладки);
 *  — всё работает без сети и не ломает приложение, если хранилище недоступно.
 */
import { STORAGE_KEYS, loadJson, saveJson } from './storage'

export type AnalyticsEventName =
  | 'model_view'
  | 'trim_view'
  | 'calculator_open'
  | 'credit_params_change'
  | 'compare_start'
  | 'compare_change'
  | 'budget_search'
  | 'budget_sort'
  | 'tco_calculate'
  | 'required_down_calculate'
  | 'savings_plan'
  | 'tradein_calculate'
  | 'calculation_save'
  | 'favorite_toggle'
  | 'export_print'
  | 'export_csv'
  | 'advisor_query'
  | 'official_source_click'
  | 'program_view'

export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>

export interface AnalyticsEvent {
  name: AnalyticsEventName
  props: AnalyticsProps
  at: string
}

/** Внешний провайдер (например, счётчик). Подключается только при согласии. */
export interface AnalyticsProvider {
  name: string
  track: (event: AnalyticsEvent) => void
}

const RING_LIMIT = 100
const ring: AnalyticsEvent[] = []
let provider: AnalyticsProvider | null = null

/** Запрещённые ключи — защита от случайной передачи персональных данных */
const FORBIDDEN_KEYS = [
  'name',
  'phone',
  'email',
  'address',
  'passport',
  'card',
  'account',
  'vin',
  'имя',
  'телефон',
  'почта',
  'адрес',
]

function sanitize(props: AnalyticsProps): AnalyticsProps {
  const clean: AnalyticsProps = {}
  for (const [key, value] of Object.entries(props)) {
    const lower = key.toLowerCase()
    if (FORBIDDEN_KEYS.some((f) => lower.includes(f))) continue
    if (typeof value === 'string' && value.length > 120) continue
    clean[key] = value ?? null
  }
  return clean
}

export function hasAnalyticsConsent(): boolean {
  return loadJson<boolean>(STORAGE_KEYS.analyticsConsent, false)
}

export function setAnalyticsConsent(granted: boolean): void {
  saveJson(STORAGE_KEYS.analyticsConsent, granted)
}

export function setAnalyticsProvider(next: AnalyticsProvider | null): void {
  provider = next
}

export function getAnalyticsProvider(): AnalyticsProvider | null {
  return provider
}

/** Записать событие. Внешний провайдер вызывается только при наличии согласия. */
export function track(name: AnalyticsEventName, props: AnalyticsProps = {}): void {
  const event: AnalyticsEvent = { name, props: sanitize(props), at: new Date().toISOString() }
  ring.push(event)
  if (ring.length > RING_LIMIT) ring.splice(0, ring.length - RING_LIMIT)
  if (provider && hasAnalyticsConsent()) {
    try {
      provider.track(event)
    } catch {
      /* сбой внешнего счётчика не должен ломать приложение */
    }
  }
}

/** Последние события (для отладки и раздела «приватность») */
export function recentEvents(limit = 25): AnalyticsEvent[] {
  return ring.slice(-limit).reverse()
}

export function clearEvents(): void {
  ring.length = 0
}
