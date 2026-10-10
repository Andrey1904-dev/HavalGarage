/**
 * Типы разбора официального прайс-листа.
 *
 * Реализация — scripts/lib/parse-price-list.mjs (JavaScript, запускается
 * Node напрямую). Объявления нужны, чтобы TypeScript-тесты и скрипты
 * работали с теми же контрактами, что и пайплайн импорта.
 */

export declare const MIN_PLAUSIBLE_PRICE: number
export declare const MAX_PLAUSIBLE_PRICE: number

/** Разбить строку markdown-таблицы на ячейки */
export declare function toCells(line: string): string[]

/** Все денежные значения строки (числа без пробелов) */
export declare function moneyValues(line: string): number[]

/** «14.08.2026» → «2026-08-14»; null, если даты нет */
export declare function isoFromRuDate(ddmmyyyy: string | null | undefined): string | null

export interface MoneyGroup {
  /** индекс строки с меткой (например «МЦП руб») */
  labelIndex: number
  /** индекс строки со значениями */
  valueIndex: number
  money: number[]
  /** полнота группы — используется для выбора лучшего экземпляра таблицы */
  score: number
}

export interface NameGroup {
  headerIndex: number
  valueIndex: number
  names: string[]
}

/** Собрать логические строки цен из текста документа */
export declare function buildMoneyGroups(lines: string[]): MoneyGroup[]

/** Собрать названия комплектаций, следующие за заголовком «КОМПЛЕКТАЦИЯ» */
export declare function buildNameGroups(lines: string[]): NameGroup[]

export interface ParsedRow {
  name: string
  price: number
  /** модельный год из документа */
  modelYear?: number | null
  productionYear?: number | null
  priceType?: string
  sourceUrl?: string
  validFrom?: string | null
  position?: number
  modelSlug?: string
}

export interface ParsedPriceList {
  modelSlug: string
  url: string
  modelYear: number | null
  productionYear: number | null
  effectiveFrom: string | null
  rows: ParsedRow[]
  issues: string[]
}

export declare function parsePriceListText(text: string, context?: Record<string, unknown>): ParsedPriceList

/** Привести название комплектации к сопоставимому виду */
export declare function normalizeTrimName(name: string): string

export interface ValidationResult {
  ok: boolean
  errors: string[]
  warnings: string[]
}

export declare function validateParsed(parsed: ParsedPriceList): ValidationResult

/** Записи в форме каталога (готовы к сравнению diffPrices) */
export declare function normalizeParsedRows(parsed: ParsedPriceList): ParsedRow[]
