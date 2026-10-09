/**
 * Типы каталога HAVAL: Model / Trim / Offer + официальные кредитные
 * программы (CreditProgram).
 *
 * Все цены и условия хранятся отдельно от интерфейса: каталог обновляется
 * без переписывания приложения (см. scripts/update-prices.mjs).
 */

/** Семейство модели — влияет на группировку в каталоге дилера */
export type ModelFamily = 'CITY' | 'PRO' | 'PICKUP'

export interface HavalModel {
  id: string
  slug: string
  name: string
  /** Маркетинговое описание (с сайта дилера или из пресс-материалов) */
  description: string
  /** Путь к фотографии модели в public/ */
  image: string | null
  family: ModelFamily
  bodyType: string
  /** Ссылка на первоисточник (раздел модели на сайте дилера) */
  sourceUrl: string
  /** Официальный прайс-лист модели на haval.ru (PDF), null — если не опубликован */
  priceListUrl: string | null
  /** Модель в продаже или «скоро в продаже» */
  availability: 'on-sale' | 'coming-soon'
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
  /** Ключевое оснащение комплектации (только подтверждённое) */
  equipment: string[]
  specifications: TrimSpecs
  priceSourceUrl: string
  /** Дата, с которой действует цена (ISO) */
  priceValidFrom: string | null
  /** Дата фиксации данных из источника (ISO) */
  priceUpdatedAt: string
  status: TrimStatus
  /** Пояснение к источнику цены (например, «тейзер с главной страницы») */
  note?: string
}

export type OfferType = 'direct-discount' | 'trade-in' | 'state-support' | 'stock-special'

export interface Offer {
  id: string
  /** Модели, на которые распространяется предложение */
  modelIds: string[]
  /** Конкретные комплектации, если предложение не на весь ряд */
  trimIds?: string[]
  offerType: OfferType
  /** Фиксированная сумма скидки, ₽ (null, если задаётся процентом) */
  discountAmount: number | null
  /** Скидка в процентах (для госпрограммы) */
  discountPercent: number | null
  finalPrice: number | null
  conditions: string
  validFrom: string | null
  validUntil: string | null
  sourceUrl: string
}

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
  /** Диапазон ПСК, % годовых, как опубликован */
  pskRange: string | null
  validFrom: string | null
  validUntil: string | null
  sourceUrl: string
}
