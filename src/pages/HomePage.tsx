import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Calculator,
  Scale,
  Wrench,
  PiggyBank,
  Wallet,
  Database,
  ShieldCheck,
  Zap,
  Sliders,
  FileText,
  Sparkles,
} from 'lucide-react'
import ModelCard from '../components/ModelCard'
import { Badge, Button, ButtonLink, Callout, Card, RangeInput, SectionTitle, Tag } from '../components/ui'
import {
  CATALOG_FIXED_AT,
  HAVAL_PRICE_LISTS_URL,
  MODELS,
  OFFICIAL_PRICE_COUNT,
  PRICE_HISTORY,
  modelSummary,
  pricedCurrentTrims,
} from '../data/haval'
import { fmtDate, fmtMoney } from '../utils/format'
import { estimateMonthlyPayment } from '../utils/payment-estimate'
import { assetUrl, useSeo } from '../utils/seo'
import { track } from '../utils/analytics'

/**
 * Главная страница HAVALGARAGE 3.0 — композиция HavalDesign (Hero +
 * экспресс-подбор + популярные модели + инструменты + актуальность данных).
 * Все числа берутся из реального слоя данных src/data/haval.
 */
export default function HomePage() {
  const navigate = useNavigate()
  const [budgetMax, setBudgetMax] = useState(3_500_000)
  const [desiredPayment, setDesiredPayment] = useState(45_000)

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

  const budgetRange = useMemo(() => {
    const min = stats.priceFrom ? Math.floor(stats.priceFrom / 50_000) * 50_000 : 1_500_000
    const max = stats.priceTo ? Math.ceil(stats.priceTo / 50_000) * 50_000 : 6_000_000
    return { min, max }
  }, [stats])

  /** Модели, подходящие под бюджет или желаемый платёж — по реальным ценам и ставкам программ */
  const quickMatches = useMemo(() => {
    const summaries = MODELS.map((m) => modelSummary(m.id)).filter((s) => s !== null && s.priceFrom !== null)
    return summaries
      .map((s) => {
        const fitPrice = (s!.priceFrom as number) <= budgetMax
        const est = estimateMonthlyPayment(s!.model.id, s!.priceFrom as number)
        const fitPayment = est ? est.monthly <= desiredPayment : false
        return { summary: s!, fit: fitPrice || fitPayment }
      })
      .filter((x) => x.fit)
      .map((x) => x.summary)
      .sort((a, b) => (a.priceFrom ?? 0) - (b.priceFrom ?? 0))
  }, [budgetMax, desiredPayment])

  const popular = useMemo(() => {
    const summaries = MODELS.map((m) => modelSummary(m.id)).filter((s) => s !== null && s.priceFrom !== null)
    return summaries
      .sort((a, b) => (b?.trims.length ?? 0) - (a?.trims.length ?? 0) || (a?.priceFrom ?? 0) - (b?.priceFrom ?? 0))
      .slice(0, 4)
      .map((s) => s!.model)
  }, [])

  const openFullBudget = () => {
    track('budget_search', { source: 'home-quick', payment: desiredPayment, budget: budgetMax })
    const params = new URLSearchParams({ payment: String(desiredPayment) })
    navigate(`/budget?${params.toString()}`)
  }

  return (
    <div className="animate-page-enter -mx-4 flex flex-col gap-14 pb-10 sm:-mx-6 lg:-mx-8 lg:gap-20">
      {/* ================= HERO ================= */}
      <section className="relative mt-4 mx-3 flex min-h-[520px] items-center justify-center overflow-hidden rounded-3xl border border-[#242930] bg-[#0E1013] sm:mx-6 lg:mx-8 lg:min-h-[640px]">
        <div className="absolute inset-0 z-0">
          <img
            src={assetUrl('/images/hero-haval-flagship.jpg')}
            alt="HAVAL — студийный кадр модельного ряда"
            fetchPriority="high"
            className="h-full w-full scale-105 object-cover object-center brightness-90"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B0C0E] via-[#0B0C0E]/75 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C0E] via-transparent to-[#0B0C0E]/40" />
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col justify-between px-6 py-12 md:px-10 md:py-20 lg:px-12">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex flex-wrap items-center gap-2">
              <Badge variant="red" size="md" icon={<Zap className="h-3.5 w-3.5" />}>
                HAVAL · официальный модельный ряд
              </Badge>
              <Badge variant="glass" size="md">
                {stats.models} моделей • {stats.trims} комплектаций
              </Badge>
            </div>

            <div className="space-y-2">
              <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-balance text-white sm:text-5xl lg:text-6xl">
                ВЫБЕРИ СВОЙ{' '}
                <span className="text-[#FF334B] drop-shadow-[0_0_30px_rgba(255,51,75,0.6)]">HAVAL</span>
              </h1>
              <p className="text-base font-normal leading-relaxed text-[#C2C7D0] sm:text-lg">
                Сравни комплектации по подтверждённым ценам прайс-листов haval.ru, рассчитай кредит по официальным
                программам и узнай реальную стоимость владения до поездки к дилеру.
              </p>
            </div>

            {/* Маркер цены модельного ряда — данные прайс-листа */}
            {stats.priceFrom !== null && (
              <div className="inline-flex items-center gap-4 rounded-2xl border border-white/10 bg-[#181B1F]/80 p-3.5 pr-6 shadow-xl backdrop-blur-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF334B]/20 text-[#FF334B]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[11px] font-medium text-[#A2A7AF]">
                    Модельный ряд — цена «от» по официальному прайс-листу
                  </div>
                  <div className="font-mono text-xl font-extrabold tabular-nums text-[#F4F5F6]">
                    {fmtMoney(stats.priceFrom)}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                variant="glow"
                size="lg"
                icon={<ArrowRight className="h-4 w-4" />}
                iconPosition="right"
                onClick={() => navigate('/catalog')}
              >
                Подобрать автомобиль
              </Button>
              <Button variant="secondary" size="lg" icon={<Scale className="h-4 w-4" />} onClick={() => navigate('/compare')}>
                Сравнить модели
              </Button>
              <Button variant="ghost" size="lg" onClick={() => navigate('/budget')}>
                Подбор по платежу
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= ЭКСПРЕСС-ПОДБОР ================= */}
      <section className="mx-4 sm:mx-6 lg:mx-8">
        <div className="glass-card relative overflow-hidden rounded-3xl border border-[#2B3037] p-6 shadow-2xl sm:p-8">
          <div className="flex flex-col items-start justify-between gap-4 border-b border-[#2B3037] pb-6 md:flex-row md:items-center">
            <div>
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-[#FF334B]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#FF334B]">Экспресс-подбор</span>
              </div>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#F4F5F6]">Подбор под ваш бюджет и платёж</h2>
            </div>
            <div className="text-xs text-[#A2A7AF]" role="status">
              Найдено подходящих моделей:{' '}
              <span className="font-mono text-sm font-bold text-white">{quickMatches.length}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 pt-6 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-xs">
                <span className="font-medium text-[#A2A7AF]">Максимальный бюджет (цена «от»):</span>
                <span className="whitespace-nowrap font-mono text-sm font-bold text-white">до {fmtMoney(budgetMax)}</span>
              </div>
              <RangeInput
                min={budgetRange.min}
                max={budgetRange.max}
                step={50_000}
                value={budgetMax}
                onChange={(e) => setBudgetMax(Number(e.target.value))}
                aria-label="Максимальный бюджет"
              />
              <div className="flex justify-between font-mono text-[11px] text-[#8A919B]">
                <span>{fmtMoney(budgetRange.min)}</span>
                <span>{fmtMoney(budgetRange.max)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-xs">
                <span className="font-medium text-[#A2A7AF]">
                  Желаемый платёж в месяц (по ставкам официальных программ):
                </span>
                <span className="whitespace-nowrap font-mono text-sm font-bold text-emerald-400">
                  ~ {fmtMoney(desiredPayment)}/мес
                </span>
              </div>
              <RangeInput
                min={20_000}
                max={150_000}
                step={5_000}
                value={desiredPayment}
                onChange={(e) => setDesiredPayment(Number(e.target.value))}
                aria-label="Желаемый ежемесячный платёж"
              />
              <div className="flex justify-between font-mono text-[11px] text-[#8A919B]">
                <span>20 000 ₽</span>
                <span>150 000 ₽</span>
              </div>
            </div>
          </div>

          {/* Результаты подбора */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#2B3037] pt-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-[#8A919B]">Подходят:</span>
              {quickMatches.length === 0 ? (
                <span className="text-xs text-[#A2A7AF]">нет подтверждённых моделей под эти условия</span>
              ) : (
                quickMatches.slice(0, 6).map((s) => (
                  <Link
                    key={s.model.id}
                    to={`/models/${s.model.slug}`}
                    className="rounded-lg border border-[#333A44] bg-[#20242A] px-3 py-1.5 text-xs font-medium text-[#F4F5F6] transition-all hover:border-[#FF334B]/50 hover:bg-[#2A3038]"
                  >
                    {s.model.name} <span className="ml-1 text-[#8A919B]">от {fmtMoney(s.priceFrom as number)}</span>
                  </Link>
                ))
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={openFullBudget}>
                Полный подбор по бюджету
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<ArrowRight className="h-3.5 w-3.5" />}
                iconPosition="right"
                onClick={() => navigate('/catalog')}
              >
                Смотреть в каталоге
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= ПОПУЛЯРНЫЕ МОДЕЛИ ================= */}
      <section className="mx-4 space-y-6 sm:mx-6 lg:mx-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#FF334B]">
              Модельный ряд официального каталога
            </div>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-[#F4F5F6] sm:text-3xl">
              Популярные автомобили HAVAL
            </h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={<ArrowRight className="h-3.5 w-3.5" />}
            iconPosition="right"
            onClick={() => navigate('/catalog')}
          >
            Весь модельный ряд ({stats.models})
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {popular.map((m) => (
            <ModelCard key={m.id} model={m} />
          ))}
        </div>
      </section>

      {/* ================= ИНСТРУМЕНТЫ ================= */}
      <section className="mx-4 space-y-6 sm:mx-6 lg:mx-8">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[#FF334B]">
            Инструменты для взвешенного решения
          </div>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-[#F4F5F6] sm:text-3xl">
            Все расчёты — до поездки к дилеру
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <FeatureCard
            to="/calculator"
            icon={<Calculator className="h-6 w-6" />}
            tone="red"
            title="Кредитный калькулятор"
            text="Аннуитетный платёж, взнос в ₽ или %, срок 1–120 мес, официальные кредитные программы с реальными ставками, график платежей и экспорт в PDF."
            cta="Рассчитать платёж"
          />
          <FeatureCard
            to="/compare"
            icon={<Scale className="h-6 w-6" />}
            tone="blue"
            title="Сравнение комплектаций"
            text="До трёх автомобилей бок о бок: цена, характеристики, оснащение по группам, платежи и стоимость перехода на следующую комплектацию."
            cta="Перейти к сравнению"
          />
          <FeatureCard
            to="/ownership"
            icon={<Wrench className="h-6 w-6" />}
            tone="emerald"
            title="Стоимость владения (TCO)"
            text="Топливо, ТО, страховка, налог, шины и шиномонтаж за выбранный период — с разделением подтверждённых значений и ваших оценок."
            cta="Оценить расходы"
          />
          <FeatureCard
            to="/plan"
            icon={<PiggyBank className="h-6 w-6" />}
            tone="violet"
            title="План накопления и покупки"
            text="Недостающая сумма, необходимое ежемесячное накопление, дата цели, сценарии с разным взносом и зачёт текущего авто в трейд-ин."
            cta="Составить план"
          />
          <FeatureCard
            to="/budget"
            icon={<Wallet className="h-6 w-6" />}
            tone="sky"
            title="Подбор по бюджету и платежу"
            text="Максимальный платёж, взнос, срок, тип кузова и минимальное оснащение — система подберёт комплектации с объяснением причин."
            cta="Подобрать автомобиль"
          />
          <FeatureCard
            to="/sources"
            icon={<Database className="h-6 w-6" />}
            tone="amber"
            title="Источники и история цен"
            text="Журнал проверок прайс-листов, даты фиксации, история изменений цен и статусы достоверности каждой комплектации."
            cta="Смотреть реестр"
          />
        </div>
      </section>

      {/* ================= АКТУАЛЬНОСТЬ ДАННЫХ ================= */}
      <section className="mx-4 sm:mx-6 lg:mx-8">
        <SectionTitle tip="Каждая цена привязана к первоисточнику и дате проверки. Если дата действия цены не опубликована, интерфейс показывает предупреждение вместо молчаливой подмены данных.">
          Актуальность данных
        </SectionTitle>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr]">
          <Card glass className="flex flex-col gap-2.5 rounded-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <FileText className="h-4 w-4 text-[#FF334B]" />
              <p className="text-[13px] font-bold text-[#F4F5F6]">Данные проверены {fmtDate(CATALOG_FIXED_AT)}</p>
              <Tag tone="success">{OFFICIAL_PRICE_COUNT} цен из официальных прайс-листов</Tag>
            </div>
            <ul className="flex flex-col gap-1.5 text-[12px] leading-relaxed text-[#A2A7AF]">
              <li>
                Основной источник —{' '}
                <a
                  className="underline decoration-[#2B3037] underline-offset-2 hover:text-[#F4F5F6]"
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
                Обновление — не в реальном времени: цены перепроверяются скриптами (<code>npm run update:prices</code>)
                и импортом прайс-листов (<code>npm run import:price-list</code>).
              </li>
            </ul>
            <ButtonLink to="/sources" variant="outline" size="sm" className="mt-1 self-start">
              Источники данных и история проверок
            </ButtonLink>
          </Card>

          <div className="flex flex-col gap-3">
            <Callout tone="warn" title="Независимый сервис">
              HavalGarage не является официальным сайтом HAVAL или официальным дилером. Цены и условия подтверждает
              первоисточник; расчёт кредита — математическая симуляция, а не оферта и не одобрение.
            </Callout>
            {PRICE_HISTORY.length > 0 && (
              <Card className="flex flex-col gap-1.5">
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#A2A7AF]">
                  <Zap className="h-3.5 w-3.5 text-[#FF334B]" /> Последняя проверка
                </p>
                <p className="text-[12px] leading-relaxed text-[#A2A7AF]">
                  {fmtDate(PRICE_HISTORY[PRICE_HISTORY.length - 1].checkedAt)} ·{' '}
                  {PRICE_HISTORY[PRICE_HISTORY.length - 1].summary.slice(0, 220)}…
                </p>
              </Card>
            )}
          </div>
        </div>

        <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-[#A2A7AF]">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FF334B]" />
          * Рекламные ставки кредитных программ (в том числе «от 0,01%») достигаются только при выполнении
          опубликованных условий: размер взноса, срок, сумма кредита и страхование КАСКО. Ограничения приведены в
          разделе{' '}
          <Link to="/programs" className="underline decoration-[#2B3037] underline-offset-2 hover:text-[#F4F5F6]">
            «Кредитные программы»
          </Link>
          .
        </p>
      </section>
    </div>
  )
}

const TONES = {
  red: 'bg-[#FF334B]/15 border-[#FF334B]/30 text-[#FF334B]',
  blue: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
  emerald: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
  violet: 'bg-purple-500/15 border-purple-500/30 text-purple-400',
  sky: 'bg-sky-500/15 border-sky-500/30 text-sky-400',
  amber: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
} as const

const CTA_TONES = {
  red: 'text-[#FF334B]',
  blue: 'text-blue-400',
  emerald: 'text-emerald-400',
  violet: 'text-purple-400',
  sky: 'text-sky-400',
  amber: 'text-amber-400',
} as const

function FeatureCard({
  to,
  icon,
  tone,
  title,
  text,
  cta,
}: {
  to: string
  icon: React.ReactNode
  tone: keyof typeof TONES
  title: string
  text: string
  cta: string
}) {
  return (
    <Link to={to} className="group glass-card glass-card-hover flex flex-col justify-between rounded-2xl border-[#2B3037] p-6">
      <div className="space-y-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl border ${TONES[tone]}`}
        >
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#F4F5F6] group-hover:text-white">{title}</h3>
          <p className="mt-2 text-xs leading-relaxed text-[#A2A7AF]">{text}</p>
        </div>
      </div>
      <div className={`flex items-center gap-1 pt-6 text-xs font-semibold transition-transform group-hover:translate-x-1 ${CTA_TONES[tone]}`}>
        {cta} <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  )
}
