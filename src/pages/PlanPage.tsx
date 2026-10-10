import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Button,
  Callout,
  Card,
  DataTable,
  Field,
  SectionTitle,
  SegmentedControl,
  Select,
  StatTile,
  TableCell,
  Tag,
} from '../components/ui'
import { CalendarIcon, SavingsIcon, SwapIcon, TargetIcon, TradeInIcon, DownloadIcon } from '../components/icons'
import {
  MODELS,
  activeOffersForModel,
  getTrim,
  minCurrentPrice,
  trimDetails,
  trimsForModel,
  CATALOG_FIXED_AT,
} from '../data/haval'
import { useCalculator } from '../context/CalculatorContext'
import { useSaved } from '../context/SavedContext'
import { computeSavingsPlan } from '../utils/savings'
import { computeTradeIn, type TradeInMode } from '../utils/tradein'
import { fmtDate, fmtMoney, fmtNumber, parseLocaleNumber } from '../utils/format'
import { openReport, type ReportOptions } from '../utils/export'
import PdfExportButton from '../components/PdfExportButton'
import { STORAGE_KEYS, loadJson, saveJson } from '../utils/storage'
import { useSeo } from '../utils/seo'
import { track } from '../utils/analytics'

/**
 * План покупки: накопление на первоначальный взнос и сценарий трейд-ин.
 *
 * Разделены три сценария покупки (самостоятельная продажа, обычный взнос,
 * официальная программа трейд-ин) — они не смешиваются. Пользовательская оценка
 * стоимости автомобиля не выдаётся за официальную оценку дилера.
 */

type Tab = 'savings' | 'trade-in'

interface PersistedState {
  currentSavings: string
  monthlyContribution: string
  reserve: string
  desiredDownPct: string
  targetMonths: string
  savingsRate: string
  priceChange: string
  salePrice: string
  remainingLoan: string
  sellingCosts: string
  ownFunds: string
  mode: TradeInMode
}

const DEFAULTS: PersistedState = {
  currentSavings: '',
  monthlyContribution: '',
  reserve: '',
  desiredDownPct: '20',
  targetMonths: '',
  savingsRate: '0',
  priceChange: '0',
  salePrice: '',
  remainingLoan: '',
  sellingCosts: '',
  ownFunds: '',
  mode: 'self-sale',
}

