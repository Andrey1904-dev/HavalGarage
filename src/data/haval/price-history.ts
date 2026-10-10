import raw from './price-history.json'
import type { PriceHistoryEntry } from './types'

/**
 * История проверок и изменений цен.
 *
 * Записи добавляют скрипты обновления (`npm run update:prices`,
 * `npm run import:price-list`) и ручная проверка официальных прайс-листов.
 * История никогда не перезаписывается при ошибке источника: неудачная
 * попытка фиксируется отдельной записью с outcome 'failed', а последняя
 * корректная цена остаётся в каталоге.
 */

interface HistoryFile {
  entries: PriceHistoryEntry[]
}

export const PRICE_HISTORY: PriceHistoryEntry[] = (raw as HistoryFile).entries

/** Самая свежая запись истории */
export const latestHistoryEntry = (): PriceHistoryEntry | null =>
  PRICE_HISTORY.length > 0 ? PRICE_HISTORY[PRICE_HISTORY.length - 1] : null

/** Дата последней успешной проверки (updated / unchanged / manual-verification) */
export const lastSuccessfulCheck = (): string | null => {
  for (let i = PRICE_HISTORY.length - 1; i >= 0; i--) {
    const e = PRICE_HISTORY[i]
    if (e.outcome !== 'failed') return e.checkedAt
  }
  return null
}

/** Записи истории для конкретной модели */
export const historyForModel = (modelId: string): PriceHistoryEntry[] =>
  PRICE_HISTORY.filter((e) => e.models.includes(modelId))
