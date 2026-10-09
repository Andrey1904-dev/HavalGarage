/**
 * Типы каталога HAVAL.
 *
 * Сущности (Model / Trim / Price / Offer / CreditProgram / OfficialSpecs)
 * отделены от интерфейса: каталог обновляется без переписывания приложения
 * (см. scripts/update-prices.mjs и scripts/import-price-list.mjs).
 *
 * Принципы данных:
 *  — цену никогда не «додумываем»: null означает «нет подтверждённых данных»;
 *  — типы цен разделены (МСP / с выгодой / трейд-ин / кредит / наличие);
 *  — у каждой цены и характеристики есть первоисточник и дата проверки.
 */

/** Семейство модели — официальное разделение каталога haval.ru */
export type ModelFamily = 'CITY' | 'PRO' | 'PICKUP'

/**
 * Тип цены. Разделение обязательно: нельзя смешивать рекомендованную цену
 * (МЦП) с ценой, доступной только при выполнении условий.
 */
export type PriceType =
  /** Максимальная цена перепродажи из официального прайс-листа */
  | 'msrp'
  /** Цена с подтверждённой специальной выгодой (условия в Offer) */
  | 'with-benefit'
  /** Цена при сдаче автомобиля в трейд-ин */
  | 'trade-in'
  /** Цена при оформлении кредитной программы */
  | 'credit'
  /** Цена конкретного автомобиля в наличии */
  | 'stock'
  /** Цена из тизера без раскрытой комплектации (требует подтверждения) */
  | 'teaser'

export interface HavalModel {
  id: string
  slug: string
  name: string
  /** Маркетинговое описание (со страниц производителя/дилера) */
  description: string
  /** Локальная фотография модели в public/ (fallback) */
  image: string | null
  /** Официальные фотографии с haval.ru (CDN производителя) */
  officialImages: string[]
  family: ModelFamily
  bodyType: string
  /** Раздел модели на официальном сайте производителя */
  officialUrl: string | null
  /** Официальный каталог модели (PDF) */
  catalogueUrl: string | null
  /** Ссылка на первоисточник (страница модели дилера АГАТ) */
  sourceUrl: string
  /** Официальный прайс-лист модели на haval.ru (PDF), null — если не опубликован */
  priceListUrl: string | null
  /** Модель в продаже или «скоро в продаже» */
  availability: 'on-sale' | 'coming-soon'
  /** Краткие официальные особенности модели (не оснащение конкретной комплектации) */
  highlights?: string[]
}

export type TrimStatus = 'current' | 'archive'

export interface TrimSpecs {
  engine?: string
  displacementL?: number
  horsepower?: number
  transmission?: string
  drivetrain?: string
  fuel?: string
}

export interface FuelConsumption {
  /** Городской цикл, л/100 км */
  city: number | null
  /** Загородный цикл, л/100 км */
  highway: number | null
  /** Смешанный цикл, л/100 км */
  combined: number | null
}

export interface Trim {
  id: string
  modelId: string
  name: string
  modelYear: number | null
  productionYear: number | null
  engine: string
  horsepower: number | null
  transmission: string
  drivetrain: string
  /** Подтверждённая цена, ₽. null — «нет данных» */
  basePrice: number | null
  /** Тип цены (по умолчанию МЦП из официального прайс-листа) */
  priceType?: PriceType
  /** Ключевое оснащение комплектации (только подтверждённое) */
  equipment: string[]
  specifications: TrimSpecs
  priceSourceUrl: string
  /** Дата, с которой действует цена (ISO) */
  priceValidFrom: string | null
  /** Дата фиксации данных из источника (ISO) */
  priceUpdatedAt: string
  status: TrimStatus
  /** Пояснение к источнику цены (например, «тизер с главной страницы») */
  note?: string
}

/* ------------------------------------------------------------------ */
/*  Официальные технические характеристики (из прайс-листов/каталогов) */
/* ------------------------------------------------------------------ */

