import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { CalculatorProvider } from './context/CalculatorContext'
import CatalogPage from './pages/CatalogPage'
import ModelPage from './pages/ModelPage'
import CalculatorPage from './pages/CalculatorPage'
import ProgramsPage from './pages/ProgramsPage'

/**
 * HAVAL Гараж: каталог моделей дилера АГАТ + кредитный калькулятор.
 * HashRouter — как в исходном проекте, для корректной работы на GitHub Pages.
 */
export default function App() {
  return (
    <HashRouter>
      <CalculatorProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<CatalogPage />} />
            <Route path="/models/:slug" element={<ModelPage />} />
            <Route path="/calculator" element={<CalculatorPage />} />
            <Route path="/programs" element={<ProgramsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </CalculatorProvider>
    </HashRouter>
  )
}
