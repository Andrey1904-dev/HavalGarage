import { NavLink, Outlet, Link } from 'react-router-dom'
import { CATALOG_FIXED_AT, DEALER_URL } from '../data/haval'
import { fmtDate } from '../utils/format'

const NAV = [
  { to: '/', label: 'Каталог', end: true },
  { to: '/calculator', label: 'Кредит', end: false },
  { to: '/programs', label: 'Программы', end: false },
]

export default function Layout() {
  return (
    <div className="flex min-h-dvh flex-col bg-[#0E1013]">
      <header className="sticky top-0 z-40 border-b border-[#363B43]/70 bg-[#0E1013]/92 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link to="/" className="flex items-center gap-2.5" aria-label="HAVAL Гараж — на главную">
            <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#E4002B] font-display-num text-[16px] font-bold text-white">
              H
            </span>
            <span className="font-display-num text-[15px] font-bold uppercase tracking-[0.14em] text-[#F3F4F4]">
              HAVAL <span className="text-[#A9AFB7]">Гараж</span>
            </span>
          </Link>
          <nav className="ml-auto flex items-center gap-1" aria-label="Основная навигация">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `min-h-[40px] rounded-[8px] px-3 py-2 text-[12.5px] font-bold uppercase tracking-wide transition-colors ${
                    isActive ? 'bg-[#23272D] text-[#F3F4F4] shadow-[inset_0_-2px_0_0_#E4002B]' : 'text-[#A9AFB7] hover:text-[#F3F4F4]'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-[#363B43]/70 bg-[#0E1013]">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-[11.5px] leading-relaxed text-[#A9AFB7]">
          <p>
            Неофициальный расчётный сервис по данным официального дилера HAVAL «АГАТ» (Екатеринбург):{' '}
            <a className="text-[#F3F4F4] underline decoration-[#E4002B]/60 underline-offset-2 hover:text-[#E4002B]" href={DEALER_URL} target="_blank" rel="noreferrer">
              agat-ekb-haval.ru
            </a>
            . Расчёты являются математической симуляцией и не являются офертой или одобрением кредита.
            Условия уточняйте у дилера и банков-партнёров.
          </p>
          <p>
            Данные каталога зафиксированы {fmtDate(CATALOG_FIXED_AT)}. Цены, комплектации и программы — по
            опубликованным страницам и прайс-листам дилера; актуальность подтвердите первоисточником.
          </p>
        </div>
      </footer>
    </div>
  )
}
