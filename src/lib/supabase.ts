import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Клиент Supabase (БД проекта). Конфигурация — переменные окружения
 * с префиксом VITE_ (.env). Публикуемый (publishable) ключ предназначен
 * для использования в браузере; права доступа ограничены политиками
 * Row Level Security на стороне БД (см. supabase/schema.sql).
 *
 * Клиент создаётся лениво и только при отправке данных — это безопасно
 * для SSR-проверок (smoke-рендер) и не создаёт сетевых запросов на старте.
 */

const env = ((import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {})

export const SUPABASE_URL = env.VITE_SUPABASE_URL ?? ''
export const SUPABASE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''

/** БД сконфигурирована (ключи переданы в сборку) */
export const isSupabaseConfigured = SUPABASE_URL.length > 0 && SUPABASE_KEY.length > 0

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_KEY)
  return client
}

/** Таблица расчётов-заявок (создаётся скриптом supabase/schema.sql) */
export const APPLICATIONS_TABLE = 'credit_applications'

export interface CreditApplicationRow {
  model_id: string
  model_name: string
  trim_id: string | null
  trim_name: string | null
  vehicle_price: number
  discount_applied: number
  effective_price: number
  down_payment: number
  credit_amount: number
  term_months: number
  annual_rate: number
  monthly_payment: number
  total_paid: number | null
  interest_overpay: number | null
  extra_costs: number
  total_cost: number | null
  contact_name: string | null
  contact_phone: string | null
}

export type SubmitResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

/**
 * Сохраняет расчёт в БД. Возвращает понятную ошибку, если БД недоступна
 * или таблица ещё не создана — приложение продолжает работать локально.
 */
export async function submitCreditApplication(row: CreditApplicationRow): Promise<SubmitResult> {
  const supabase = getSupabase()
  if (!supabase) {
    return { ok: false, error: 'База данных не настроена (нет ключей подключения).' }
  }
  try {
    const { data, error } = await supabase
      .from(APPLICATIONS_TABLE)
      .insert(row)
      .select('id')
      .single()
    if (error) {
      const hint = error.message.includes('does not exist')
        ? ' Таблица в БД ещё не создана — выполните скрипт из supabase/schema.sql.'
        : ''
      return { ok: false, error: `Не удалось сохранить расчёт: ${error.message}.${hint}` }
    }
    return { ok: true, id: String((data as { id?: unknown })?.id ?? '') }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'неизвестная ошибка сети'
    return { ok: false, error: `Нет соединения с базой данных: ${message}.` }
  }
}
