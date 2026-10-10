/**
 * Экспорт расчёта: печатная версия и сохранение в PDF через диалог печати браузера.
 *
 * Отдельная библиотека PDF не подключается намеренно: печать браузера
 * («Сохранить как PDF») даёт тот же результат без лишней зависимости и без
 * отправки финансовых данных пользователя на сторонние сервисы.
 */

export interface ReportRow {
  label: string
  value: string
  /** Визуальный акцент строки */
  tone?: 'default' | 'accent' | 'muted'
}

export interface ReportSection {
  title: string
  rows: ReportRow[]
  note?: string
}

export interface ReportOptions {
  title: string
  subtitle?: string
  sections: ReportSection[]
  disclaimers?: string[]
  sourceNote?: string
}

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/** HTML печатной версии расчёта (A4, без тёмного фона — экономия тонера) */
export function buildReportHtml(options: ReportOptions): string {
  const sections = options.sections
    .map(
      (s) => `
      <section>
        <h2>${escapeHtml(s.title)}</h2>
        <table>
          <tbody>
            ${s.rows
              .map(
                (r) =>
                  `<tr class="${r.tone ?? 'default'}"><th scope="row">${escapeHtml(r.label)}</th><td>${escapeHtml(
                    r.value,
                  )}</td></tr>`,
              )
              .join('')}
          </tbody>
        </table>
        ${s.note ? `<p class="note">${escapeHtml(s.note)}</p>` : ''}
      </section>`,
    )
    .join('')

  const disclaimers = (options.disclaimers ?? [])
    .map((d) => `<li>${escapeHtml(d)}</li>`)
    .join('')

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(options.title)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 28px 32px; color: #14171a; background: #fff;
    font-family: "Manrope", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: 12.5px; line-height: 1.5;
  }
  header { border-bottom: 3px solid #e4002b; padding-bottom: 12px; margin-bottom: 18px; }
  h1 { font-size: 22px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: .04em; }
  .subtitle { color: #5b636d; margin: 0; font-size: 12px; }
  section { break-inside: avoid; margin-bottom: 18px; }
  h2 {
    font-size: 13px; text-transform: uppercase; letter-spacing: .08em; margin: 0 0 8px;
    color: #e4002b; border-left: 4px solid #e4002b; padding-left: 8px;
  }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e6e8ea; vertical-align: top; }
  th { width: 52%; font-weight: 600; color: #3d454e; }
  td { font-weight: 700; font-variant-numeric: tabular-nums; }
  tr.accent td { color: #b80023; }
  tr.muted td { color: #5b636d; font-weight: 600; }
  .note { color: #5b636d; font-size: 11px; margin: 6px 0 0; }
  ul.disclaimers { margin: 0; padding-left: 18px; color: #3d454e; font-size: 11px; }
  footer { margin-top: 22px; border-top: 1px solid #e6e8ea; padding-top: 10px; color: #5b636d; font-size: 10.5px; }
  .brand { font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
  @media print {
    body { padding: 0; }
    .no-print { display: none !important; }
    a[href]::after { content: ""; }
  }
</style>
</head>
<body>
<header>
  <p class="brand" style="margin:0 0 6px;color:#e4002b;">HAVAL Гараж</p>
  <h1>${escapeHtml(options.title)}</h1>
  ${options.subtitle ? `<p class="subtitle">${escapeHtml(options.subtitle)}</p>` : ''}
</header>
${sections}
${
  disclaimers
    ? `<section><h2>Оговорки</h2><ul class="disclaimers">${disclaimers}</ul></section>`
    : ''
}
<footer>
  ${options.sourceNote ? `<p class="note">${escapeHtml(options.sourceNote)}</p>` : ''}
  <p class="note">
    Документ сформирован ${new Date().toLocaleString('ru-RU')}. Расчёт является математической симуляцией
    и не является офертой, рекламой ставки или одобрением кредита.
  </p>
  <p class="no-print" style="margin-top:12px;">
    <button onclick="window.print()" style="padding:10px 16px;font:inherit;background:#e4002b;color:#fff;border:0;border-radius:8px;cursor:pointer;">
      Печать / Сохранить в PDF
    </button>
  </p>
</footer>
</body>
</html>`
}

/** Можно ли открыть окно печати в текущем окружении */
export function canOpenReport(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

/**
 * Открыть печатную версию расчёта и вызвать диалог печати.
 * Возвращает false, если браузер заблокировал всплывающее окно или среда без DOM.
 */
export function openReport(options: ReportOptions, autoPrint = true): boolean {
  if (!canOpenReport()) return false
  const html = buildReportHtml(options)
  const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1000')
  if (!win) return false
  win.document.open()
  win.document.write(html)
  win.document.close()
  if (autoPrint) {
    // даём браузеру отрисовать документ перед вызовом печати
    win.setTimeout(() => {
      try {
        win.focus()
        win.print()
      } catch {
        /* пользователь напечатает вручную */
      }
    }, 250)
  }
  return true
}

/** Печать текущей страницы (печатная версия интерфейса) */
export function printCurrentPage(): void {
  if (!canOpenReport()) return
  try {
    window.print()
  } catch {
    /* игнорируем */
  }
}
