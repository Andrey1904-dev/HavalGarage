import type { Price, PriceType } from './types'
import { TRIMS } from './trims'
import { OFFERS } from './offers'
import { STOCK_ITEMS } from './stock'
import { CATALOG_FIXED_AT } from './meta'

/**
 * Нормализованный слой цен (сущность Price из архитектуры данных).
 *
 * Цены разных типов НЕ смешиваются:
 *  — 'msrp'        — максимальная цена перепродажи из официального прайс-листа;
 *  — 'trade-in'    — цена при сдаче автомобиля в трейд-ин (условия в offer);
 *  — 'with-benefit'— цена с подтверждённой специальной выгодой;
 *  — 'stock'       — цена конкретного автомобиля в наличии;
 *  — 'teaser'      — тизер без раскрытой комплектации (требует подтверждения).
 *
 * Выгода никогда не вычитается автоматически: запись с выгодой существует
 * отдельно и применяется в расчёте только после явного выбора пользователем.
 */

/** Срок, после которого цена считается требующей повторной проверки, дней */
export const PRICE_STALE_AFTER_DAYS = 45

export type PriceStatus = 'verified' | 'needs-check' | 'archived' | 'unverified'

const daysBetween = (fromIso: string, toIso: string): number => {
  const from = new Date(fromIso + 'T00:00:00Z').getTime()
  const to = new Date(toIso + 'T00:00:00Z').getTime()
  if (!Number.isFinite(from) || !Number.isFinite(to)) return Number.NaN
  return Math.round((to - from) / 86_400_000)
}

/** Актуальность цены: подтверждена, требует проверки или устарела */
export function priceFreshness(
  verifiedAt: string | null,
  todayIso: string = CATALOG_FIXED_AT,
): { status: 'verified' | 'needs-check' | 'stale'; ageDays: number | null } {
  if (!verifiedAt) return { status: 'needs-check', ageDays: null }
  const age = daysBetween(verifiedAt, todayIso)
  if (!Number.isFinite(age)) return { status: 'needs-check', ageDays: null }
  if (age > PRICE_STALE_AFTER_DAYS) return { status: 'stale', ageDays: age }
  return { status: 'verified', ageDays: age }
}

/**
 * Возраст снимка каталога в днях относительно ПЕРЕДАНОЙ даты «сегодня».
 *
 * priceFreshness внутри статусов цен считает возраст относительно даты снимка
 * (детерминированно, для тестов), поэтому сам по себе он не может «застареть»:
 * снимок всегда свеж относительно себя. Эта функция принимает реальную текущую
 * дату на границе UI и честно показывает, сколько дней прошло с фиксации.
 */
export function catalogAgeDays(fromIso: string = CATALOG_FIXED_AT, todayIso: string = CATALOG_FIXED_AT): number | null {
  const age = daysBetween(fromIso, todayIso)
  return Number.isFinite(age) ? age : null
}

/** Снимок каталога старше срока повторной проверки — нужна пометка в UI */
export function isCatalogStale(todayIso: string, fromIso: string = CATALOG_FIXED_AT): boolean {
  const age = catalogAgeDays(fromIso, todayIso)
  return age !== null && age > PRICE_STALE_AFTER_DAYS
}

/** Реальная текущая дата (ISO, день) — только для границы UI, не для данных */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function statusForTrim(
  trimStatus: 'current' | 'archive',
  validFrom: string | null,
  verifiedAt: string,
  todayIso: string,
): PriceStatus {
  if (trimStatus === 'archive') return 'archived'
  const fresh = priceFreshness(verifiedAt, todayIso)
  if (fresh.status === 'stale') return 'needs-check'
  return validFrom ? 'verified' : 'needs-check'
}

/**
 * Все ценовые записи каталога (базовые цены + наличие + подтверждённые выгоды).
 *
 * Защита от дубликатов: одна и та же специальная цена может быть описана и
 * предложением, и позицией наличия — запись создаётся одна (приоритет у
 * позиции наличия, у неё больше деталей: дилер, регион, условия).
 * Выгода не начисляется на неподтверждённую базу (тизер без комплектации).
 */
