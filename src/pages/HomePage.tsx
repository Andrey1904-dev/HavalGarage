import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ModelCard from '../components/ModelCard'
import { Button, Callout, Card, Field, SectionTitle, StatTile, Tag } from '../components/ui'
import {
  CalendarIcon,
  CardIcon,
  ChartIcon,
  CompareIcon,
  GaugeIcon,
  SavingsIcon,
  SearchIcon,
  SparklesIcon,
  TargetIcon,
  TradeInIcon,
} from '../components/icons'
import {
  CATALOG_FIXED_AT,
  HAVAL_PRICE_LISTS_URL,
  MODELS,
  OFFICIAL_PRICE_COUNT,
  PRICE_HISTORY,
  modelSummary,
  pricedCurrentTrims,
} from '../data/haval'
import { fmtDate, fmtMoney, parseLocaleNumber } from '../utils/format'
import { TERM_OPTIONS } from '../utils/credit'
import { maxAffordablePrice } from '../utils/budget'
import { assetUrl, useSeo } from '../utils/seo'
import { track } from '../utils/analytics'

/**
 * Главная страница: возможности сервиса, быстрый подбор по бюджету,
 * популярные модели, переход к сравнению, калькуляторы и актуальность данных.
 */
export default function HomePage() {
  const navigate = useNavigate()
  const [payment, setPayment] = useState('45000')
  const [down, setDown] = useState('400000')
  const [term, setTerm] = useState(60)
  const [rate, setRate] = useState('16,4')

  useSeo({
    title: 'HAVAL Гараж — каталог, кредитный калькулятор и подбор автомобиля по бюджету',
    description:
      'Все модели HAVAL из официального каталога haval.ru: цены и комплектации по официальным прайс-листам, ' +
      'кредитный калькулятор, подбор автомобиля по ежемесячному платежу, сравнение комплектаций, ' +
      'стоимость владения и план накопления на первоначальный взнос.',
    path: '/',
    image: '/images/models/f7.webp',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'HAVAL Гараж',
      description:
        'Независимый информационный сервис: каталог HAVAL, кредитный калькулятор и подбор автомобиля по бюджету.',
      inLanguage: 'ru-RU',
    },
  })

  const paymentNum = parseLocaleNumber(payment)
  const downNum = parseLocaleNumber(down) || 0
  const rateNum = parseLocaleNumber(rate) || 0

  const affordable = useMemo(() => {
    if (!(paymentNum > 0) || !(term > 0)) return null
    return maxAffordablePrice(paymentNum, downNum, term, rateNum)
  }, [paymentNum, downNum, term, rateNum])

  const popular = useMemo(() => {
    const summaries = MODELS.map((m) => modelSummary(m.id)).filter((s) => s !== null && s.priceFrom !== null)
    return summaries
      .sort((a, b) => (b?.trims.length ?? 0) - (a?.trims.length ?? 0) || (a?.priceFrom ?? 0) - (b?.priceFrom ?? 0))
      .slice(0, 4)
      .map((s) => s!.model)
  }, [])

  const stats = useMemo(() => {
    const trims = pricedCurrentTrims()
    const prices = trims.map((t) => t.basePrice as number)
    return {
      models: MODELS.filter((m) => m.priceListUrl !== null).length,
      trims: trims.length,
      priceFrom: prices.length > 0 ? Math.min(...prices) : null,
      priceTo: prices.length > 0 ? Math.max(...prices) : null,
    }
  }, [])

  const submitQuickBudget = (e: React.FormEvent) => {
    e.preventDefault()
    if (!(paymentNum > 0)) return
    track('budget_search', { source: 'home-quick', payment: Math.round(paymentNum), term, rate: rateNum })
    const params = new URLSearchParams({
      payment: String(Math.round(paymentNum)),
      down: String(Math.round(downNum)),
      term: String(term),
      rate: String(rateNum).replace('.', ','),
    })
    navigate(`/budget?${params.toString()}`)
  }

  return (
    <div className="animate-page-enter flex flex-col gap-2">
      {/* ---------------- Хиро ---------------- */}
      <section className="relative overflow-hidden rounded-[14px] border border-[#363B43]/85 bg-[#1A1D22]">
        <div className="absolute inset-0" aria-hidden="true">
          <img src={assetUrl('/images/models/f7.webp')} alt="" className="h-full w-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0E1013] via-[#0E1013]/82 to-[#0E1013]/30" />
        </div>

        <div className="relative grid grid-cols-1 gap-6 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1.15fr_1fr]">
          <div className="flex flex-col gap-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#E4002B]">
              Независимый расчётный сервис · данные haval.ru
            </p>
            <h1 className="font-display-num max-w-xl text-[28px] font-bold uppercase leading-[1.08] tracking-wide text-[#F3F4F4] sm:text-[40px]">
              Какой HAVAL <span className="text-[#A9AFB7]">вам по бюджету</span>
            </h1>
            <p className="max-w-lg text-[13px] leading-relaxed text-[#A9AFB7]">
              Каталог всех моделей официального каталога haval.ru с ценами из прайс-листов производителя.
              Рассчитайте кредит, подберите автомобиль по ежемесячному платежу, сравните комплектации по оснащению
              и посчитайте полную стоимость владения — без выдуманных цен и тарифов.
            </p>

            <div className="flex flex-wrap gap-2.5">
              <Link to="/budget">
                <Button type="button">
                  <SearchIcon className="h-4 w-4" /> Подобрать по бюджету
                </Button>
              </Link>
              <Link to="/catalog">
                <Button type="button" variant="secondary">
                  Каталог моделей
                </Button>
              </Link>
              <Link to="/compare">
                <Button type="button" variant="ghost">
                  <CompareIcon className="h-4 w-4" /> Сравнить комплектации
                </Button>
              </Link>
            </div>

            <dl className="mt-1 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <StatTile label="Моделей" value={stats.models} hint="по официальному каталогу" />
              <StatTile label="Комплектаций" value={stats.trims} hint="с подтверждённой ценой" />
              <StatTile
                label="Цена от"
                value={stats.priceFrom ? fmtMoney(stats.priceFrom) : '—'}
                hint="МЦП по прайс-листу"
                tone="accent"
              />
              <StatTile
                label="Цена до"
                value={stats.priceTo ? fmtMoney(stats.priceTo) : '—'}
                hint="максимум по ряду"
              />
            </dl>
          </div>

          {/* ---------------- Быстрый подбор ---------------- */}
          <Card className="flex flex-col gap-3.5 self-start bg-[#0E1013]/85 backdrop-blur">
            <div className="flex items-center gap-2">
              <TargetIcon className="h-4 w-4 text-[#E4002B]" />
              <h2 className="font-display-num text-[15px] font-bold uppercase tracking-wide">Быстрый подбор</h2>
            </div>

            <form onSubmit={submitQuickBudget} className="flex flex-col gap-3">
              <Field
                label="Комфортный платёж в месяц"
                suffix="₽"
                inputMode="numeric"
                value={payment}
                onChange={(e) => setPayment(e.target.value)}
              />
              <Field
                label="Первоначальный взнос"
                suffix="₽"
                inputMode="numeric"
                value={down}
                onChange={(e) => setDown(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-[12.5px] font-semibold text-[#A9AFB7]">Срок</span>
                  <select
                    className="min-h-[46px] w-full rounded-[10px] border border-[#363B43] bg-[#23272D] px-3 text-[14px] font-semibold text-[#F3F4F4] outline-none focus:border-[#E4002B]"
                    value={term}
                    onChange={(e) => setTerm(Number(e.target.value))}
                  >
                    {TERM_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t} мес
                      </option>
                    ))}
                  </select>
                </label>
                <Field
                  label="Ставка"
                  suffix="%"
                  inputMode="decimal"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                />
              </div>

              <div className="rounded-[10px] border border-[#363B43] bg-[#1A1D22] px-3.5 py-3">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#A9AFB7]">
                  Ориентировочный бюджет на автомобиль
                </p>
                <p className="font-display-num mt-1 text-[26px] font-bold leading-none text-[#F3F4F4]">
                  {affordable ? fmtMoney(affordable) : '—'}
                </p>
                <p className="mt-1.5 text-[10.5px] leading-relaxed text-[#A9AFB7]">
                  Взнос {fmtMoney(downNum)} + сумма кредита при ставке {String(rateNum).replace('.', ',')}% на {term} мес.
                  Расчёт предварительный и не является одобрением кредита.
                </p>
              </div>

              <Button type="submit" disabled={!(paymentNum > 0)}>
                Показать подходящие модели <SearchIcon className="h-4 w-4" />
              </Button>
            </form>
          </Card>
        </div>
      </section>

      {/* ---------------- Возможности ---------------- */}
      <SectionTitle tip="Все расчёты выполняются детерминированными формулами аннуитета и проверяются модульными тестами. Никаких «приблизительных» чисел от модели — только арифметика.">
        Что умеет сервис
      </SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          icon={<CardIcon className="h-4 w-4" />}
          title="Кредитный калькулятор"
          text="Аннуитетный платёж, взнос в ₽ или %, срок 1–120 мес, ставка, подтверждённые скидки, доп. расходы, график платежей."
          to="/calculator"
          cta="Рассчитать кредит"
        />
        <FeatureCard
          icon={<SearchIcon className="h-4 w-4" />}
          title="Подбор по бюджету"
          text="Максимальный платёж, взнос, срок, тип кузова, привод и минимальные функции — система подберёт модели и комплектации с объяснением причин."
          to="/budget"
          cta="Подобрать автомобиль"
        />
        <FeatureCard
          icon={<CompareIcon className="h-4 w-4" />}
          title="Сравнение комплектаций"
          text="До трёх автомобилей: цена, характеристики, оснащение по группам, кредитные платежи и стоимость перехода на следующую комплектацию."
          to="/compare"
          cta="Сравнить"
        />
        <FeatureCard
          icon={<GaugeIcon className="h-4 w-4" />}
          title="Стоимость владения"
          text="Топливо, ТО, страховка, налог, шины, шиномонтаж и прочие расходы за выбранный период — с разделением подтверждённых значений и ваших оценок."
          to="/ownership"
          cta="Посчитать владение"
        />
        <FeatureCard
          icon={<SavingsIcon className="h-4 w-4" />}
          title="План покупки и накопления"
          text="Недостающая сумма, необходимое ежемесячное накопление, дата цели и сценарии покупки с разным взносом и платежом."
          to="/plan"
          cta="Составить план"
        />
        <FeatureCard
          icon={<TradeInIcon className="h-4 w-4" />}
          title="Трейд-ин и обратный расчёт взноса"
          text="Чистая сумма от продажи текущего автомобиля и ответ на вопрос «какой взнос нужен, чтобы платить меньше»."
          to="/plan?tab=trade-in"
          cta="Рассчитать взнос"
        />
      </div>

      {/* ---------------- Популярные модели ---------------- */}
      <SectionTitle
        tip="Популярные — модели с наибольшим числом комплектаций в официальном каталоге (при равенстве — с меньшей ценой «от»)."
        action={
          <Link to="/catalog" className="text-[12px] font-bold text-[#A9AFB7] transition-colors hover:text-[#F3F4F4]">
            Весь каталог →
          </Link>
        }
      >
        Популярные модели
      </SectionTitle>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {popular.map((m) => (
          <ModelCard key={m.id} model={m} />
        ))}
      </div>

      {/* ---------------- Актуальность данных ---------------- */}
      <SectionTitle tip="Каждая цена привязана к первоисточнику и дате проверки. Если дата действия цены не опубликована, интерфейс показывает предупреждение вместо молчаливой подмены данных.">
        Актуальность данных
      </SectionTitle>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr]">
        <Card className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-[#E4002B]" />
            <p className="text-[13px] font-bold text-[#F3F4F4]">Данные проверены {fmtDate(CATALOG_FIXED_AT)}</p>
            <Tag tone="success">{OFFICIAL_PRICE_COUNT} цен из официальных прайс-листов</Tag>
          </div>
          <ul className="flex flex-col gap-1.5 text-[12px] leading-relaxed text-[#A9AFB7]">
            <li>
              Основной источник —{' '}
              <a
                className="underline decoration-[#363B43] underline-offset-2 hover:text-[#F3F4F4]"
                href={HAVAL_PRICE_LISTS_URL}
                target="_blank"
                rel="noreferrer"
                onClick={() => track('official_source_click', { source: 'home', url: HAVAL_PRICE_LISTS_URL })}
              >
                каталоги и прайс-листы haval.ru
              </a>{' '}
              (PDF «Максимальная цена перепродажи»).
            </li>
            <li>
              Характеристики, оснащение, цвета и размеры колёс перенесены из тех же документов; неизвестные значения
              помечены как «нет данных».
            </li>
            <li>
              Обновление — не в реальном времени: цены перепроверяются скриптами (<code>npm run update:prices</code>) и
              импортом прайс-листов (<code>npm run import:price-list</code>).
            </li>
          </ul>
          <Link to="/sources" className="mt-1">
            <Button type="button" variant="secondary" className="min-h-[40px]">
              Источники данных и история проверок
            </Button>
          </Link>
        </Card>

        <div className="flex flex-col gap-3">
          <Callout tone="warn" title="Независимый сервис">
            HavalGarage не является официальным сайтом HAVAL или официальным дилером. Цены и условия подтверждает
            первоисточник; расчёт кредита — математическая симуляция, а не оферта и не одобрение.
          </Callout>
          {PRICE_HISTORY.length > 0 && (
            <Card className="flex flex-col gap-1.5">
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#A9AFB7]">
                <ChartIcon className="h-3.5 w-3.5 text-[#E4002B]" /> Последняя проверка
              </p>
              <p className="text-[12px] leading-relaxed text-[#A9AFB7]">
                {fmtDate(PRICE_HISTORY[PRICE_HISTORY.length - 1].checkedAt)} ·{' '}
                {PRICE_HISTORY[PRICE_HISTORY.length - 1].summary.slice(0, 220)}…
              </p>
            </Card>
          )}
        </div>
      </div>

      <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-[#A9AFB7]">
        <SparklesIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#E4002B]" />
        * Рекламные ставки кредитных программ (в том числе «от 0,01%») достигаются только при выполнении опубликованных
        условий: размер взноса, срок, сумма кредита и страхование КАСКО. Ограничения приведены в разделе{' '}
        <Link to="/programs" className="underline decoration-[#363B43] underline-offset-2 hover:text-[#F3F4F4]">
          «Кредитные программы»
        </Link>
        .
      </p>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  text,
  to,
  cta,
}: {
  icon: React.ReactNode
  title: string
  text: string
  to: string
  cta: string
}) {
  return (
    <Link
      to={to}
      className="hover-lift group flex flex-col gap-2 rounded-[10px] border border-[#363B43]/85 bg-[#1A1D22] p-4"
    >
      <span className="flex items-center gap-2 text-[#E4002B]">
        {icon}
        <span className="font-display-num text-[14.5px] font-bold uppercase tracking-wide text-[#F3F4F4]">{title}</span>
      </span>
      <p className="flex-1 text-[12px] leading-relaxed text-[#A9AFB7]">{text}</p>
      <span className="text-[12px] font-bold text-[#A9AFB7] transition-colors group-hover:text-[#E4002B]">{cta} →</span>
    </Link>
  )
}