export interface EngineSpec {
  /** Обозначение силового агрегата, как в официальном документе */
  code: string
  fuel: string
  displacementCc: number | null
  powerHp: number | null
  powerKw: number | null
  powerRpm: string | null
  torqueNm: number | null
  torqueRpm: string | null
  /** К какой части ряда относится (привод/КПП), если двигателей несколько */
  appliesTo: string | null
}

export interface Dimensions {
  lengthMm: number | null
  widthMm: number | null
  heightMm: number | null
}

export interface OfficialSpecs {
  modelId: string
  /** Прайс-лист / каталог, откуда взяты характеристики */
  sourceUrl: string
  sourceLabel: string
  /** Дата последней успешной проверки источника (ISO) */
  verifiedAt: string
  /** Модельные годы, к которым относятся эти данные */
  modelYears: number[]
  bodyType: string | null
  seats: number | null
  dimensions: Dimensions | null
  wheelbaseMm: number | null
  /** Строка, как в документе: может содержать «в зависимости от версии» */
  clearanceMm: string | null
  engines: EngineSpec[]
  transmissions: string[]
  drivetrain: string | null
  suspensionFront: string | null
  suspensionRear: string | null
  brakes: string | null
  steering: string | null
  trunkL: string | null
  fuelTankL: number | null
  weightKg: string | null
  payloadKg: number | null
  towKg: string | null
  consumption: FuelConsumption | null
  acceleration0to100: string | null
  maxSpeedKmh: string | null
  tires: string[]
  wheels: string[]
  colorsExterior: string[]
  colorsInterior: string[]
  /** Внедорожные возможности (понижающая, блокировки, режимы) */
  offroad: string[]
  /** Что в документе не раскрыто — фиксируем явно, а не додумываем */
  unknownFields: string[]
}

/**
 * Технические данные конкретной комплектации, уточняющие модельные:
 * момент, объём, расход, колёса. Заполняются только из официального
 * документа; отсутствие значения — null («не подтверждено»).
 */
export interface TrimTech {
  torqueNm: number | null
  displacementCc: number | null
  consumption: FuelConsumption | null
  acceleration0to100: string | null
  maxSpeedKmh: string | null
  wheels: string | null
  tires: string | null
  weightKg: string | null
  /** Уточнение привода/КПП из документа */
  drivetrainNote: string | null
}

/* ------------------------------------------------------------------ */
/*  Оснащение: группы, стандартная комплектация, матрица различий       */
/* ------------------------------------------------------------------ */

/**
 * Доступность функции:
 *  standard    — есть;
 *  optional    — доступно опционально (в документе «O»);
 *  unavailable — нет (в документе «×»);
 *  unknown     — не подтверждено официальными данными.
 */
export type FeatureAvailability = 'standard' | 'optional' | 'unavailable' | 'unknown'

export interface EquipmentGroup {
  /** Название группы как в официальном прайс-листе */
  group: string
  /** Позиции, входящие во все комплектации модели */
  items: string[]
}

export interface FeatureRow {
  feature: string
  group: string
  /** trimId → доступность */
  values: Record<string, FeatureAvailability>
}

export interface ModelEquipment {
  modelId: string
  sourceUrl: string
  verifiedAt: string
  /** Базовое оснащение, общее для всех комплектаций модели */
  standard: EquipmentGroup[]
  /** Различия между комплектациями (матрица из прайс-листа) */
  matrix: FeatureRow[]
}

/* ------------------------------------------------------------------ */
/*  Предложения и скидки                                                */
/* ------------------------------------------------------------------ */

export type OfferType = 'direct-discount' | 'trade-in' | 'state-support' | 'stock-special'

export interface Offer {
  id: string
  name: string
  /** Модели, на которые распространяется предложение */
  modelIds: string[]
  /** Конкретные комплектации, если предложение не на весь ряд */
  trimIds?: string[]
  /** Допустимые модельные годы */
  modelYears?: number[]
  offerType: OfferType
  /** Фиксированная сумма скидки, ₽ (null, если задаётся процентом) */
  discountAmount: number | null
  /** Скидка в процентах (для госпрограммы) */
  discountPercent: number | null
  finalPrice: number | null
  /** Условия получения выгоды */
  eligibilityConditions: string
  conditions: string
  validFrom: string | null
  validUntil: string | null
  sourceUrl: string
  status: 'active' | 'expired' | 'unverified'
}

