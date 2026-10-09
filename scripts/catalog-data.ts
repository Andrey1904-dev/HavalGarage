/**
 * Экспорт данных каталога в JSON для служебных скриптов
 * (проверка источников, генерация sitemap).
 *
 * Скрипты инфраструктуры написаны на JS, а данные — на TypeScript: этот модуль
 * собирается esbuild и печатает снимок каталога в stdout.
 */
import {
  MODELS,
  TRIMS,
  OFFICIAL_PRICE_COUNT,
  CATALOG_FIXED_AT,
  lastSuccessfulCheck,
  minCurrentPrice,
  trimsForModel,
} from '../src/data/haval'

const payload = {
  catalogFixedAt: CATALOG_FIXED_AT,
  lastSuccessfulCheck: lastSuccessfulCheck(),
  officialPriceCount: OFFICIAL_PRICE_COUNT,
  trimsTotal: TRIMS.length,
  trimsCurrent: TRIMS.filter((t) => t.status === 'current').length,
  models: MODELS.map((m) => {
    const min = minCurrentPrice(m.id)
    return {
      id: m.id,
      slug: m.slug,
      name: m.name,
      family: m.family,
      bodyType: m.bodyType,
      priceListUrl: m.priceListUrl,
      catalogueUrl: m.catalogueUrl,
      officialUrl: m.officialUrl,
      sourceUrl: m.sourceUrl,
      image: m.image,
      trims: trimsForModel(m.id).length,
      priceFrom: min?.basePrice ?? null,
    }
  }),
}

process.stdout.write(JSON.stringify(payload, null, 2))
