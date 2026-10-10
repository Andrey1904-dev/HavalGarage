/**
 * Экспорт таблиц в CSV и JSON.
 *
 * Дополняет печатную версию расчётов (utils/export.ts): таблицы каталога,
 * сравнения и истории цен удобно забирать в электронные таблицы. Файл
 * формируется полностью на стороне браузера — данные пользователя никуда
 * не отправляются.
 */

const BROWSER = typeof window !== 'undefined' && typeof document !== 'undefined'

/** Экранирование значения CSV (разделитель — точка с запятой, как принято в ru-Excel) */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (/[";\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function triggerDownload(filename: string, mime: string, content: string): boolean {
  if (!BROWSER) return false
  try {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    // объект освобождаем не сразу: часть браузеров не успевает начать загрузку
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    return true
  } catch {
    return false
  }
}

/** Сформировать CSV и отдать его пользователю файлом */
export function downloadCsv(filename: string, header: string[], rows: Array<Array<unknown>>): boolean {
  const lines = [header.map(csvCell).join(';'), ...rows.map((row) => row.map(csvCell).join(';'))]
  // BOM нужен, чтобы Excel correctly открыл кириллицу
  return triggerDownload(filename, 'text/csv', `\uFEFF${lines.join('\r\n')}\r\n`)
}

/** Сформировать JSON и отдать его пользователем файлом */
export function downloadJson(filename: string, data: unknown): boolean {
  return triggerDownload(filename, 'application/json', `${JSON.stringify(data, null, 2)}\n`)
}

/** Текст CSV (для тестов и для предварительного просмотра) */
export function buildCsv(header: string[], rows: Array<Array<unknown>>): string {
  const lines = [header.map(csvCell).join(';'), ...rows.map((row) => row.map(csvCell).join(';'))]
  return lines.join('\r\n')
}
