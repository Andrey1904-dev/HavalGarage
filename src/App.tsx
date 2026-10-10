import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import { Spinner } from './components/ui'
import { CalculatorProvider } from './context/CalculatorContext'
import { SavedProvider } from './context/SavedContext'
import { CompareProvider } from './context/CompareContext'
import { appBase } from './utils/seo'
import HomePage from './pages/HomePage'

/**
 * HAVAL Гараж: каталог всех моделей официального каталога haval.ru,
 * кредитный калькулятор, подбор по бюджету, сравнение комплектаций,
 * стоимость владения, план покупки, избранное и источники данных.
 *
 * BrowserRouter + basename из BASE_URL: человекочитаемые URL и в dev-превью,
 * и в сборке для GitHub Pages (/HavalGarage/). Маршруты, кроме главной,
 * загружаются лениво — код разделён по страницам.
 */
const CatalogPage = lazy(() => import('./pages/CatalogPage'))
const TrimsPage = lazy(() => import('./pages/TrimsPage'))
const AdvisorPage = lazy(() => import('./pages/AdvisorPage'))
const ModelPage = lazy(() => import('./pages/ModelPage'))
const ComparePage = lazy(() => import('./pages/ComparePage'))
const CalculatorPage = lazy(() => import('./pages/CalculatorPage'))
const BudgetPage = lazy(() => import('./pages/BudgetPage'))
const OwnershipPage = lazy(() => import('./pages/OwnershipPage'))
const PlanPage = lazy(() => import('./pages/PlanPage'))
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'))
const ProgramsPage = lazy(() => import('./pages/ProgramsPage'))
const StockPage = lazy(() => import('./pages/StockPage'))
const SourcesPage = lazy(() => import('./pages/SourcesPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function RouteFallback() {
  return (
    <div className="flex min-h-[45dvh] flex-col items-center justify-center gap-3">
      <Spinner className="h-8 w-8" />
      <p className="text-[12px] text-[#A9AFB7]">Загрузка раздела…</p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter basename={appBase() || '/'}>
      <SavedProvider>
        <CompareProvider>
          <CalculatorProvider>
            <ErrorBoundary>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route element={<Layout />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/catalog" element={<CatalogPage />} />
                    <Route path="/trims" element={<TrimsPage />} />
                    <Route path="/advisor" element={<AdvisorPage />} />
                    <Route path="/models/:slug" element={<ModelPage />} />
                    <Route path="/compare" element={<ComparePage />} />
                    <Route path="/calculator" element={<CalculatorPage />} />
                    <Route path="/budget" element={<BudgetPage />} />
                    <Route path="/ownership" element={<OwnershipPage />} />
                    <Route path="/plan" element={<PlanPage />} />
                    <Route path="/favorites" element={<FavoritesPage />} />
                    <Route path="/programs" element={<ProgramsPage />} />
                    <Route path="/stock" element={<StockPage />} />
                    <Route path="/sources" element={<SourcesPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Route>
                  {/* Старый маршрут каталога как главной — без потери ссылок */}
                  <Route path="/index.html" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </CalculatorProvider>
        </CompareProvider>
      </SavedProvider>
    </BrowserRouter>
  )
}
