/**
 * Единая точка доступа к каталогу HAVAL: модели, комплектации,
 * предложения, кредитные программы и метаданные актуальности.
 */
export * from './types'
export * from './models'
export * from './trims'
export * from './offers'
export * from './credit-programs'

/** Дата фиксации каталога по опубликованным страницам дилера */
export const CATALOG_FIXED_AT = '2026-10-09'

/** Страница каталогов и официальных прайс-листов производителя (основной источник цен) */
export const HAVAL_PRICE_LISTS_URL = 'https://haval.ru/purchase/catalogues/'

export const DEALER_URL = 'https://agat-ekb-haval.ru/'
/** Зеркало каталогов на сайте дилера АГАТ (вторичный источник) */
export const DEALER_PRICE_LISTS_URL = 'https://agat-ekb-haval.ru/purchase/catalogues/'
