import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Car,
  Layers,
  Scale,
  Calculator,
  Wrench,
  PiggyBank,
  Wallet,
  FileCheck2,
  Heart,
  Bot,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  Percent,
  Warehouse,
  ExternalLink,
} from 'lucide-react'
import {
  CATALOG_FIXED_AT,
  DEALER_URL,
  HAVAL_PRICE_LISTS_URL,
  PRICE_STALE_AFTER_DAYS,
  catalogAgeDays,
  isCatalogStale,
  lastSuccessfulCheck,
  todayIso,
} from '../data/haval'
import { fmtDate } from '../utils/format'
import { useCompare } from '../context/CompareContext'
import { useSaved } from '../context/SavedContext'

/** Основная навигация шапки — реальные маршруты HavalGarage */
const HEADER_NAV = [
  { to: '/catalog', label: 'Модели', icon: Car, end: false },
  { to: '/trims', label: 'Комплектации', icon: Layers, end: false },
  { to: '/budget', label: 'Подбор', icon: Wallet, end: false },
  { to: '/compare', label: 'Сравнение', icon: Scale, end: false },
  { to: '/calculator', label: 'Кредит', icon: Calculator, end: false },
  { to: '/ownership', label: 'Владение', icon: Wrench, end: false },
  { to: '/plan', label: 'План покупки', icon: PiggyBank, end: false },
  { to: '/sources', label: 'Источники и цены', icon: FileCheck2, end: false },
  { to: '/advisor', label: 'Помощник', icon: Bot, end: false, highlight: true },
]

/** Дополнительные разделы — в мобильном меню и подвале */
const EXTRA_NAV = [
  { to: '/programs', label: 'Кредитные программы', icon: Percent },
  { to: '/stock', label: 'В наличии', icon: Warehouse },
]

const MOBILE_NAV = [
  { to: '/', label: 'Главная', icon: Car, end: true },
  ...HEADER_NAV.map((n) => ({ to: n.to, label: n.label, icon: n.icon, end: false })),
  ...EXTRA_NAV.map((n) => ({ to: n.to, label: n.label, icon: n.icon, end: false })),
]

const FOOTER_LINKS: Array<{ to: string; label: string }> = [
  { to: '/catalog', label: 'Каталог моделей' },
  { to: '/trims', label: 'Комплектации и оснащение' },
  { to: '/budget', label: 'Подбор по бюджету и платежу' },
  { to: '/compare', label: 'Сравнение характеристик' },
  { to: '/advisor', label: 'Помощник по выбору' },
]

