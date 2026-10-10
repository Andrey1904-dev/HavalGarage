import raw from './catalog-changes.json'
import type { CatalogChangeEvent, CatalogChangeKind } from './types'

/**
 * Журнал изменений официального каталога (мониторинг предложений).
 *
 * Записи добавляет пайплайн (`npm run catalog report` / `npm run catalog full`),
 * сравнивая свежий снимок официальных документов с текущим каталогом:
 *  — новые модели и комплектации;
 *  — изменение цены;
 *  — появление новой версии прайс-листа (смена checksum);
 *  — прекращение действия предложений;
 *  — изменение условий кредитных программ.
 *
 * Журнал — только констатация факта с ссылкой на документ. Автоматически
 * цены каталога не перезаписываются: решение принимает человек.
 */
export interface CatalogChangesFile {
  events: CatalogChangeEvent[]
}

export const CATALOG_CHANGES: CatalogChangeEvent[] = (raw as CatalogChangesFile).events

/** События в хронологическом порядке (новые сверху) */
export const recentCatalogChanges = (limit?: number): CatalogChangeEvent[] => {
  const sorted = [...CATALOG_CHANGES].sort((a, b) => b.detectedAt.localeCompare(a.detectedAt))
  return limit === undefined ? sorted : sorted.slice(0, limit)
}

export const catalogChangesForModel = (modelId: string): CatalogChangeEvent[] =>
  recentCatalogChanges().filter((e) => e.modelId === modelId)

export const catalogChangesOfKind = (kind: CatalogChangeKind): CatalogChangeEvent[] =>
  recentCatalogChanges().filter((e) => e.kind === kind)

export const CHANGE_KIND_LABELS: Record<CatalogChangeKind, string> = {
  'new-model': 'новая модель',
  'new-trim': 'новая комплектация',
  'price-changed': 'изменение цены',
  'price-list-updated': 'обновлён прайс-лист',
  'offer-expired': 'предложение завершилось',
  'offer-new': 'новое предложение',
  'program-changed': 'изменение кредитной программы',
}
