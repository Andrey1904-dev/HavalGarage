import { Suspense, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigationType } from 'react-router-dom'
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
import { cn } from '../utils/cn'
import { useCompare } from '../context/CompareContext'
import { useSaved } from '../context/SavedContext'
import ErrorBoundary from './ErrorBoundary'
import { Spinner } from './ui'

/** Основная навигация шапки — реальные маршруты HavalGarage */
const HEADER_NAV = [
  { to: '/catalog', label: 'Модели', icon: Car, end: false },
  { to: '/trims', label: 'Комплектации', icon: Layers, end: false },
  { to: '/budget', label: 'Подбор', icon: Wallet, end: false },
  { to: '/compare', label: 'Сравнение', icon: Scale, end: false },
  { to: '/calculator', label: 'Кредит', icon: Calculator, end: false },
  { to: '/ownership', label: 'Владение', icon: Wrench, end: false },
  { to: '/plan', label: 'План покупки', short: 'План', icon: PiggyBank, end: false },
  { to: '/sources', label: 'Источники и цены', short: 'Источники', icon: FileCheck2, end: false },
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

/** Заглушка на время загрузки раздела (страницы подгружаются лениво) */
function RouteFallback() {
  return (
    <div className="flex min-h-[45dvh] flex-col items-center justify-center gap-3" role="status">
      <Spinner className="h-8 w-8" />
      <p className="text-xs text-[#A2A7AF]">Загрузка раздела…</p>
    </div>
  )
}

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigationType = useNavigationType()
  const { trimIds } = useCompare()
  const { favorites, calculations } = useSaved()

  // Закрытие мобильного меню при переходе и по Escape (доступность с клавиатуры)
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname, location.search])

  // Новая страница открывается сверху, а не с прокруткой предыдущей.
  // Смена только query-параметров (фильтры) и «назад/вперёд» позицию не трогают.
  useEffect(() => {
    if (navigationType !== 'POP') window.scrollTo(0, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- реагируем только на смену страницы
  }, [location.pathname])

  // Фокус на заголовок новой страницы (SPA-переход): иначе он остаётся на
  // нажатой ссылке в шапке (или теряется вместе с закрытым мобильным меню),
  // и скринридер не сообщает о смене страницы. Раздел грузится лениво, поэтому
  // ждём появления h1 — не дольше ~3 с, затем фокусируем сам <main>.
  const mainRef = useRef<HTMLElement>(null)
  // Сравнение с прошлым адресом, а не флаг «первый рендер»: StrictMode
  // запускает эффект монтирования дважды, и флаг сбрасывался бы сразу.
  const focusedPathRef = useRef(location.pathname)
  useEffect(() => {
    if (focusedPathRef.current === location.pathname) return
    focusedPathRef.current = location.pathname
    const main = mainRef.current
    if (!main) return
    let frame = 0
    let attempts = 0
    const focusHeading = () => {
      const heading = main.querySelector<HTMLElement>('h1')
      if (heading) {
        if (!heading.hasAttribute('tabindex')) {
          heading.setAttribute('tabindex', '-1')
          heading.addEventListener('blur', () => heading.removeAttribute('tabindex'), { once: true })
        }
        heading.focus({ preventScroll: true })
      } else if (attempts++ < 180) {
        frame = requestAnimationFrame(focusHeading)
      } else {
        main.focus({ preventScroll: true })
      }
    }
    frame = requestAnimationFrame(focusHeading)
    return () => cancelAnimationFrame(frame)
  }, [location.pathname])

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
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-xl focus:bg-[#E11D38] focus:px-3 focus:py-2 focus:text-[13px] focus:font-bold focus:text-white"
      >
        К основному содержимому
      </a>

      {/* ======================= ШАПКА (SiteHeader из HavalDesign) ======================= */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#181B1F]/75 backdrop-blur-[16px]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 xl:gap-4">
          {/* Бренд: на узких телефонах (<400px) подпись скрыта, чтобы кнопки
              справа помещались в 360px, а не уезжали за край экрана */}
          {/* Имя ссылки — видимый текст (WCAG 2.5.3 «Label in Name») + скрытое «на главную» */}
          <Link to="/" className="group flex min-w-0 select-none items-center gap-2.5 sm:gap-3">
            <div
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF334B] to-[#990014] shadow-lg shadow-[#FF334B]/20 transition-all duration-300 group-hover:shadow-[#FF334B]/40"
            >
              <span className="text-sm font-extrabold tracking-tighter text-white">H</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="whitespace-nowrap text-lg font-extrabold leading-tight tracking-tight text-[#F4F5F6] group-hover:text-white">
                  HAVAL<span className="text-[#FF334B]">GARAGE</span>
                </span>
                <span className="shrink-0 rounded border border-[#FF334B]/30 bg-[#FF334B]/20 px-1.5 py-0.5 text-[11px] font-bold leading-none text-[#FF6B7E]">
                  3.0
                </span>
              </div>
              <div className="hidden items-center gap-1 text-[11px] leading-tight text-[#8A919B] min-[400px]:flex">
                <ShieldCheck className="h-3 w-3 shrink-0 text-emerald-400" aria-hidden="true" />
                {/* Без truncate: при пользовательских интервалах текста (WCAG 1.4.12)
                    слоган переносится, а не обрезается */}
                <span>Официальные прайс-листы haval.ru</span>
              </div>
              <span className="sr-only">, на главную</span>
            </div>
          </Link>

          {/* Десктопная навигация: пункты не переносятся и не сжимают иконки,
              длинные подписи сокращены (полные — в title и мобильном меню) */}
          <nav className="hidden min-w-0 items-center gap-0.5 xl:flex" aria-label="Основная навигация">
            {HEADER_NAV.map((link) => {
              const Icon = link.icon
              return (
                <NavLink key={link.to} to={link.to} end={link.end} title={link.short ? link.label : undefined}>
                  {({ isActive }) => (
                    <span
                      className={cn(
                        'relative flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border px-2 py-1.5 text-xs font-medium transition-all duration-150',
                        isActive
                          ? 'border-[#333A44] bg-[#20242A] text-white shadow-sm'
                          : link.highlight
                            ? 'border-transparent text-[#FF6B7E] hover:bg-white/5 hover:text-white'
                            : 'border-transparent text-[#A2A7AF] hover:bg-white/5 hover:text-[#F4F5F6]',
                      )}
                    >
                      <Icon className={cn('h-3.5 w-3.5 shrink-0', isActive && 'text-[#FF334B]')} aria-hidden="true" />
                      <span>{link.short ?? link.label}</span>
                      {link.to === '/compare' && trimIds.length > 0 && (
                        <span className="rounded-full bg-[#E11D38] px-1.5 py-px text-[11px] font-bold leading-4 text-white">
                          <span aria-hidden="true">{trimIds.length}</span>
                          <span className="sr-only">(выбрано: {trimIds.length})</span>
                        </span>
                      )}
                    </span>
                  )}
                </NavLink>
              )
            })}
          </nav>

          {/* Правые действия */}
          <div className="flex shrink-0 items-center gap-2">
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
                          <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#FF334B]' : 'text-[#8A919B]'}`} aria-hidden="true" />
                          {link.label}
                        </span>
                        <span className="flex items-center gap-2">
                          {link.to === '/compare' && trimIds.length > 0 && (
                            <span className="rounded-full bg-[#E11D38] px-2 py-0.5 text-xs font-bold text-white">
                              <span aria-hidden="true">{trimIds.length}</span>
                              <span className="sr-only">(выбрано: {trimIds.length})</span>
                            </span>
                          )}
                          <ChevronRight className="h-4 w-4 text-[#8A919B]" />
                        </span>
                      </span>
                    )}
                  </NavLink>
                )
              })}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-[#242930] pt-4 text-xs text-[#8A919B]">
              <span>HAVALGARAGE · снимок данных {fmtDate(CATALOG_FIXED_AT)}</span>
            </div>
          </nav>
        )}
      </header>

      {/* ======================= Контент ======================= */}
      <main
        id="main"
        ref={mainRef}
        tabIndex={-1}
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8"
      >
        {/* Граница ошибок и Suspense внутри макета: шапка и подвал остаются на месте,
            пока грузится раздел или если он упал; ключ сбрасывает ошибку при переходе */}
        <ErrorBoundary key={location.pathname}>
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* ======================= ПОДВАЛ (SiteFooter из HavalDesign) ======================= */}
      <footer className="w-full border-t border-[#242930] bg-[#0E1013] pb-8 pt-12 text-xs text-[#A2A7AF] print:hidden">
        <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            {/* Бренд и миссия */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E11D38] text-xs font-extrabold text-white"
                  aria-hidden="true"
                >
                  H
                </div>
                <span className="text-base font-extrabold tracking-tight text-[#F4F5F6]">
                  HAVAL<span className="text-[#FF334B]">GARAGE</span> 3.0
                </span>
              </div>
              <p className="text-xs leading-relaxed text-[#8A919B]">
                Независимая цифровая платформа для изучения, точного сравнения и финансового планирования покупки
                автомобилей HAVAL.
              </p>
              <div className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" /> Цены сверены с прайс-листами haval.ru
              </div>
            </div>

            {/* Каталог и подбор */}
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#F4F5F6]">Каталог и подбор</h2>
              <ul className="space-y-1 text-xs">
                {FOOTER_LINKS.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="inline-flex min-h-6 items-center transition-colors hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Финансовые инструменты */}
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#F4F5F6]">Финансовые инструменты</h2>
              <ul className="space-y-1 text-xs">
                {FOOTER_FINANCE.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="inline-flex min-h-6 items-center transition-colors hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Официальные источники */}
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#F4F5F6]">Официальные первоисточники</h2>
              <ul className="space-y-1 text-xs">
                <li>
                  <a
                    href={HAVAL_PRICE_LISTS_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-6 items-center gap-1 transition-colors hover:text-white"
                  >
                    Каталоги и прайс-листы haval.ru <ExternalLink className="h-3 w-3 text-[#8A919B]" />
                  </a>
                </li>
                <li>
                  <Link to="/sources" className="inline-flex min-h-6 items-center transition-colors hover:text-white">
                    Реестр документов и дат проверки
                  </Link>
                </li>
                <li>
                  <a
                    href={DEALER_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-6 items-center gap-1 transition-colors hover:text-white"
                  >
                    Данные дилера «АГАТ» (Екатеринбург) <ExternalLink className="h-3 w-3 text-[#8A919B]" />
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Актуальность данных */}
          <div className="space-y-2 border-t border-[#1C2026] pt-6 text-[11px] leading-relaxed text-[#8A919B]">
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
              {/* Дата уже заканчивается на «г.» — отдельная точка давала «г..» */}{' '}
              Автоматическое обновление в реальном времени не выполняется: каталог обновляется скриптами и ручной
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
