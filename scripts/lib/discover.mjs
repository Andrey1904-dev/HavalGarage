/**
 * Обнаружение официальных документов на странице каталогов haval.ru.
 *
 * Модуль разбирает HTML страницы https://haval.ru/purchase/catalogues/ и
 * находит ссылки на официальные каталоги и прайс-листы (cdn.perxis.ru),
 * связывая их с моделью по названию в карточке. Никаких обходов блокировок:
 * разбирается только публичный HTML, отдаваемый сервером.
 */

export const CATALOGUES_URL = 'https://haval.ru/purchase/catalogues/'

/** Известные модели каталога и варианты написания (порядок важен: сначала длинные) */
const MODEL_PATTERNS = [
  [/POER\s*KINGKONG/i, 'poer-kingkong'],
  [/DARGO\s*X/i, 'dargo-x'],
  [/\bDARGO\b/i, 'dargo'],
  [/\bJOLION\b/i, 'jolion'],
  [/F7\s*[XxХх]/i, 'f7x'],
  [/\bF7\b/i, 'f7'],
  [/\bM6\b/i, 'm6'],
  [/\bPOER\b/i, 'poer'],
  [/\bH3\b/i, 'h3'],
  [/\bH5\b/i, 'h5'],
  [/\bH7\b/i, 'h7'],
  [/\bH9\b/i, 'h9'],
]

/** Ссылки на документы производителя */
const DOC_RE = /<a[^>]+href=["'](https:\/\/cdn\.perxis\.ru\/originals\/[^"']+)["'][^>]*>([\s\S]{0,400}?)<\/a>/gi

const stripTags = (s) =>
  String(s ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()

/** Извлечь тизеры цен «от 2 099 000 ₽» с привязкой к модели */
export function parseTeasers(html) {
  const text = stripTags(String(html ?? '').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' '))
  const lines = text.split(/(?<=[.!?])\s+|\n/).map((l) => l.trim()).filter(Boolean)
  const found = []
  for (const line of lines) {
    const m = line.match(/от\s+([\d\s\u00A0]{5,15})\s*₽/i)
    if (!m) continue
    const price = Number(m[1].replace(/[\s\u00A0]/g, ''))
    if (!Number.isFinite(price) || price <= 0) continue
    for (const [re, slug] of MODEL_PATTERNS) {
      if (re.test(line)) {
        if (!found.some((f) => f.slug === slug)) found.push({ slug, price, context: line.slice(0, 180) })
        break
      }
    }
  }
  return found
}

/**
 * Разобрать страницу каталогов.
 *
 * @returns {{url: string, documents: Array<{url: string, modelId: string|null, label: string|null,
 *            documentType: 'price-list'|'catalogue'}>, teasers: Array<{slug: string, price: number}>,
 *            issues: string[]}}
 */
export function parseCataloguesPage(html, url = CATALOGUES_URL) {
  const source = String(html ?? '')
  const issues = []
  const documents = []

  for (const m of source.matchAll(DOC_RE)) {
    const href = m[1]
    const anchorText = stripTags(m[2])
    // модель ищем в тексте перед ссылкой: карточка модели предшествует ссылкам
    const before = stripTags(source.slice(Math.max(0, m.index - 4000), m.index))
    let modelId = null
    for (const [re, slug] of MODEL_PATTERNS) {
      if (re.test(before.slice(-1200))) {
        modelId = slug
        break
      }
    }
    const isPrice = /прайс|мцп|цен/i.test(anchorText)
    documents.push({
      url: href,
      modelId,
      label: anchorText || null,
      documentType: isPrice ? 'price-list' : 'catalogue',
    })
  }

  if (documents.length === 0) {
    issues.push('на странице каталогов не найдено ссылок на документы cdn.perxis.ru — возможно, изменилась разметка')
  }
  if (documents.some((d) => d.modelId === null)) {
    issues.push('часть документов не удалось связать с моделью — они потребуют ручной проверки')
  }

  return { url, documents, teasers: parseTeasers(source), issues }
}