const FOOTER_FINANCE: Array<{ to: string; label: string }> = [
  { to: '/calculator', label: 'Кредитный калькулятор' },
  { to: '/programs', label: 'Кредитные программы' },
  { to: '/ownership', label: 'Стоимость владения (TCO)' },
  { to: '/plan', label: 'План накопления и покупки' },
  { to: '/stock', label: 'Наличие у дилера' },
]

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const { trimIds } = useCompare()
  const { favorites, calculations } = useSaved()

  // Закрытие мобильного меню при переходе и по Escape (доступность с клавиатуры)
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const lastCheck = lastSuccessfulCheck() ?? CATALOG_FIXED_AT
  const savedCount = favorites.length + calculations.length

  // Честный возраст снимка относительно реальной текущей даты (не «замороженный»):
  // статусы цен детерминированы датой снимка, а здесь показываем, что данные могли устареть
  const realToday = todayIso()
  const catalogStale = isCatalogStale(realToday)
  const catalogAge = catalogAgeDays(CATALOG_FIXED_AT, realToday)

  return (
    <div className="flex min-h-dvh flex-col justify-between bg-[#0B0C0E] text-[#F4F5F6]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-xl focus:bg-[#FF334B] focus:px-3 focus:py-2 focus:text-[13px] focus:font-bold focus:text-white"
      >
        К основному содержимому
      </a>

      {/* ======================= ШАПКА (SiteHeader из HavalDesign) ======================= */}
      <header className="glass-panel sticky top-0 z-50 w-full border-b border-[#242930] bg-[#0B0C0E]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Бренд */}
          <Link to="/" className="group flex shrink-0 select-none items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF334B] to-[#990014] shadow-lg shadow-[#FF334B]/20 transition-all duration-300 group-hover:shadow-[#FF334B]/40">
              <span className="text-sm font-extrabold tracking-tighter text-white">H</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-extrabold tracking-tight text-[#F4F5F6] group-hover:text-white">
                  HAVAL<span className="text-[#FF334B]">GARAGE</span>
                </span>
                <span className="rounded border border-[#FF334B]/30 bg-[#FF334B]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#FF6B7E]">
                  3.0
                </span>
              </div>
              <div className="-mt-0.5 flex items-center gap-1 text-[10px] text-[#747B85]">
                <ShieldCheck className="h-3 w-3 text-emerald-400" /> Официальные прайс-листы haval.ru
              </div>
            </div>
          </Link>

          {/* Десктопная навигация */}
          <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Основная навигация">
            {HEADER_NAV.map((link) => {
              const Icon = link.icon
              return (
                <NavLink key={link.to} to={link.to} end={link.end} aria-label={link.label}>
                  {({ isActive }) => (
                    <span
                      className={`relative flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150 ${
                        isActive
                          ? 'border border-[#333A44] bg-[#20242A] text-white shadow-sm'
                          : `border border-transparent text-[#A2A7AF] hover:bg-white/5 hover:text-[#F4F5F6]${link.highlight ? ' text-[#FF6B7E] hover:text-white' : ''}`
                      }`}
                    >
                      <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-[#FF334B]' : ''}`} />
                      <span>{link.label}</span>
                      {link.to === '/compare' && trimIds.length > 0 && (
                        <span className="rounded-full bg-[#FF334B] px-1.5 py-[1px] text-[10px] font-bold text-white">
                          {trimIds.length}
                        </span>
                      )}
                    </span>
                  )}
                </NavLink>
              )
            })}
          </nav>

          {/* Правые действия */}
          <div className="flex items-center gap-2">
            <NavLink to="/favorites" aria-label={`Избранное и сохранённые расчёты: ${savedCount}`} title="Избранное">
              {({ isActive }) => (
                <span
                  className={`relative flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-xl border p-2.5 transition-all duration-200 ${
                    isActive
                      ? 'border-[#FF334B]/40 bg-[#FF334B]/20 text-[#FF6B7E]'
                      : 'border-[#2B3037] bg-[#181B1F] text-[#A2A7AF] hover:bg-[#20242A] hover:text-white'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${savedCount > 0 ? 'fill-[#FF334B]/40 text-[#FF334B]' : ''}`} />
                  {savedCount > 0 && <span className="font-mono text-xs font-bold text-white">{savedCount}</span>}
                </span>
              )}
            </NavLink>

            {/* Быстрый доступ к помощнику */}
            <Link
              to="/advisor"
              className="hidden cursor-pointer items-center gap-2 rounded-xl border border-[#333A44] bg-[#20242A] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:border-[#FF334B]/50 hover:bg-[#2A3038] sm:inline-flex xl:hidden"
            >
              <Bot className="h-3.5 w-3.5 text-[#FF334B]" />
              <span>Помощник</span>
            </Link>

            {/* Мобильное меню */}
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
              className="cursor-pointer rounded-2xl border border-[#2B3037] bg-[#181B1F] p-2.5 text-[#A2A7AF] transition-colors hover:text-white xl:hidden"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Мобильный drawer */}
        {menuOpen && (
          <nav
            aria-label="Мобильная навигация"
            className="animate-fadeIn max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-[#242930] bg-[#0E1013] px-4 pb-6 pt-3 xl:hidden"
          >
            <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-2">
              {MOBILE_NAV.map((link) => {
                const Icon = link.icon
                return (
                  <NavLink key={link.to + link.label} to={link.to} end={link.end}>
                    {({ isActive }) => (
                      <span
                        className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-4 py-3 text-sm font-medium ${
                          isActive
                            ? 'border border-[#FF334B]/40 bg-[#20242A] text-white'
                            : 'border border-[#242930] bg-[#181B1F] text-[#A2A7AF] hover:text-white'
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <Icon className={`h-4 w-4 ${isActive ? 'text-[#FF334B]' : 'text-[#747B85]'}`} />
                          {link.label}
                        </span>
                        <span className="flex items-center gap-2">
                          {link.to === '/compare' && trimIds.length > 0 && (
                            <span className="rounded-full bg-[#FF334B] px-2 py-0.5 text-xs font-bold text-white">
                              {trimIds.length}
                            </span>
                          )}
                          <ChevronRight className="h-4 w-4 text-[#747B85]" />
                        </span>
                      </span>
                    )}
                  </NavLink>
                )
              })}
            </div>
            <div className="flex items-center justify-between border-t border-[#242930] pt-4 text-xs text-[#747B85]">
              <span>HAVALGARAGE · снимок данных {fmtDate(CATALOG_FIXED_AT)}</span>
            </div>
          </nav>
        )}
      </header>

      {/* ======================= Контент ======================= */}
      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      {/* ======================= ПОДВАЛ (SiteFooter из HavalDesign) ======================= */}
      <footer className="w-full border-t border-[#242930] bg-[#0E1013] pb-8 pt-12 text-xs text-[#A2A7AF] print:hidden">
        <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            {/* Бренд и миссия */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FF334B] text-xs font-black text-white">
                  H
                </div>
                <span className="text-base font-extrabold tracking-tight text-[#F4F5F6]">
                  HAVAL<span className="text-[#FF334B]">GARAGE</span> 3.0
                </span>
              </div>
              <p className="text-xs leading-relaxed text-[#747B85]">
                Независимая цифровая платформа для изучения, точного сравнения и финансового планирования покупки
                автомобилей HAVAL.
              </p>
              <div className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" /> Цены сверены с прайс-листами haval.ru
              </div>
            </div>

            {/* Каталог и подбор */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#F4F5F6]">Каталог и подбор</h4>
              <ul className="space-y-1.5 text-xs">
                {FOOTER_LINKS.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="transition-colors hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Финансовые инструменты */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#F4F5F6]">Финансовые инструменты</h4>
              <ul className="space-y-1.5 text-xs">
                {FOOTER_FINANCE.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="transition-colors hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Официальные источники */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#F4F5F6]">Официальные первоисточники</h4>
              <ul className="space-y-1.5 text-xs">
                <li>
                  <a
                    href={HAVAL_PRICE_LISTS_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 transition-colors hover:text-white"
                  >
                    Каталоги и прайс-листы haval.ru <ExternalLink className="h-3 w-3 text-[#747B85]" />
                  </a>
                </li>
                <li>
                  <Link to="/sources" className="transition-colors hover:text-white">
                    Реестр документов и дат проверки
                  </Link>
                </li>
                <li>
                  <a
                    href={DEALER_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 transition-colors hover:text-white"
                  >
                    Данные дилера «АГАТ» (Екатеринбург) <ExternalLink className="h-3 w-3 text-[#747B85]" />
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Актуальность данных */}
          <div className="space-y-2 border-t border-[#1C2026] pt-6 text-[11px] leading-relaxed text-[#747B85]">
            <p>
              <strong className="text-[#A2A7AF]">HavalGarage — независимый информационный инструмент.</strong> Сервис
              не является официальным сайтом HAVAL, официальным дилером или банком. Цены, комплектации и
              характеристики берутся из официальных каталогов и прайс-листов haval.ru; данные дилера АГАТ
              (Екатеринбург) используются как вторичный источник и помечаются в интерфейсе. Расчёты являются
              математической симуляцией и не являются офертой, рекламой ставки или одобрением кредита — условия
              уточняйте у дилера и банков-партнёров.
            </p>
            <p>
              Данные каталога зафиксированы {fmtDate(CATALOG_FIXED_AT)}
              {lastCheck !== CATALOG_FIXED_AT
                ? ` · последняя успешная проверка источников ${fmtDate(lastCheck)}`
                : ''}
              . Автоматическое обновление в реальном времени не выполняется: каталог обновляется скриптами и ручной
              проверкой прайс-листов.
            </p>
            {catalogStale && (
              <p
                role="status"
                className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-400"
              >
                Снимку каталога {catalogAge ?? '—'} дн. — больше срока повторной проверки ({PRICE_STALE_AFTER_DAYS}{' '}
                дн.). Цены и условия могли измениться: перед решением сверьтесь с официальным прайс-листом haval.ru
                или у дилера.
              </p>
            )}
            <div className="flex flex-col items-center justify-between gap-2 pt-2 sm:flex-row">
              <span>© {new Date().getFullYear()} HAVALGARAGE. Платформа подбора и анализа.</span>
              <span>Не является официальным сайтом представительства HAVAL в РФ.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