export function buildPriceRecords(todayIso: string = CATALOG_FIXED_AT): Price[] {
  const records: Price[] = []
  const seen = new Set<string>()

  const push = (record: Price): void => {
    const key = `${record.trimId}|${record.priceType}|${record.amount}`
    if (seen.has(key)) return
    seen.add(key)
    records.push(record)
  }

  for (const trim of TRIMS) {
    if (trim.basePrice === null) continue
    const priceType: PriceType = trim.priceType ?? 'msrp'
    push({
      id: `price-${trim.id}-${priceType}`,
      trimId: trim.id,
      modelId: trim.modelId,
      amount: trim.basePrice,
      currency: 'RUB',
      priceType,
      modelYear: trim.modelYear,
      productionYear: trim.productionYear,
      conditions:
        priceType === 'teaser'
          ? 'Цена из тизера без раскрытой комплектации — требуется подтверждение у дилера'
          : 'Максимальная цена перепродажи (МЦП) по официальному прайс-листу производителя',
      sourceUrl: trim.priceSourceUrl,
      effectiveFrom: trim.priceValidFrom,
      effectiveUntil: null,
      fetchedAt: trim.priceUpdatedAt,
      verifiedAt: trim.priceUpdatedAt,
      status: statusForTrim(trim.status, trim.priceValidFrom, trim.priceUpdatedAt, todayIso),
    })
  }

  // Автомобили в наличии — раньше выгод, чтобы детальная запись не дублировалась
  for (const item of STOCK_ITEMS) {
    // Цена всегда связана с существующей комплектацией. Если автомобиль из
    // наличия не совпадает ни с одной комплектацией официального прайс-листа,
    // запись Price не создаётся (синтетический trimId означал бы выдуманную
    // комплектацию): такая цена остаётся в разделе «В наличии» как позиция
    // конкретного автомобиля, а не как цена комплектации каталога.
    if (item.trimId === null || !TRIMS.some((t) => t.id === item.trimId)) continue
    push({
      id: `price-stock-${item.id}`,
      trimId: item.trimId ?? `stock-${item.id}`,
      modelId: item.modelId,
      amount: item.price,
      currency: 'RUB',
      priceType: 'stock',
      modelYear: null,
      productionYear: item.productionYear,
      conditions: item.conditions,
      sourceUrl: item.sourceUrl,
      effectiveFrom: null,
      effectiveUntil: null,
      fetchedAt: item.verifiedAt,
      verifiedAt: item.verifiedAt,
      status: item.status === 'confirmed' ? 'verified' : 'unverified',
    })
  }

  // Подтверждённые выгоды — отдельные записи, базовая цена не изменяется
  for (const offer of OFFERS) {
    const trims = TRIMS.filter(
      (t) =>
        offer.modelIds.includes(t.modelId) &&
        t.status === 'current' &&
        t.basePrice !== null &&
        // выгода не начисляется на тизер без раскрытой комплектации
        (t.priceType ?? 'msrp') !== 'teaser' &&
        (!offer.trimIds || offer.trimIds.includes(t.id)) &&
        (!offer.modelYears || t.modelYear === null || offer.modelYears.includes(t.modelYear)),
    )
    for (const trim of trims) {
      const amount =
        offer.finalPrice ??
        (offer.discountAmount !== null && trim.basePrice !== null
          ? Math.max(0, trim.basePrice - offer.discountAmount)
          : offer.discountPercent !== null && trim.basePrice !== null
            ? Math.max(0, Math.round((trim.basePrice * (100 - offer.discountPercent)) / 100))
            : null)
      if (amount === null) continue
      const priceType: PriceType =
        offer.offerType === 'trade-in'
          ? 'trade-in'
          : offer.offerType === 'stock-special'
            ? 'stock'
            : 'with-benefit'
      push({
        id: `price-${trim.id}-${offer.id}`,
        trimId: trim.id,
        modelId: trim.modelId,
        amount,
        currency: 'RUB',
        priceType,
        modelYear: trim.modelYear,
        productionYear: trim.productionYear,
        conditions: `${offer.name}: ${offer.eligibilityConditions}`,
        sourceUrl: offer.sourceUrl,
        effectiveFrom: offer.validFrom,
        effectiveUntil: offer.validUntil,
        fetchedAt: CATALOG_FIXED_AT,
        verifiedAt: CATALOG_FIXED_AT,
        status: offer.status === 'active' ? 'verified' : 'unverified',
      })
    }
  }

  return records
}

export const PRICES: Price[] = buildPriceRecords()

/** Все ценовые записи комплектации */
export const pricesForTrim = (trimId: string): Price[] => PRICES.filter((p) => p.trimId === trimId)

/** Базовая (рекомендованная) цена комплектации */
export const msrpForTrim = (trimId: string): Price | null =>
  PRICES.find((p) => p.trimId === trimId && p.priceType === 'msrp') ?? null

/**
 * Цена с выгодой — только если пользователь может подтвердить условия.
 * Возвращает список доступных вариантов, не выбирая за пользователя.
 */
export const benefitPricesForTrim = (trimId: string): Price[] =>
  PRICES.filter((p) => p.trimId === trimId && p.priceType !== 'msrp')

/** Количество цен, подтверждённых официальными прайс-листами производителя */
export const OFFICIAL_PRICE_COUNT = TRIMS.filter(
  (t) => t.status === 'current' && t.basePrice !== null && t.priceSourceUrl.includes('cdn.perxis.ru'),
).length

/** Цены, требующие подтверждения (нет даты действия или источник — тизер) */
export const UNVERIFIED_PRICES = PRICES.filter(
  (p) => p.status === 'unverified' || p.status === 'needs-check',
)
