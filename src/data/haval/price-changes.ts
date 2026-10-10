import raw from './price-changes.json'
import type { PriceChange, PriceType } from './types'

/**
 * История цен по каждой комплектации.
 *
 * Правила:
 *  — история начинается с первого подтверждённого импорта (здесь — снимок
 *    каталога 2026-10-09), фиктивная история по предположениям не строится;
 *  — точка добавляется только при наличии документа-источника: официальный
 *    прайс-лист, его новая версия или архивная запись с подтверждённой ценой;
 *  — разные типы цен (МЦП, цена с выгодой, трейд-ин, наличие) на графике
 *    никогда не смешиваются — у каждой точки свой тип.
 */
export interface PriceChangeFile {
  changes: PriceChange[]
}

export const PRICE_CHANGES: PriceChange[] = (raw as PriceChangeFile).changes

/** Изменения цены комплектации в хронологическом порядке */
export const priceChangesForTrim = (trimId: string): PriceChange[] =>
  PRICE_CHANGES.filter((c) => c.trimId === trimId).sort((a, b) => a.changedAt.localeCompare(b.changedAt))

export interface PricePoint {
  date: string
  amount: number
  priceType: PriceType
  origin: PriceChange['origin']
  sourceUrl: string
  note: string | null
}

/**
 * Точки графика цены комплектации.
 *
 * Возвращаются только точки одного типа цены: смешивать МЦП и цену с выгодой
 * на одной линии нельзя — это разные условия покупки.
 */
export const pricePointsForTrim = (trimId: string, priceType: PriceType = 'msrp'): PricePoint[] =>
  priceChangesForTrim(trimId)
    .filter((c) => c.newPriceType === priceType)
    .map((c) => ({
      date: c.changedAt,
      amount: c.newPrice,
      priceType: c.newPriceType,
      origin: c.origin,
      sourceUrl: c.sourceUrl,
      note: c.note,
    }))

/** Типы цен, по которым у комплектации накоплена история */
export const priceHistoryTypesForTrim = (trimId: string): PriceType[] => [
  ...new Set(priceChangesForTrim(trimId).map((c) => c.newPriceType)),
]

/** Есть ли у комплектации больше одной точки (то есть настоящая динамика) */
export const hasPriceDynamics = (trimId: string): boolean => priceChangesForTrim(trimId).length > 1

/** Комплектации, по которым накоплено больше одной точки истории */
export const trimsWithPriceDynamics = (): string[] =>
  [...new Set(PRICE_CHANGES.map((c) => c.trimId))].filter(hasPriceDynamics)

/** Общее число точек истории */
export const PRICE_HISTORY_POINTS = PRICE_CHANGES.length

/** Самая ранняя дата в истории (начало сбора) */
export const priceHistoryStart = (): string | null =>
  PRICE_CHANGES.length === 0 ? null : PRICE_CHANGES.map((c) => c.changedAt).sort()[0]