export default function PlanPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { state: calcState, plan, update } = useCalculator()
  const { savePlan } = useSaved()

  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) ?? 'savings')
  const [form, setForm] = useState<PersistedState>(() => ({
    ...DEFAULTS,
    ...loadJson<Partial<PersistedState>>(STORAGE_KEYS.plans + '.form', {}),
  }))
  const [modelId, setModelId] = useState(calcState.modelId)
  const [trimId, setTrimId] = useState(params.get('trim') ?? calcState.trimId ?? trimsForModel(modelId)[0]?.id ?? '')
  const [tradeInProceeds, setTradeInProceeds] = useState(0)
  const [note, setNote] = useState('')

  useSeo({
    title: 'План покупки HAVAL — накопление на взнос и трейд-ин',
    description:
      'Рассчитайте недостающую сумму, ежемесячное накопление, дату цели и сценарии покупки с разным взносом. ' +
      'Отдельный сценарий трейд-ин: чистая сумма от продажи текущего автомобиля и подтверждённая выгода программы.',
    path: '/plan',
  })

  useEffect(() => {
    saveJson(STORAGE_KEYS.plans + '.form', form)
  }, [form])

  useEffect(() => {
    const fromQuery = params.get('trim')
    if (fromQuery && getTrim(fromQuery)) {
      const t = getTrim(fromQuery)!
      setModelId(t.modelId)
      setTrimId(fromQuery)
    }
  }, [params])

  const trims = trimsForModel(modelId)
  const details = trimId ? trimDetails(trimId) : null
  const targetPrice = details?.trim.basePrice ?? minCurrentPrice(modelId)?.basePrice ?? null

  const set = (patch: Partial<PersistedState>) => setForm((f) => ({ ...f, ...patch }))

  const tradeInOffers = useMemo(
    () => activeOffersForModel(modelId, CATALOG_FIXED_AT).filter((o) => o.offerType === 'trade-in'),
    [modelId],
  )
  const officialBenefit = tradeInOffers[0]?.discountAmount ?? null

  const tradeIn = useMemo(
    () =>
      computeTradeIn({
        salePrice: Math.max(0, parseLocaleNumber(form.salePrice) || 0),
        remainingLoan: Math.max(0, parseLocaleNumber(form.remainingLoan) || 0),
        sellingCosts: Math.max(0, parseLocaleNumber(form.sellingCosts) || 0),
        ownFunds: Math.max(0, parseLocaleNumber(form.ownFunds) || 0),
        mode: form.mode,
        officialTradeInBenefit: officialBenefit,
        officialProgramName: tradeInOffers[0]?.name ?? null,
      }),
    [form.salePrice, form.remainingLoan, form.sellingCosts, form.ownFunds, form.mode, officialBenefit, tradeInOffers],
  )

  useEffect(() => {
    if (tradeIn.ok) {
      track('tradein_calculate', { mode: form.mode, available: Math.round(tradeIn.plan.availableForDownPayment) })
      setTradeInProceeds(
        form.mode === 'down-payment' ? 0 : tradeIn.plan.netProceeds + tradeIn.plan.officialBenefit,
      )
    }
  }, [tradeIn, form.mode])

  const savings = useMemo(() => {
    if (targetPrice === null) return null
    const targetMonthsRaw = parseLocaleNumber(form.targetMonths)
    return computeSavingsPlan({
      targetPrice,
      currentSavings: Math.max(0, parseLocaleNumber(form.currentSavings) || 0),
      tradeInProceeds: Math.max(0, tradeInProceeds),
      desiredDownPaymentPct: Math.min(100, Math.max(0, parseLocaleNumber(form.desiredDownPct) || 0)),
      monthlyContribution: Math.max(0, parseLocaleNumber(form.monthlyContribution) || 0),
      reserveAmount: Math.max(0, parseLocaleNumber(form.reserve) || 0),
      targetMonths: Number.isFinite(targetMonthsRaw) && targetMonthsRaw > 0 ? Math.round(targetMonthsRaw) : null,
      annualSavingsRatePct: Math.max(0, parseLocaleNumber(form.savingsRate) || 0),
      priceChangePerYearPct: parseLocaleNumber(form.priceChange) || 0,
      loanAnnualRatePercent: plan.ok ? plan.plan.annualRate : parseLocaleNumber(calcState.annualRate) || 0,
      loanTermMonths: plan.ok ? plan.plan.termMonths : calcState.termMonths,
    })
  }, [targetPrice, form, tradeInProceeds, plan, calcState.annualRate, calcState.termMonths])

  useEffect(() => {
    if (savings?.ok) {
      track('savings_plan', {
        model: modelId,
        missing: Math.round(savings.plan.missingAmount),
        months: savings.plan.monthsToGoal,
      })
    }
  }, [savings, modelId])

  const handleSavePlan = () => {
    if (!savings?.ok) return
    savePlan({
      kind: 'savings',
      title: details ? `План покупки: ${details.model.name} ${details.trim.name}` : 'План покупки',
      summary: savings.plan.readyNow
        ? 'Цель достигнута: накоплений хватает на взнос и резерв'
        : `Не хватает ${fmtMoney(savings.plan.missingAmount)}${
            savings.plan.monthsToGoal !== null ? ` · ${savings.plan.monthsToGoal} мес накоплений` : ''
          }`,
      payload: {
        targetPrice,
        missingAmount: Math.round(savings.plan.missingAmount),
        monthsToGoal: savings.plan.monthsToGoal,
        requiredMonthly: savings.plan.requiredMonthly !== null ? Math.round(savings.plan.requiredMonthly) : null,
        tradeInProceeds: Math.round(tradeInProceeds),
      },
    })
    setNote('План сохранён в разделе «Избранное» (локально в браузере, без регистрации).')
  }

  /** Отчёт строится один раз и используется и печатью, и экспортом в PDF */
  const buildReportOptions = (): ReportOptions | null => {
    if (!savings?.ok) return null
    const p = savings.plan
    return {
      title: 'План покупки',
      subtitle: details ? `${details.model.name} ${details.trim.name}` : undefined,
      sections: [
        {
          title: 'Цель накопления',
          rows: [
            { label: 'Стоимость автомобиля', value: targetPrice !== null ? fmtMoney(targetPrice) : 'нет данных' },
            { label: 'Целевой взнос', value: `${form.desiredDownPct}%` },
            { label: 'Резерв на оформление', value: fmtMoney(parseLocaleNumber(form.reserve) || 0) },
            { label: 'Цель (взнос + резерв)', value: fmtMoney(p.goalAmount) },
            { label: 'Доступно сейчас', value: fmtMoney(p.availableNow) },
            { label: 'Недостающая сумма', value: fmtMoney(p.missingAmount), tone: 'accent' },
            {
              label: 'Необходимо откладывать',
              value: p.requiredMonthly !== null ? `${fmtMoney(p.requiredMonthly)} в месяц` : 'не рассчитано',
            },
            {
              label: 'Ориентировочная дата цели',
              value: p.targetDate ? fmtDate(p.targetDate) : 'не определена',
            },
          ],
        },
        {
          title: 'Сценарии покупки',
          rows: p.scenarios.map((s) => ({
            label: `${s.name} (${s.monthsFromNow} мес)`,
            value: `взнос ${fmtMoney(s.availableDownPayment)} · платёж ${fmtMoney(s.monthlyPayment)}`,
          })),
        },
        ...(tradeIn.ok
          ? [
              {
                title: 'Трейд-ин',
                rows: tradeIn.plan.breakdown.map((b) => ({
                  label: b.label,
                  value: `${b.kind === 'minus' ? '−' : ''}${fmtMoney(b.amount)}`,
                })),
              },
            ]
          : []),
      ],
      disclaimers: [
        'Цена автомобиля, скидки и условия кредитных программ могут измениться к расчётной дате — проекция цены справочная.',
        'Оценка стоимости текущего автомобиля сделана пользователем и не является официальной оценкой дилера.',
        'Расчёт не является офертой или одобрением кредита.',
      ],
      sourceNote: 'Цены — МЦП из официальных прайс-листов haval.ru.',
    }
  }

  const handleExport = () => {
    const options = buildReportOptions()
    if (!options) return
    const ok = openReport(options)
    track('export_print', { kind: 'plan' })
    if (!ok) setNote('Браузер заблокировал окно печати — разрешите всплывающие окна.')
  }

  return (
    <div className="animate-page-enter flex flex-col gap-4">
      <header className="flex flex-col gap-1.5">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#E4002B]">Накопление и трейд-ин</p>
        <h1 className="font-display-num text-[26px] font-bold uppercase tracking-wide text-[#F3F4F4] sm:text-[32px]">
          План покупки
        </h1>
        <p className="max-w-2xl text-[12.5px] leading-relaxed text-[#A9AFB7]">
          Сколько нужно накопить, за какой срок вы выйдете на целевой взнос и каким будет платёж в разных сценариях.
          Отдельно — сценарий продажи текущего автомобиля и официальная программа трейд-ин.
        </p>
      </header>

      <SegmentedControl
        value={tab}
        onChange={(v) => {
          setTab(v)
          const next = new URLSearchParams(params)
          next.set('tab', v)
          navigate(`/plan?${next.toString()}`, { replace: true })
        }}
        options={[
          { value: 'savings', label: 'Накопления' },
          { value: 'trade-in', label: 'Трейд-ин' },
        ]}
      />

      {tab === 'savings' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="flex flex-col gap-3">
            <Card className="flex flex-col gap-3">
              <p className="flex items-center gap-2 text-[13px] font-bold text-[#F3F4F4]">
                <TargetIcon className="h-4 w-4 text-[#E4002B]" /> Автомобиль и цель
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Select
                  label="Модель"
                  value={modelId}
                  onChange={(e) => {
                    setModelId(e.target.value)
                    setTrimId(trimsForModel(e.target.value)[0]?.id ?? '')
                  }}
                >
                  {MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </Select>
                <Select label="Комплектация" value={trimId} onChange={(e) => setTrimId(e.target.value)} disabled={trims.length === 0}>
                  {trims.length === 0 && <option value="">Нет подтверждённых цен</option>}
                  {trims.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.basePrice !== null ? ` — ${fmtMoney(t.basePrice)}` : ''}
                    </option>
                  ))}
                </Select>
              </div>

              {targetPrice === null ? (
                <Callout tone="warn">
                  Для этой модели нет подтверждённой цены — план накопления не рассчитывается, чтобы не опираться на
                  выдуманную стоимость.
                </Callout>
              ) : (
                <StatTile
                  label="Стоимость автомобиля"
                  value={fmtMoney(targetPrice)}
                  hint={details ? `МЦП из прайс-листа · проверено ${fmtDate(details.trim.priceUpdatedAt)}` : undefined}
                  tone="accent"
                />
              )}

              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Целевой взнос"
                  suffix="%"
                  inputMode="decimal"
                  value={form.desiredDownPct}
                  onChange={(e) => set({ desiredDownPct: e.target.value })}
                  hint={targetPrice ? `≈ ${fmtMoney((targetPrice * (parseLocaleNumber(form.desiredDownPct) || 0)) / 100)}` : undefined}
                />
                <Field
                  label="Резерв на оформление"
                  suffix="₽"
                  inputMode="numeric"
                  placeholder="0"
                  value={form.reserve}
                  onChange={(e) => set({ reserve: e.target.value })}
                />
              </div>
            </Card>

            <Card className="flex flex-col gap-3">
              <p className="flex items-center gap-2 text-[13px] font-bold text-[#F3F4F4]">
                <SavingsIcon className="h-4 w-4 text-[#E4002B]" /> Накопления
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field
                  label="Текущие накопления"
                  suffix="₽"
                  inputMode="numeric"
                  placeholder="0"
                  value={form.currentSavings}
                  onChange={(e) => set({ currentSavings: e.target.value })}
                />
                <Field
                  label="Могу откладывать в месяц"
                  suffix="₽"
                  inputMode="numeric"
                  placeholder="0"
                  value={form.monthlyContribution}
                  onChange={(e) => set({ monthlyContribution: e.target.value })}
                />
                <Field
                  label="Желаемый срок покупки"
                  suffix="мес"
                  inputMode="numeric"
                  placeholder="рассчитать"
                  value={form.targetMonths}
                  onChange={(e) => set({ targetMonths: e.target.value })}
                />
                <Field
                  label="Доходность накоплений"
                  suffix="% годовых"
                  inputMode="decimal"
                  value={form.savingsRate}
                  onChange={(e) => set({ savingsRate: e.target.value })}
                  hint="0 — без начисления процентов"
                />
                <Field
                  label="Возможное изменение цены"
                  suffix="% в год"
                  inputMode="decimal"
                  value={form.priceChange}
                  onChange={(e) => set({ priceChange: e.target.value })}
                  hint="Проекция цены справочная: гарантия цены не даётся"
                />
              </div>
              {tradeInProceeds > 0 && (
                <Callout tone="success">
                  Учтена сумма от продажи текущего автомобиля: {fmtMoney(tradeInProceeds)} (рассчитана во вкладке
                  «Трейд-ин»).
                </Callout>
              )}
            </Card>
          </div>

          <div className="flex flex-col gap-3">
            {!savings ? (
              <Card>
                <Callout tone="warn">
                  Выберите модель и комплектацию с подтверждённой ценой — без неё план накопления не строится.
                </Callout>
              </Card>
            ) : !savings.ok ? (
              <Card className="border-[#EF4444]/40">
                <p className="text-[13px] font-bold text-[#EF4444]">Проверьте параметры плана</p>
                <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-4 text-[12px] text-[#A9AFB7]">
                  {savings.errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  <StatTile
                    label={savings.plan.readyNow ? 'Цель достигнута' : 'Не хватает'}
                    value={savings.plan.readyNow ? '0 ₽' : fmtMoney(savings.plan.missingAmount)}
                    tone={savings.plan.readyNow ? 'success' : 'accent'}
                    hint={`цель ${fmtMoney(savings.plan.goalAmount)} · есть ${fmtMoney(savings.plan.availableNow)}`}
                  />
                  <StatTile
                    label="Откладывать в месяц"
                    value={
                      savings.plan.requiredMonthly !== null ? fmtMoney(savings.plan.requiredMonthly) : 'недостижимо'
                    }
                    hint={
                      savings.plan.monthsToGoal !== null
                        ? `до цели ${savings.plan.monthsToGoal} мес`
                        : 'увеличьте ежемесячную сумму'
                    }
                  />
                  <StatTile
                    label="Дата цели"
                    value={savings.plan.targetDate ? fmtDate(savings.plan.targetDate) : '—'}
                    hint={savings.plan.monthsToGoal !== null ? `через ${savings.plan.monthsToGoal} мес` : undefined}
                  />
                  <StatTile
                    label="Проекция цены"
                    value={savings.plan.projectedPrice !== null ? fmtMoney(savings.plan.projectedPrice) : '—'}
                    tone="warn"
                    hint="цена может измениться"
                  />
                </div>

                {savings.plan.warnings.length > 0 && (
                  <Callout tone="warn" title="Важно">
                    <ul className="ml-4 list-disc">
                      {savings.plan.warnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  </Callout>
                )}

                <SectionTitle tip="Каждый сценарий показывает взнос, сумму кредита и платёж по параметрам кредитного калькулятора. Проекция цены учитывает указанный вами процент изменения.">
                  Сценарии покупки
                </SectionTitle>
                <DataTable
                  head={['Сценарий', 'Дата', 'Взнос', 'Кредит', 'Платёж', 'Переплата']}
                >
                  {savings.plan.scenarios.map((s) => (
                    <tr key={s.id}>
                      <TableCell sticky>
                        {s.name}
                        <span className="mt-0.5 block text-[10.5px] font-normal text-[#A9AFB7]">{s.description}</span>
                        {s.reachesGoal && <Tag tone="success">цель достигнута</Tag>}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          {fmtDate(s.targetDate)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {fmtMoney(s.availableDownPayment)}
                        <span className="block text-[10.5px] text-[#A9AFB7]">{s.downPaymentPct.toFixed(0)}% цены</span>
                      </TableCell>
                      <TableCell>{fmtMoney(s.creditAmount)}</TableCell>
                      <TableCell strong>{fmtMoney(s.monthlyPayment)}</TableCell>
                      <TableCell>
                        <span className="text-[#E4002B]">{fmtMoney(s.interestOverpay)}</span>
                      </TableCell>
                    </tr>
                  ))}
                </DataTable>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={handleExport}>
                    <DownloadIcon className="h-4 w-4" /> Печать
                  </Button>
                  <PdfExportButton getOptions={buildReportOptions} filename="plan-pokupki" />
                  <Button type="button" variant="secondary" onClick={handleSavePlan}>
                    Сохранить план
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      const first = savings.plan.scenarios.find((s) => s.monthsFromNow === 0) ?? savings.plan.scenarios[0]
                      if (first && details) {
                        update({
                          modelId: details.model.id,
                          trimId: details.trim.id,
                          downPaymentMode: 'rub',
                          downPaymentRub: String(Math.round(first.availableDownPayment)),
                        })
                      }
                      navigate('/calculator')
                    }}
                  >
                    Перенести в кредитный калькулятор
                  </Button>
                </div>
                {note && <Callout tone="success">{note}</Callout>}

                <Callout tone="info">
                  Приложение не обещает, что цена, скидка или кредитная программа сохранятся к расчётной дате. Проекция
                  цены — справочная величина по указанному вами проценту {String(parseLocaleNumber(form.priceChange) || 0).replace('.', ',')}% годовых;
                  при нулевом проценте цена считается неизменной.
                </Callout>
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'trade-in' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr]">
          <Card className="flex flex-col gap-3">
            <p className="flex items-center gap-2 text-[13px] font-bold text-[#F3F4F4]">
              <TradeInIcon className="h-4 w-4 text-[#E4002B]" /> Текущий автомобиль
            </p>

            <div>
              <span className="mb-1.5 block text-[12.5px] font-semibold text-[#A9AFB7]">Сценарий покупки</span>
              <div className="flex flex-col gap-1.5">
                {(
                  [
                    ['self-sale', 'Самостоятельная продажа', 'Продаёте сами — сумма идёт на взнос, выгода программы не применяется'],
                    ['official-trade-in', 'Официальная программа трейд-ин', 'Сдача дилеру + подтверждённая выгода программы (если опубликована)'],
                    ['down-payment', 'Обычный расчёт с первоначальным взносом', 'Продажа не учитывается — только собственные средства'],
                  ] as Array<[TradeInMode, string, string]>
                ).map(([value, label, hint]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set({ mode: value })}
                    aria-pressed={form.mode === value}
                    className={`min-h-[46px] rounded-[8px] border px-3 py-2 text-left transition-colors ${
                      form.mode === value
                        ? 'border-[#E4002B] bg-[#E4002B]/12 text-[#F3F4F4]'
                        : 'border-[#363B43] bg-[#23272D] text-[#A9AFB7] hover:text-[#F3F4F4]'
                    }`}
                  >
                    <span className="block text-[12.5px] font-bold">{label}</span>
                    <span className="block text-[10.5px] leading-relaxed">{hint}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                label="Предполагаемая цена продажи"
                suffix="₽"
                inputMode="numeric"
                placeholder="0"
                value={form.salePrice}
                onChange={(e) => set({ salePrice: e.target.value })}
                hint="Ваша оценка, а не официальная оценка дилера"
              />
              <Field
                label="Остаток долга по кредиту"
                suffix="₽"
                inputMode="numeric"
                placeholder="0"
                value={form.remainingLoan}
                onChange={(e) => set({ remainingLoan: e.target.value })}
              />
              <Field
                label="Расходы на продажу"
                suffix="₽"
                inputMode="numeric"
                placeholder="0"
                value={form.sellingCosts}
                onChange={(e) => set({ sellingCosts: e.target.value })}
                hint="Подготовка, доставка, снятие с учёта"
              />
              <Field
                label="Собственные средства"
                suffix="₽"
                inputMode="numeric"
                placeholder="0"
                value={form.ownFunds}
                onChange={(e) => set({ ownFunds: e.target.value })}
              />
            </div>

            {officialBenefit !== null && tradeInOffers[0] && (
              <Callout tone="info" title={tradeInOffers[0].name}>
                Подтверждённая выгода {fmtMoney(officialBenefit)} при сдаче дилеру автомобиля HAVAL или Great Wall.
                Условия: {tradeInOffers[0].eligibilityConditions} Источник:{' '}
                <a
                  href={tradeInOffers[0].sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2"
                >
                  официальный прайс-лист
                </a>
                .
              </Callout>
            )}
            {officialBenefit === null && (
              <Callout tone="warn">
                Для выбранной модели официальная программа трейд-ин с подтверждённой суммой выгоды не опубликована —
                выгода не начисляется.
              </Callout>
            )}
          </Card>

          <div className="flex flex-col gap-3">
            {!tradeIn.ok ? (
              <Card className="border-[#EF4444]/40">
                <p className="text-[13px] font-bold text-[#EF4444]">Проверьте данные</p>
                <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-4 text-[12px] text-[#A9AFB7]">
                  {tradeIn.errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </Card>
            ) : (
              <>
                <StatTile
                  label="Доступно на первоначальный взнос"
                  value={fmtMoney(tradeIn.plan.availableForDownPayment)}
                  tone="accent"
                  hint={`сценарий: ${form.mode === 'self-sale' ? 'самостоятельная продажа' : form.mode === 'official-trade-in' ? 'официальный трейд-ин' : 'обычный взнос'}`}
                />

                <DataTable head={['Статья', 'Сумма']}>
                  {tradeIn.plan.breakdown.map((b, i) => (
                    <tr key={`${b.label}-${i}`}>
                      <TableCell sticky>{b.label}</TableCell>
                      <TableCell strong={i === tradeIn.plan.breakdown.length - 1}>
                        <span className={b.kind === 'minus' ? 'text-[#E4002B]' : 'text-[#F3F4F4]'}>
                          {b.kind === 'minus' ? '−' : ''}
                          {fmtMoney(b.amount)}
                        </span>
                      </TableCell>
                    </tr>
                  ))}
                </DataTable>

                {tradeIn.plan.notes.length > 0 && (
                  <Callout tone="info" title="Пояснения">
                    <ul className="ml-4 list-disc">
                      {tradeIn.plan.notes.map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                    </ul>
                  </Callout>
                )}
                {tradeIn.plan.warnings.length > 0 && (
                  <Callout tone="warn" title="Ограничения">
                    <ul className="ml-4 list-disc">
                      {tradeIn.plan.warnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  </Callout>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => setTab('savings')}>
                    <SwapIcon className="h-4 w-4" /> Перенести в план накопления ({fmtMoney(tradeInProceeds)})
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      update({ downPaymentMode: 'rub', downPaymentRub: String(Math.round(tradeIn.plan.availableForDownPayment)) })
                      navigate('/calculator')
                    }}
                  >
                    Подставить как взнос в калькулятор
                  </Button>
                </div>

                {targetPrice !== null && (
                  <p className="text-[11.5px] leading-relaxed text-[#A9AFB7]">
                    При стоимости {fmtMoney(targetPrice)} такой взнос составляет{' '}
                    {fmtNumber((tradeIn.plan.availableForDownPayment / targetPrice) * 100)}% и покрывает{' '}
                    {fmtMoney(Math.max(0, targetPrice - tradeIn.plan.availableForDownPayment))} кредита. Платёж при
                    ставке {String(plan.ok ? plan.plan.annualRate : 0).replace('.', ',')}% на{' '}
                    {plan.ok ? plan.plan.termMonths : calcState.termMonths} мес — в{' '}
                    <Link to="/calculator" className="underline underline-offset-2 hover:text-[#F3F4F4]">
                      кредитном калькуляторе
                    </Link>
                    .
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
