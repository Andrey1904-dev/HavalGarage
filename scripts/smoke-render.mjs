/**
 * Smoke-тест рендера всех экранов без браузера (перенесено из GrantaCredit.zip).
 *
 * Каждый маршрут рендерится через react-dom/server, чтобы поймать падения
 * на этапе выполнения: битые импорты, отсутствующие компоненты,
 * несовпадение форм данных с разметкой.
 *
 * Запуск: npm run smoke
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement as h, StrictMode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Layout from '../src/components/Layout.tsx'
import { CalculatorProvider } from '../src/context/CalculatorContext.tsx'
import CatalogPage from '../src/pages/CatalogPage.tsx'
import ModelPage from '../src/pages/ModelPage.tsx'
import CalculatorPage from '../src/pages/CalculatorPage.tsx'
import ProgramsPage from '../src/pages/ProgramsPage.tsx'

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
}
globalThis.window = globalThis
globalThis.dispatchEvent = () => true
globalThis.addEventListener = () => {}
globalThis.removeEventListener = () => {}

const ROUTES = [
  ['/', 'каталог'],
  ['/models/m6', 'модель M6'],
  ['/models/jolion', 'модель JOLION'],
  ['/models/f7', 'модель F7'],
  ['/models/h3', 'модель H3 (PRO)'],
  ['/models/h7', 'модель H7 (PRO)'],
  ['/models/h9', 'модель H9 (PRO)'],
  ['/models/poer-kingkong', 'модель POER KINGKONG'],
  ['/calculator', 'калькулятор'],
  ['/programs', 'программы'],
]

let failed = 0
for (const [path, label] of ROUTES) {
  try {
    const html = renderToStaticMarkup(
      h(
        StrictMode,
        null,
        h(
          MemoryRouter,
          { initialEntries: [path] },
          h(
            CalculatorProvider,
            null,
            h(
              Routes,
              null,
              h(
                Route,
                { element: h(Layout) },
                h(Route, { path: '/', element: h(CatalogPage) }),
                h(Route, { path: '/models/:slug', element: h(ModelPage) }),
                h(Route, { path: '/calculator', element: h(CalculatorPage) }),
                h(Route, { path: '/programs', element: h(ProgramsPage) }),
              ),
            ),
          ),
        ),
      ),
    )
    if (html.length < 500) throw new Error(`подозрительно короткий вывод (${html.length} символов)`)
    console.log(`✓ ${label} (${path}) — ${html.length} символов`)
  } catch (e) {
    failed++
    console.error(`✗ ${label} (${path}): ${e.message}`)
  }
}

if (failed > 0) process.exit(1)
console.log('Smoke-рендер пройден: все страницы отрисовались без ошибок.')
