import { Chart as ChartJS } from 'chart.js'

/**
 * Общие настройки canvas-графиков Chart.js.
 *
 * Canvas не наследует CSS: без явного font.family Chart.js рисует подписи
 * осей и подсказок шрифтом Helvetica/Arial, а не фирменным Manrope.
 * Стек должен совпадать с --font-sans из src/index.css (проверяется
 * тестом tests/typography.test.ts).
 */
export const CHART_FONT_FAMILY =
  "'Manrope Variable', 'Manrope', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif"

/** Минимальный размер подписей на графиках — как и минимальный кегль интерфейса */
export const CHART_FONT_SIZE = 11

ChartJS.defaults.font.family = CHART_FONT_FAMILY
ChartJS.defaults.font.size = CHART_FONT_SIZE
ChartJS.defaults.color = '#A2A7AF'

// Если график успел отрисоваться до загрузки веб-шрифта, canvas остался бы
// с запасным шрифтом навсегда — перерисовываем после загрузки шрифтов.
if (typeof document !== 'undefined' && document.fonts?.ready) {
  void document.fonts.ready.then(() => {
    for (const chart of Object.values(ChartJS.instances)) chart.update('none')
  })
}
