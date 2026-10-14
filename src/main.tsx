import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Самостоятельно размещённые вариативные шрифты (кириллица, латиница, ₽):
// без зависимости от Google Fonts и с одинаковой отрисовкой во всех браузерах
import '@fontsource-variable/manrope'
import '@fontsource-variable/jetbrains-mono'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
