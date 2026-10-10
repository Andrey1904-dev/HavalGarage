/**
 * Извлечение текста из официальных PDF (прайс-листы и каталоги haval.ru).
 *
 * Используется библиотека unpdf (pdf.js без браузерных зависимостей). Разбор
 * считается успешным только если текст действительно извлечён: если документ
 * не удалось прочитать, модуль возвращает ошибку, и пайплайн помечает документ
 * как «требует ручной проверки» — данные не додумываются.
 */

let cached = null

async function loadUnpdf() {
  if (cached !== null) return cached
  try {
    cached = await import('unpdf')
    return cached
  } catch {
    cached = false
    return cached
  }
}

/** Доступно ли извлечение текста из PDF в текущем окружении */
export async function isPdfExtractionAvailable() {
  return Boolean(await loadUnpdf())
}

/**
 * Извлечь текст из PDF.
 *
 * @param {Buffer|Uint8Array} data содержимое PDF
 * @returns {Promise<{ok: boolean, text: string, pages: number, error: string|null}>}
 */
export async function extractPdfText(data) {
  const unpdf = await loadUnpdf()
  if (!unpdf) {
    return { ok: false, text: '', pages: 0, error: 'библиотека извлечения текста из PDF недоступна (unpdf не установлен)' }
  }
  try {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
    const pdf = await unpdf.getDocumentProxy(bytes)
    const result = await unpdf.extractText(pdf, { mergePages: true })
    const text = typeof result?.text === 'string' ? result.text : Array.isArray(result?.text) ? result.text.join('\n') : ''
    const pages = result?.totalPages ?? pdf?.numPages ?? 0
    if (!text || text.trim().length < 40) {
      return { ok: false, text: text ?? '', pages, error: 'текст PDF не извлечён (документ без текстового слоя или повреждён)' }
    }
    return { ok: true, text, pages, error: null }
  } catch (e) {
    return { ok: false, text: '', pages: 0, error: `ошибка разбора PDF: ${e?.message ?? String(e)}` }
  }
}

/** Похоже ли содержимое на PDF (по магическим байтам) */
export function looksLikePdf(buffer) {
  if (!buffer || buffer.byteLength < 5) return false
  return Buffer.from(buffer.slice(0, 5)).toString('latin1') === '%PDF-'
}
