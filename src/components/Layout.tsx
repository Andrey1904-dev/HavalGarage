import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  CATALOG_FIXED_AT,
  DEALER_URL,
  HAVAL_PRICE_LISTS_URL,
  lastSuccessfulCheck,
} from '../data/haval'
import { fmtDate } from '../utils/format'
import { useCompare } from '../context/CompareContext'
import { useSaved } from '../context/SavedContext'
import { CarIcon, CloseIcon, HeartIcon, MenuIcon, ScaleIcon } from './icons'

const PRIMARY_NAV = [
  { to: '/', label: 'Главная', end: true },
  { to: '/catalog', label: 'Каталог', end: false },
  { to: '/calculator', label: 'Кредит', end: false },
  { to: '/budget', label: 'Подбор', end: false },
  { to: '/compare', label: 'Сравнение', end: false },
]

const SECONDARY_NAV = [
  { to: '/ownership', label: 'Стоимость владения' },
  { to: '/plan', label: 'План покупки' },
  { to: '/favorites', label: 'Избранное' },
  { to: '/programs', label: 'Кредитные программы' },
  { to: '/stock', label: 'В наличии' },
  { to: '/sources', label: 'Источники данных' },
]

/** Единый список разделов для мобильного меню и подвала */
const ALL_NAV: Array<{ to: string; label: string; end: boolean }> = [
  ...PRIMARY_NAV.map((n) => ({ to: n.to, label: n.label, end: n.end })),
  ...SECONDARY_NAV.map((n) => ({ to: n.to, label: n.label, end: false })),
]

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const location = useLocation()
  const { trimIds } = useCompare()
  const { favorites, calculations } = useSaved()

  // Закрытие меню при переходе и по Escape (доступность с клавиатуры)
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        setMoreOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const lastCheck = lastSuccessfulCheck() ?? CATALOG_FIXED_AT
  const savedCount = favorites.length + calculations.length

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `min-h-[40px] rounded-[8px] px-3 py-2 text-[12.5px] font-bold uppercase tracking-wide transition-colors ${
      isActive
        ? 'bg-[#23272D] text-[#F3F4F4] shadow-[inset_0_-2px_0_0_#E4002B]'
        : 'text-[#A9AFB7] hover:text-[#F3F4F4]'
    }`

  return (
    <div className="flex min-h-dvh flex-col bg-[#0E1013]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-[8px] focus:bg-[#E4002B] focus:px-3 focus:py-2 focus:text-[13px] focus:font-bold focus:text-white"
      >
        К основному содержимому
      </a>

      <header className="sticky top-0 z-40 border-b border-[#363B43]/70 bg-[#0E1013]/94 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2.5" aria-label="HAVAL Гараж — на главную">
            <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#E4002B] font-display-num text-[16px] font-bold text-white">
              H
            </span>
            <span className="font-display-num hidden text-[15px] font-bold uppercase tracking-[0.14em] text-[#F3F4F4] sm:block">
              HAVAL <span className="text-[#A9AFB7]">Гараж</span>
            </span>
          </Link>

          <nav className="ml-auto hidden items-center gap-1 lg:flex" aria-label="Основная навигация">
            {PRIMARY_NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={navLinkClass}>
                <span className="relative">
                  {n.label}
                  {n.to === '/compare' && trimIds.length > 0 && (
                    <span className="absolute -right-3.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E4002B] px-1 text-[9.5px] font-bold text-white">
                      {trimIds.length}
                    </span>
                  )}
                </span>
              </NavLink>
            ))}

            <div className="relative">
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                className={`min-h-[40px] rounded-[8px] px-3 py-2 text-[12.5px] font-bold uppercase tracking-wide transition-colors ${
                  moreOpen || SECONDARY_NAV.some((n) => location.pathname.startsWith(n.to))
                    ? 'bg-[#23272D] text-[#F3F4F4]'
                    : 'text-[#A9AFB7] hover:text-[#F3F4F4]'
                }`}
              >
                Ещё
              </button>
              {moreOpen && (
                <div
                  role="menu"
                  className="animate-pop-in absolute right-0 top-[46px] z-50 w-60 overflow-hidden rounded-[10px] border border-[#363B43] bg-[#1A1D22] shadow-xl"
                >
                  {SECONDARY_NAV.map((n) => (
                    <NavLink
                      key={n.to}
                      to={n.to}
                      role="menuitem"
                      onClick={() => setMoreOpen(false)}
                      className={({ isActive }) =>
                        `flex min-h-[42px] items-center justify-between gap-2 px-3.5 py-2.5 text-[12.5px] font-semibold transition-colors ${
                          isActive ? 'bg-[#23272D] text-[#F3F4F4]' : 'text-[#A9AFB7] hover:bg-[#23272D] hover:text-[#F3F4F4]'
                        }`
                      }
                    >
                      {n.label}
                      {n.to === '/favorites' && savedCount > 0 && (
                        <span className="rounded-full bg-[#E4002B] px-1.5 text-[10px] font-bold text-white">{savedCount}</span>
                      )}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          </nav>

          <Link
            to="/favorites"
            className="ml-auto flex min-h-[40px] items-center gap-1.5 rounded-[8px] border border-[#363B43] px-2.5 text-[11.5px] font-bold uppercase text-[#A9AFB7] transition-colors hover:text-[#F3F4F4] lg:ml-2"
            aria-label={`Избранное и сохранённые расчёты: ${savedCount}`}
          >
            <HeartIcon className="h-4 w-4" />
            {savedCount > 0 && <span className="text-[#E4002B]">{savedCount}</span>}
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-[8px] border border-[#363B43] text-[#A9AFB7] lg:hidden"
          >
            {menuOpen ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <nav
            aria-label="Мобильная навигация"
            className="animate-pop-in border-t border-[#363B43]/70 bg-[#0E1013] px-4 py-3 lg:hidden"
          >
            <ul className="grid grid-cols-1 gap-1">
              {ALL_NAV.map((n) => (
                <li key={n.to}>
                  <NavLink
                    to={n.to}
                    end={n.end}
                    className={({ isActive }) =>
                      `flex min-h-[44px] items-center justify-between gap-2 rounded-[8px] px-3 text-[13px] font-bold uppercase tracking-wide transition-colors ${
                        isActive ? 'bg-[#23272D] text-[#F3F4F4]' : 'text-[#A9AFB7] hover:text-[#F3F4F4]'
                      }`
                    }
                  >
                    {n.label}
                    {n.to === '/compare' && trimIds.length > 0 && (
                      <span className="rounded-full bg-[#E4002B] px-1.5 text-[10.5px] font-bold text-white">{trimIds.length}</span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-[#363B43]/70 bg-[#0E1013] print:hidden">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-[11.5px] leading-relaxed text-[#A9AFB7]">
          <nav aria-label="Навигация в подвале" className="flex flex-wrap gap-x-4 gap-y-1.5">
            {ALL_NAV.map((n) => (
              <Link key={n.to} to={n.to} className="transition-colors hover:text-[#F3F4F4]">
                {n.label}
              </Link>
            ))}
          </nav>

          <p className="flex items-start gap-2">
            <CarIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#E4002B]" />
            <span>
              <strong className="text-[#F3F4F4]">HavalGarage — независимый информационный инструмент.</strong> Сервис не
              является официальным сайтом HAVAL, официальным дилером или банком. Цены, комплектации и характеристики
              берутся из официальных{' '}
              <a
                className="underline decoration-[#E4002B]/60 underline-offset-2 hover:text-[#E4002B]"
                href={HAVAL_PRICE_LISTS_URL}
                target="_blank"
                rel="noreferrer"
                onClick={() => undefined}
              >
                каталогов и прайс-листов haval.ru
              </a>
              ; данные дилера{' '}
              <a className="underline decoration-[#363B43] underline-offset-2 hover:text-[#F3F4F4]" href={DEALER_URL} target="_blank" rel="noreferrer">
                АГАТ (Екатеринбург)
              </a>{' '}
              используются как вторичный источник и помечаются в интерфейсе.
            </span>
          </p>

          <p className="flex items-start gap-2">
            <ScaleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#E4002B]" />
            <span>
              Расчёты являются математической симуляцией и не являются офертой, рекламой ставки или одобрением кредита.
              Условия уточняйте у дилера и банков-партнёров.
            </span>
          </p>

          <p>
            Данные каталога зафиксированы {fmtDate(CATALOG_FIXED_AT)}
            {lastCheck !== CATALOG_FIXED_AT ? ` · последняя успешная проверка источников ${fmtDate(lastCheck)}` : ''}.
            Автоматическое обновление в реальном времени не выполняется: каталог обновляется скриптами и ручной
            проверкой прайс-листов.
          </p>
        </div>
      </footer>
    </div>
  )
}
