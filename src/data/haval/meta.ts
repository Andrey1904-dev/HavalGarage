/**
 * Метаданные актуальности каталога и ссылки на официальные источники.
 * Единая точка, откуда интерфейс берёт дату последней успешной проверки.
 */

/** Дата фиксации каталога по официальным прайс-листам производителя */
export const CATALOG_FIXED_AT = '2026-10-09'

/** Дата последней успешной проверки источников (обновляется скриптами импорта) */
export const LAST_VERIFIED_AT = '2026-10-09'

/** Страница каталогов и официальных прайс-листов производителя (основной источник цен) */
export const HAVAL_PRICE_LISTS_URL = 'https://haval.ru/purchase/catalogues/'

/** Официальный модельный ряд */
export const HAVAL_MODELS_URL = 'https://haval.ru/models/'

/** Официальный раздел «Автомобили в наличии» */
export const HAVAL_ONLINE_STOCK_URL = 'https://haval.ru/online-stock/'

/** Официальный сайт производителя */
export const HAVAL_SITE_URL = 'https://haval.ru/'

/** Сайт официального дилера АГАТ (Екатеринбург) — вторичный источник */
export const DEALER_URL = 'https://agat-ekb-haval.ru/'

/** Зеркало каталогов на сайте дилера АГАТ (вторичный источник) */
export const DEALER_PRICE_LISTS_URL = 'https://agat-ekb-haval.ru/purchase/catalogues/'

/** HavalGarage — независимый информационный инструмент, не официальный сайт HAVAL */
export const IS_OFFICIAL_HAVAL_SITE = false
