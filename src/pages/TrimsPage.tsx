import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Button,
  Callout,
  Card,
  Checkbox,
  EmptyState,
  Field,
  SectionTitle,
  Select,
  Tag,
} from '../components/ui'
import { CompareToggle, FavoriteButton } from '../components/ActionButtons'
import { SearchIcon } from '../components/icons'
import {
  CATALOG_FIXED_AT,
  MODELS,
  TRIMS,
  getModel,
  trimDetails,
  trimHasFeature,
  type HavalModel,
  type Trim,
} from '../data/haval'
import { annuityPayment } from '../utils/loan'
import { fmtDate, fmtMoney, parseLocaleNumber } from '../utils/format'
import { useSeo } from '../utils/seo'
import { track } from '../utils/analytics'
import { downloadCsv } from '../utils/export-data'

/**
 * Каталог комплектаций.
 *
 * Отличается от /catalog: там фильтруются модели, здесь — конкретные
 * комплектации со всеми фильтрами, работающими совместно (модель, цена,
 * мощность, двигатель, коробка, привод, модельный год, обязательные функции).
 *
 * Фильтры живут в query-параметрах: ссылкой можно поделиться, а бесконечное
 * число комбинаций в поиск не попадает — canonical ведёт на /trims.
 */
type SortMode = 'price-asc' | 'price-desc' | 'power-desc' | 'payment-asc' | 'name'

const SORT_LABELS: Array<[SortMode, string]> = [
  ['price-asc', 'цена ↑'],
  ['price-desc', 'цена ↓'],
  ['power-desc', 'мощность ↓'],
  ['payment-asc', 'платёж ↑'],
  ['name', 'название'],
]

const GEARBOXES = [
  { value: 'any', label: 'Любая коробка' },
  { value: 'mt', label: 'Механика (МКП)' },
  { value: 'at', label: 'Автомат (АКП)' },
  { value: 'dct', label: 'Робот (DCT)' },
]

const DRIVETRAINS = [
  { value: 'any', label: 'Любой привод' },
  { value: 'fwd', label: 'Передний (2WD)' },
  { value: 'awd', label: 'Полный (4WD)' },
]

const ENGINE_TYPES = [
  { value: 'any', label: 'Любой двигатель' },
  { value: 'petrol', label: 'Бензин' },
  { value: 'diesel', label: 'Дизель' },
  { value: 'hybrid', label: 'Гибрид' },
]

const gearboxOf = (trim: Trim): string => {
  const t = `${trim.transmission} ${trim.name}`.toLowerCase()
  if (/робот|dct/.test(t)) return 'dct'
  if (/механ|мкп|\bmt\b|мт/.test(t)) return 'mt'
  if (/автомат|акп|\bat\b|ат/.test(t)) return 'at'
  return 'other'
}

const engineTypeOf = (trim: Trim): string => {
  const t = `${trim.engine} ${trim.name} ${trim.specifications?.fuel ?? ''}`.toLowerCase()
  if (/дизел/.test(t)) return 'diesel'
  if (/гибрид|электр/.test(t)) return 'hybrid'
  if (/бензин/.test(t)) return 'petrol'
  return 'unknown'
}

const isAwd = (trim: Trim): boolean => /полн|4wd|4x4/i.test(`${trim.drivetrain} ${trim.name}`)

