import raw from './source-documents.json'
import type { SourceDocument } from './types'

/**
 * Реестр официальных документов-первоисточников (прайс-листы, каталоги,
 * официальные страницы).
 *
 * Реестр — часть модели данных (сущность SourceDocument) и используется
 * пайплайном импорта: `npm run catalog discover` дополняет его найденными
 * документами, `npm run catalog import` записывает результат разбора
 * (checksum, статус, число извлечённых цен).
 *
 * Документ со статусом 'needs-manual-review' означает: автоматический разбор
 * дал неполный результат или невозможен, требуется проверка человеком.
 * Такие документы никогда не подменяют подтверждённые данные каталога.
 */
export interface SourceDocumentFile {
  documents: SourceDocument[]
}

export const SOURCE_DOCUMENTS: SourceDocument[] = (raw as SourceDocumentFile).documents

export const getSourceDocuments = (modelId: string): SourceDocument[] =>
  SOURCE_DOCUMENTS.filter((d) => d.modelId === modelId)

/** Документы, требующие ручной проверки (показываются в разделе «Источники») */
export const documentsNeedingReview = (): SourceDocument[] =>
  SOURCE_DOCUMENTS.filter((d) => d.parsingStatus === 'needs-manual-review' || d.parsingStatus === 'unavailable')

/** Документы, из которых успешно извлечены цены пайплайном */
export const parsedDocuments = (): SourceDocument[] =>
  SOURCE_DOCUMENTS.filter((d) => d.parsingStatus === 'parsed')

export const PARSING_STATUS_LABELS: Record<SourceDocument['parsingStatus'], string> = {
  parsed: 'разобран автоматически',
  'needs-manual-review': 'требует ручной проверки',
  unavailable: 'источник недоступен',
  pending: 'разбор не выполнялся',
}

export const DOCUMENT_TYPE_LABELS: Record<SourceDocument['documentType'], string> = {
  'price-list': 'прайс-лист',
  catalogue: 'каталог',
  page: 'официальная страница',
}
