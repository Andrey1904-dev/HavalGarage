import type { ReportOptions } from './export'
import { appBase } from './seo'

/**
 * Экспорт расчёта в настоящий PDF-файл.
 *
 * Библиотека pdfmake подключается лениво: в основной бандл она не попадает,
 * а загружается отдельным chunk-ом только когда пользователь нажал «PDF».
 * Шрифт Roboto содержит кириллицу, поэтому документ содержит читаемый
 * русский текст, а не «кракозябры». Шрифты лежат статическими файлами в
 * public/fonts/pdfmake и скачиваются самой pdfmake при генерации: это
 * избавляет сборку от base64-блока vfs_fonts (~850 KiB JS) и позволяет
 * браузеру кэшировать TTF отдельно.
 *
 * Документ формируется полностью в браузере: данные расчёта никуда
 * не отправляются. В PDF не попадает ничего, чего нет в расчёте:
 * никаких выдуманных одобрений, ставок банка или персональных данных.
 */

const FONT = 'Roboto'

interface DocDefinition {
  content: unknown[]
  styles: Record<string, unknown>
  defaultStyle: Record<string, unknown>
  footer?: (currentPage: number, pageCount: number) => unknown
}

import type { PdfMakeType } from 'pdfmake/build/pdfmake.min.js'

let pdfMakePromise: Promise<PdfMakeType> | null = null

/** Абсолютный URL статического файла шрифта (учитывает base-путь GitHub Pages) */
function fontUrl(file: string): string {
  // appBase() уже нормализует base-путь (для GitHub Pages это '/HavalGarage')
  return new URL(`${appBase()}/fonts/pdfmake/${file}`, window.location.origin).href
}

/**
 * Ленивая загрузка pdfmake. Шрифты регистрируются URL-ами: 0.3.x сама
 * скачает их через fetch и положит в собственную виртуальную ФС
 * (присваивание pdfMake.vfs в этой версии игнорируется — регистрация
 * идёт через addVirtualFileSystem, а для файлов достаточно широток).
 */
async function loadPdfMake() {
  if (pdfMakePromise === null) {
    pdfMakePromise = (async () => {
      const { default: pdfMake } = await import('pdfmake/build/pdfmake.min.js')
      pdfMake.fonts = {
        [FONT]: {
          normal: fontUrl('Roboto-Regular.ttf'),
          bold: fontUrl('Roboto-Medium.ttf'),
          italics: fontUrl('Roboto-Italic.ttf'),
          bolditalics: fontUrl('Roboto-MediumItalic.ttf'),
        },
      }
      return pdfMake
    })().catch((e) => {
      pdfMakePromise = null
      throw e
    })
  }
  return pdfMakePromise
}

/**
 * Символы, которых нет во встроенном Roboto (проверено fonttools по всем
 * четырём начертаниям из public/fonts/pdfmake), и их замены. Без замены
 * pdfmake оставляет на месте символа пустоту — например, «20 % → 30 %»
 * превратилось бы в «20 %   30 %».
 */
const PDF_GLYPH_FALLBACKS: Record<string, string> = {
  '\u2192': '->', // →
  '\u2190': '<-', // ←
  '\u2191': '(рост)', // ↑
  '\u2193': '(снижение)', // ↓
  '\u2713': '+', // ✓
  '\u25BE': '', // ▾
  '\u202F': '\u00A0', // узкий неразрывный пробел (Intl в части локалей) → обычный неразрывный
}
const PDF_UNSUPPORTED = new RegExp(`[${Object.keys(PDF_GLYPH_FALLBACKS).join('')}]`, 'g')

/** Копия отчёта, где все строки прошли через pdfSafeText */
function sanitizeReport(options: ReportOptions): ReportOptions {
  return {
    ...options,
    title: pdfSafeText(options.title),
    subtitle: options.subtitle === undefined ? undefined : pdfSafeText(options.subtitle),
    sourceNote: options.sourceNote === undefined ? undefined : pdfSafeText(options.sourceNote),
    disclaimers: options.disclaimers?.map(pdfSafeText),
    sections: options.sections.map((section) => ({
      ...section,
      title: pdfSafeText(section.title),
      note: section.note === undefined ? undefined : pdfSafeText(section.note),
      rows: section.rows.map((row) => ({ ...row, label: pdfSafeText(row.label), value: pdfSafeText(row.value) })),
    })),
  }
}