export default function TrimsPage() {
  const [params, setParams] = useSearchParams()

  const modelId = params.get('model') ?? 'all'
  const priceMin = params.get('priceMin') ?? ''
  const priceMax = params.get('priceMax') ?? ''
  const powerMin = params.get('powerMin') ?? ''
  const engine = params.get('engine') ?? 'any'
  const gearbox = params.get('gearbox') ?? 'any'
  const drive = params.get('drive') ?? 'any'
  const modelYear = params.get('year') ?? 'any'
  const feature = params.get('feature') ?? ''
  const includeArchive = params.get('archive') === '1'
  const sort = (params.get('sort') ?? 'price-asc') as SortMode

  // параметры кредита для сортировки по платежу: 20% взноса, 60 мес., 16,4% —
  // значения заданы явно, чтобы сортировка была детерминированной и объяснимой
  const paymentTerm = 60
  const paymentRate = 16.4
  const downPaymentPct = 20

  useSeo({
    title: 'Каталог комплектаций HAVAL — цены, двигатели, привод и оснащение',
    description:
      'Все комплектации HAVAL из официальных прайс-листов: фильтры по модели, цене, мощности, типу двигателя, ' +
      'коробке передач, приводу и модельному году работают совместно. Сортировка по цене, мощности и ежемесячному платежу.',
    path: '/trims',
    noindex: true,
  })

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value === null || value === '') next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const availableYears = useMemo(
    () => [...new Set(TRIMS.map((t) => t.modelYear).filter((y): y is number => y !== null))].sort((a, b) => b - a),
    [],
  )

  const filtered = useMemo(() => {
    const min = parseLocaleNumber(priceMin)
    const max = parseLocaleNumber(priceMax)
    const power = parseLocaleNumber(powerMin)

    const list = TRIMS.filter((t) => {
      if (t.status === 'archive' && !includeArchive) return false
      if (modelId !== 'all' && t.modelId !== modelId) return false
      if (t.basePrice === null) return false
      if (Number.isFinite(min) && t.basePrice < min) return false
      if (Number.isFinite(max) && t.basePrice > max) return false
      if (Number.isFinite(power) && (t.horsepower ?? 0) < power) return false
      if (engine !== 'any' && engineTypeOf(t) !== engine) return false
      if (gearbox !== 'any' && gearboxOf(t) !== gearbox) return false
      if (drive === 'awd' && !isAwd(t)) return false
      if (drive === 'fwd' && isAwd(t)) return false
      if (modelYear !== 'any' && String(t.modelYear ?? '') !== modelYear) return false
      if (feature.trim() && !trimHasFeature(t.id, feature)) return false
      return true
    })

    const payment = (t: Trim): number => {
      const price = t.basePrice ?? 0
      const creditAmount = Math.max(0, price - (price * downPaymentPct) / 100)
      return creditAmount > 0 ? annuityPayment(creditAmount, paymentRate, paymentTerm) : 0
    }

    const sorted = [...list]
    switch (sort) {
      case 'price-desc':
        sorted.sort((a, b) => (b.basePrice ?? 0) - (a.basePrice ?? 0))
        break
      case 'power-desc':
        sorted.sort((a, b) => (b.horsepower ?? -1) - (a.horsepower ?? -1))
        break
      case 'payment-asc':
        sorted.sort((a, b) => payment(a) - payment(b))
        break
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
        break
      case 'price-asc':
      default:
        sorted.sort((a, b) => (a.basePrice ?? 0) - (b.basePrice ?? 0))
    }
    return sorted
  }, [modelId, priceMin, priceMax, powerMin, engine, gearbox, drive, modelYear, feature, includeArchive, sort])

  const activeFilters = [
    modelId !== 'all' && `модель: ${getModel(modelId)?.name ?? modelId}`,
    priceMin && `цена от ${priceMin}`,
    priceMax && `цена до ${priceMax}`,
    powerMin && `мощность от ${powerMin} л.с.`,
    engine !== 'any' && `двигатель: ${ENGINE_TYPES.find((e) => e.value === engine)?.label.toLowerCase()}`,
    gearbox !== 'any' && `коробка: ${GEARBOXES.find((g) => g.value === gearbox)?.label.toLowerCase()}`,
    drive !== 'any' && `привод: ${DRIVETRAINS.find((d) => d.value === drive)?.label.toLowerCase()}`,
    modelYear !== 'any' && `модельный год: ${modelYear}`,
    feature.trim() && `функция: «${feature.trim()}»`,
    includeArchive && 'с учётом архивных позиций',
  ].filter(Boolean) as string[]

  const resetAll = () => setParams(new URLSearchParams(), { replace: true })

  const exportCsv = () => {
    const rows = filtered.map((t) => {
      const d = trimDetails(t.id)
      const model = getModel(t.modelId)
      const price = t.basePrice ?? 0
      const creditAmount = Math.max(0, price - (price * downPaymentPct) / 100)
      return [
        model?.name ?? t.modelId,
        t.name,
        t.modelYear ?? '',
        t.productionYear ?? '',
        t.engine,
        t.horsepower ?? '',
        t.transmission,
        t.drivetrain,
        price,
        Math.round(annuityPayment(creditAmount, paymentRate, paymentTerm)),
        d?.consumption?.combined ?? '',
        t.status === 'archive' ? 'архив' : 'актуально',
        t.priceSourceUrl,
      ]
    })
    downloadCsv(
      'haval-trims.csv',
      [
        'Модель',
        'Комплектация',
        'Модельный год',
        'Год производства',
        'Двигатель',
        'Мощность, л.с.',
        'Коробка',
        'Привод',
        'Цена, ₽',
        `Платёж, ₽ (${downPaymentPct}% взнос, ${paymentTerm} мес., ${paymentRate}%)`,
        'Расход, л/100 км',
        'Статус',
        'Источник',
      ],
      rows,
    )
    track('export_csv', { section: 'trims', rows: rows.length })
  }

  return (
    <div className="animate-page-enter flex flex-col gap-2">
      <header className="flex flex-col gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#E4002B]">
          Официальные прайс-листы · проверка {fmtDate(CATALOG_FIXED_AT)}
        </p>
        <h1 className="font-display-num text-[26px] font-bold uppercase tracking-wide text-[#F3F4F4] sm:text-[32px]">
          Каталог комплектаций
        </h1>
        <p className="max-w-3xl text-[12.5px] leading-relaxed text-[#A9AFB7]">
          Все комплектации из официальных прайс-листов HAVAL. Фильтры применяются совместно: например, можно
          отобрать полноприводные бензиновые комплектации мощностью от 190 л.с. с адаптивным круиз-контролем.
          Цена — максимальная цена перепродажи (МЦП); выгоды по трейд-ин и спецпрограммам хранятся отдельно
          и не вычитаются автоматически.
        </p>
      </header>

      {/* ---------------- Фильтры ---------------- */}
      <Card className="p-3.5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="Модель" value={modelId} onChange={(e) => setParam('model', e.target.value === 'all' ? null : e.target.value)}>
            <option value="all">Все модели</option>
            {MODELS.map((m: HavalModel) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
          <Field
            label="Цена от, ₽"
            inputMode="numeric"
            placeholder="2 000 000"
            value={priceMin}
            onChange={(e) => setParam('priceMin', e.target.value)}
          />
          <Field
            label="Цена до, ₽"
            inputMode="numeric"
            placeholder="3 500 000"
            value={priceMax}
            onChange={(e) => setParam('priceMax', e.target.value)}
          />
          <Field
            label="Мощность от, л.с."
            inputMode="numeric"
            placeholder="190"
            value={powerMin}
            onChange={(e) => setParam('powerMin', e.target.value)}
          />
          <Select label="Двигатель" value={engine} onChange={(e) => setParam('engine', e.target.value)}>
            {ENGINE_TYPES.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </Select>
          <Select label="Коробка передач" value={gearbox} onChange={(e) => setParam('gearbox', e.target.value)}>
            {GEARBOXES.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </Select>
          <Select label="Привод" value={drive} onChange={(e) => setParam('drive', e.target.value)}>
            {DRIVETRAINS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </Select>
          <Select label="Модельный год" value={modelYear} onChange={(e) => setParam('year', e.target.value)}>
            <option value="any">Любой год</option>
            {availableYears.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </Select>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label="Обязательная функция"
            placeholder="например: адаптивный круиз, камера 360, подогрев руля"
            value={feature}
            onChange={(e) => setParam('feature', e.target.value)}
          />
          <div className="flex flex-col justify-end gap-2">
            <Checkbox
              label="Показывать архивные позиции прошлых лет"
              checked={includeArchive}
              onChange={(checked) => setParam('archive', checked ? '1' : null)}
            />
            <p className="text-[11px] leading-relaxed text-[#A9AFB7]">
              Поиск функции идёт по подтверждённому оснащению: базовому оборудованию модели, матрице различий
              прайс-листа и описанию комплектации.
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#363B43]/70 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11.5px] font-semibold text-[#A9AFB7]">Сортировка:</span>
            {SORT_LABELS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setParam('sort', value === 'price-asc' ? null : value)
                  track('budget_sort', { section: 'trims', sort: value })
                }}
                className={`min-h-[34px] rounded-[8px] border px-2.5 text-[11.5px] font-bold transition-colors ${
                  sort === value
                    ? 'border-[#E4002B] bg-[#E4002B]/12 text-[#F3F4F4]'
                    : 'border-[#363B43] bg-[#23272D] text-[#A9AFB7] hover:text-[#F3F4F4]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-[11.5px] text-[#A9AFB7]">
              Найдено комплектаций: <strong className="text-[#F3F4F4]">{filtered.length}</strong> из {TRIMS.length}
            </p>
            <Button type="button" variant="ghost" className="min-h-[34px]" onClick={exportCsv} disabled={filtered.length === 0}>
              CSV
            </Button>
          </div>
        </div>

        {activeFilters.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11.5px] text-[#A9AFB7]">Фильтры:</span>
            {activeFilters.map((f) => (
              <Tag key={f} tone="accent">
                {f}
              </Tag>
            ))}
            <button
              type="button"
              onClick={resetAll}
              className="min-h-[28px] text-[11.5px] font-bold text-[#E4002B] underline underline-offset-2"
            >
              Сбросить всё
            </button>
          </div>
        )}
      </Card>

      {/* ---------------- Результаты ---------------- */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<SearchIcon className="h-6 w-6" />}
          title="Ничего не найдено"
          text="Ни одна комплектация не удовлетворяет всем условиям одновременно. Снимите часть фильтров: например, уберите требование по функции или расширьте диапазон цены."
          action={
            <Button type="button" variant="secondary" onClick={resetAll}>
              Сбросить фильтры
            </Button>
          }
        />
      ) : (
        <SectionTitle tip="Платёж показан для единых условий сравнения: 20% взноса, 60 месяцев, 16,4% годовых. Это математическая симуляция, а не предложение банка.">
          Комплектации
        </SectionTitle>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {filtered.map((t) => {
          const model = getModel(t.modelId)
          const details = trimDetails(t.id)
          const price = t.basePrice ?? 0
          const creditAmount = Math.max(0, price - (price * downPaymentPct) / 100)
          const payment = creditAmount > 0 ? annuityPayment(creditAmount, paymentRate, paymentTerm) : 0
          return (
            <Card key={t.id} className="flex flex-col gap-2.5 p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    to={`/models/${model?.slug ?? t.modelId}`}
                    className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#E4002B] underline-offset-2 hover:underline"
                  >
                    {model?.name ?? t.modelId}
                  </Link>
                  <h2 className="mt-0.5 truncate text-[14.5px] font-bold text-[#F3F4F4]">{t.name}</h2>
                  <p className="mt-0.5 text-[11.5px] text-[#A9AFB7]">
                    {t.modelYear ? `${t.modelYear} м.г.` : 'модельный год не указан'}
                    {t.productionYear ? ` · ${t.productionYear} г.в.` : ''} · {t.engine}
                  </p>
                </div>
                {t.status === 'archive' && <Tag tone="warn">архив</Tag>}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#A9AFB7]">Цена</p>
                  <p className="font-display-num text-[15px] font-bold text-[#F3F4F4]">{fmtMoney(price)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#A9AFB7]">Платёж</p>
                  <p className="font-display-num text-[15px] font-bold text-[#F3F4F4]">{fmtMoney(payment)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#A9AFB7]">Мощность</p>
                  <p className="font-display-num text-[15px] font-bold text-[#F3F4F4]">
                    {t.horsepower ?? '—'} <span className="text-[10px] text-[#A9AFB7]">л.с.</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#A9AFB7]">Привод</p>
                  <p className="text-[13px] font-bold text-[#F3F4F4]">{t.drivetrain}</p>
                </div>
              </div>

              <p className="text-[11.5px] text-[#A9AFB7]">
                {t.transmission}
                {details?.consumption?.combined !== null && details?.consumption?.combined !== undefined
                  ? ` · расход ${details.consumption.combined} л/100 км`
                  : ''}
              </p>

              <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-[#363B43]/70 pt-2.5">
                <Link
                  to={`/calculator?trim=${t.id}`}
                  className="min-h-[34px] rounded-[8px] bg-[#E4002B] px-3 py-2 text-[11.5px] font-bold text-white transition-opacity hover:opacity-90"
                >
                  Рассчитать кредит
                </Link>
                <CompareToggle trimId={t.id} />
                <FavoriteButton modelId={t.modelId} trimId={t.id} />
              </div>
            </Card>
          )
        })}
      </div>

      <Callout tone="info" title="Условия сравнения платежей">
        Платёж рассчитан для единых условий: первоначальный взнос {downPaymentPct}%, срок {paymentTerm} месяцев,
        ставка {paymentRate}% годовых, аннуитетная схема. Реальная ставка зависит от программы, срока, взноса
        и решения банка — расчёт является математической симуляцией, а не офертой.
      </Callout>
    </div>
  )
}