/* ------------------------------------------------------------------ */
/*  Нормализованная запись цены                                         */
/* ------------------------------------------------------------------ */

export type PriceStatusValue = 'verified' | 'needs-check' | 'archived' | 'unverified'

export interface Price {
  id: string
  trimId: string
  modelId: string
  /** Сумма в рублях */
  amount: number
  currency: 'RUB'
  priceType: PriceType
  modelYear: number | null
  productionYear: number | null
  /** Условия получения этой цены */
  conditions: string
  /** Ссылка на первоисточник */
  sourceUrl: string
  effectiveFrom: string | null
  effectiveUntil: string | null
  /** Дата получения данных */
  fetchedAt: string
  /** Дата последней успешной проверки */
  verifiedAt: string
  status: PriceStatusValue
}

/** Запись истории изменения цены (пишется скриптами импорта/обновления) */
export interface PriceHistoryEntry {
  /** Дата проверки/импорта */
  checkedAt: string
  /** Источник данных */
  source: string
  /** Результат: изменения применены, ошибок нет, источник недоступен */
  outcome: 'updated' | 'unchanged' | 'failed' | 'manual-verification'
  /** Краткое описание */
  summary: string
  /** Затронутые модели */
  models: string[]
  /** Количество подтверждённых цен */
  confirmedPrices?: number
  /** Ошибки, если обновление не удалось */
  errors?: string[]
}

/* ------------------------------------------------------------------ */
/*  Автомобили в наличии (только подтверждённые позиции)                */
/* ------------------------------------------------------------------ */

export interface StockItem {
  id: string
  modelId: string
  trimId: string | null
  trimName: string
  price: number
  priceType: PriceType
  productionYear: number | null
  color: string | null
  /** Идентификатор автомобиля, если опубликован источником (VIN не выдумываем) */
  vehicleId: string | null
  region: string | null
  dealer: string | null
  conditions: string
  sourceUrl: string
  verifiedAt: string
  status: 'confirmed' | 'unverified'
}

/**
 * Состояние раздела «в наличии»: официальный онлайн-склад haval.ru
 * отдаёт данные только через клиентское приложение, поэтому раздел
 * может быть условным (без фиктивных предложений).
 */
export interface StockSourceStatus {
  available: boolean
  reason: string
  officialUrl: string
  checkedAt: string
}

/* ------------------------------------------------------------------ */
/*  Кредитные программы                                                 */
/* ------------------------------------------------------------------ */

/** Диапазон первоначального взноса, % */
export interface DownPaymentBand {
  fromPct: number
  toPct: number
  /** Ставка, % годовых, по срокам (месяцев). null — срок недоступен */
  ratesByTerm: Record<number, number | null>
}

export interface CreditProgram {
  id: string
  name: string
  /** Тип данных: официальная программа (опубликованные условия) */
  kind: 'official'
  modelIds: string[]
  /** Допустимые модельные годы (если программа ограничивает) */
  modelYears?: number[]
  termMonthsMin: number
  termMonthsMax: number
  downPaymentMinPct: number
  downPaymentMaxPct: number
  loanAmountMin: number | null
  loanAmountMax: number | null
  /** Таблица ставок: взнос × срок (подтверждённая публикация) */
  rateBands?: DownPaymentBand[]
  /** Базовая ставка, если таблицы нет */
  baseRate: number | null
  /** Требования: КАСКО, залог и т. п. */
  requirements: string[]
  /** Обязательные дополнительные продукты, если указаны */
  requiredProducts: string[]
  /** Условия страхования */
  insurance: string | null
  /** Условия трейд-ин, если программа их содержит */
  tradeIn: string | null
  /** Диапазон ПСК, % годовых, как опубликован */
  pskRange: string | null
  validFrom: string | null
  validUntil: string | null
  sourceUrl: string
}