/** Текст, который гарантированно отрисуется шрифтом PDF-документа */
export function pdfSafeText(text: string): string {
  return text.replace(PDF_UNSUPPORTED, (ch) => PDF_GLYPH_FALLBACKS[ch] ?? ch)
}

/** Преобразовать отчёт в структуру документа pdfmake */
export function buildDocDefinition(rawOptions: ReportOptions, createdAt = new Date()): DocDefinition {
  const options = sanitizeReport(rawOptions)
  const content: unknown[] = [
    { text: 'HAVAL Гараж', style: 'brand' },
    { text: options.title, style: 'title' },
  ]
  if (options.subtitle) content.push({ text: options.subtitle, style: 'subtitle' })

  for (const section of options.sections) {
    content.push({
      text: section.title,
      style: 'section',
      margin: [0, 14, 0, 6] as [number, number, number, number],
    })
    const body: unknown[] = section.rows.map((row) => [
      { text: row.label, style: row.tone === 'muted' ? 'labelMuted' : 'label' },
      {
        text: row.value,
        style: row.tone === 'accent' ? 'valueAccent' : row.tone === 'muted' ? 'valueMuted' : 'value',
      },
    ])
    content.push({
      table: { widths: ['58%', '*'], body },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0,
        hLineColor: () => '#E6E8EA',
        paddingTop: () => 4,
        paddingBottom: () => 4,
      },
      margin: [0, 0, 0, 4] as [number, number, number, number],
    })
    if (section.note) content.push({ text: section.note, style: 'note' })
  }

  if (options.disclaimers && options.disclaimers.length > 0) {
    content.push({ text: 'Оговорки', style: 'section', margin: [0, 14, 0, 6] as [number, number, number, number] })
    content.push({
      ul: options.disclaimers,
      style: 'disclaimer',
    })
  }

  if (options.sourceNote) content.push({ text: options.sourceNote, style: 'note', margin: [0, 10, 0, 0] as [number, number, number, number] })

  content.push({
    text: `Документ сформирован ${pdfSafeText(createdAt.toLocaleString('ru-RU'))}. HavalGarage — независимый информационный сервис, не официальный сайт HAVAL.`,
    style: 'note',
    margin: [0, 12, 0, 0] as [number, number, number, number],
  })

  return {
    content,
    styles: {
      brand: { fontSize: 9, bold: true, color: '#E4002B', characterSpacing: 1.2 },
      title: { fontSize: 17, bold: true, margin: [0, 2, 0, 0] },
      subtitle: { fontSize: 9.5, color: '#5B636D', margin: [0, 2, 0, 0] },
      section: { fontSize: 11, bold: true, color: '#E4002B' },
      label: { fontSize: 9.5, color: '#3D454E' },
      labelMuted: { fontSize: 9.5, color: '#5B636D' },
      value: { fontSize: 9.5, bold: true, color: '#14171A', alignment: 'right' },
      valueAccent: { fontSize: 10, bold: true, color: '#B80023', alignment: 'right' },
      valueMuted: { fontSize: 9.5, color: '#5B636D', alignment: 'right' },
      note: { fontSize: 8, color: '#5B636D' },
      disclaimer: { fontSize: 8, color: '#3D454E' },
    },
    defaultStyle: { font: FONT, fontSize: 9.5, color: '#14171A' },
    footer: (currentPage: number, pageCount: number) => ({
      text: `HavalGarage · ${currentPage} из ${pageCount} · расчёт является математической симуляцией и не является офертой`,
      style: 'note',
      margin: [40, 8, 40, 0],
    }),
  }
}

/** Сформировать PDF и отдать его пользователю файлом */
export async function exportReportPdf(options: ReportOptions, filename: string): Promise<boolean> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false
  try {
    const pdfMake = await loadPdfMake()
    const doc = pdfMake.createPdf(buildDocDefinition(options) as unknown as Record<string, unknown>)
    try {
      // pdfmake 0.3.x: download() асинхронный (getBlob → saveAs) — ошибки
      // видны только через Promise, синхронный try/catch их не ловит
      await doc.download(filename)
      return true
    } catch {
      return false
    }
  } catch {
    return false
  }
}

/** Имя файла без недопустимых символов */
export function pdfFileName(prefix: string): string {
  const date = new Date().toISOString().slice(0, 10)
  const safe = prefix
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return `havalgarage-${safe || 'report'}-${date}.pdf`
}
