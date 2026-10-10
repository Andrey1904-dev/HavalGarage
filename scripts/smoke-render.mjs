/**
 * Smoke-тест рендера всех экранов без браузера.
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
import { SavedProvider } from '../src/context/SavedContext.tsx'
import { CompareProvider } from '../src/context/CompareContext.tsx'
import HomePage from '../src/pages/HomePage.tsx'
import CatalogPage from '../src/pages/CatalogPage.tsx'
import ModelPage from '../src/pages/ModelPage.tsx'
import ComparePage from '../src/pages/ComparePage.tsx'
import CalculatorPage from '../src/pages/CalculatorPage.tsx'
import BudgetPage from '../src/pages/BudgetPage.tsx'
import OwnershipPage from '../src/pages/OwnershipPage.tsx'
import PlanPage from '../src/pages/PlanPage.tsx'
import FavoritesPage from '../src/pages/FavoritesPage.tsx'
import ProgramsPage from '../src/pages/ProgramsPage.tsx'
import StockPage from '../src/pages/StockPage.tsx'
import SourcesPage from '../src/pages/SourcesPage.tsx'
import NotFoundPage from '../src/pages/NotFoundPage.tsx'

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
  ['/', 'главная'],
  ['/catalog', 'каталог'],
  ['/catalog?family=PRO&drive=awd', 'каталог с фильтрами'],
  ['/models/m6', 'модель M6'],
  ['/models/jolion', 'модель JOLION'],
  ['/models/dargo', 'модель DARGO'],
  ['/models/dargo-x', 'модель DARGO X'],
  ['/models/f7', 'модель F7'],
  ['/models/f7x', 'модель F7X'],
  ['/models/poer', 'модель POER'],
  ['/models/h3', 'модель H3 (PRO)'],
  ['/models/h5', 'модель H5 (PRO)'],
  ['/models/h7', 'модель H7 (PRO)'],
  ['/models/h9', 'модель H9 (PRO)'],
  ['/models/poer-kingkong', 'модель POER KINGKONG (без прайс-листа)'],
  ['/models/unknown-slug', 'модель не найдена'],
  ['/compare', 'сравнение (пустое)'],
  ['/compare?trims=m6-optimum-mt-2026,m6-optimum-at-2026', 'сравнение двух комплектаций'],
  ['/compare?trims=jolion-comfort-mt-2026,h9-technoplus-2026,poer-premium-at-diesel-2026', 'сравнение трёх разных моделей'],
  ['/calculator', 'калькулятор'],
  ['/calculator?trim=h3-optimum-4wd-2026', 'калькулятор с комплектацией'],
  ['/budget', 'подбор по бюджету'],
  ['/budget?payment=45000&down=400000&term=60&rate=16,4', 'подбор с параметрами'],
  ['/ownership', 'стоимость владения'],
  ['/ownership?trim=jolion-technoplus-4wd-2026', 'владение с комплектацией'],
  ['/plan', 'план покупки'],
  ['/plan?tab=trade-in', 'план покупки: трейд-ин'],
  ['/favorites', 'избранное'],
  ['/programs', 'программы'],
  ['/stock', 'автомобили в наличии'],
  ['/sources', 'источники данных'],
  ['/some/unknown/route', 'страница не найдена'],
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
            SavedProvider,
            null,
            h(
              CompareProvider,
              null,
              h(
                CalculatorProvider,
                null,
                h(
                  Routes,
                  null,
                  h(
                    Route,
                    { element: h(Layout) },
                    h(Route, { path: '/', element: h(HomePage) }),
                    h(Route, { path: '/catalog', element: h(CatalogPage) }),
                    h(Route, { path: '/models/:slug', element: h(ModelPage) }),
                    h(Route, { path: '/compare', element: h(ComparePage) }),
                    h(Route, { path: '/calculator', element: h(CalculatorPage) }),
                    h(Route, { path: '/budget', element: h(BudgetPage) }),
                    h(Route, { path: '/ownership', element: h(OwnershipPage) }),
                    h(Route, { path: '/plan', element: h(PlanPage) }),
                    h(Route, { path: '/favorites', element: h(FavoritesPage) }),
                    h(Route, { path: '/programs', element: h(ProgramsPage) }),
                    h(Route, { path: '/stock', element: h(StockPage) }),
                    h(Route, { path: '/sources', element: h(SourcesPage) }),
                    h(Route, { path: '*', element: h(NotFoundPage) }),
                  ),
                ),
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
