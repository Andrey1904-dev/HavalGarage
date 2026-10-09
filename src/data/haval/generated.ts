import raw from './prices.generated.json'

/**
 * Результат автоматического сбора/импорта прайс-листов
 * (scripts/update-prices.mjs, scripts/import-price-list.mjs).
 *
 * Эти данные НИКОГДА не подменяют подтверждённые цены каталога:
 * они показываются отдельной информационной панелью «собрано автоматически».
 * При ошибке обновления файл не перезаписывается — последняя подтверждённая
 * цена никогда не заменяется нулём или случайным значением.
 */
export interface GeneratedTeaser {
  slug: string
  price: number
  trimName?: string
  sourceUrl: string
  fetchedAt: string
}

export interface GeneratedPrices {
  fetchedAt: string | null
  source: string | null
  teasers: GeneratedTeaser[]
}

export const GENERATED_PRICES = raw as GeneratedPrices

export const hasGeneratedData =
  GENERATED_PRICES.fetchedAt !== null && GENERATED_PRICES.teasers.length > 0
