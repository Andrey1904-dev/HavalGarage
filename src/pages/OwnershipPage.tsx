import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Button,
  Callout,
  Card,
  DataTable,
  Disclosure,
  Field,
  Select,
  StatTile,
  TableCell,
  Tag,
} from '../components/ui'
import {
  DropletIcon,
  FuelIcon,
  GaugeIcon,
  LicenseIcon,
  SnowIcon,
  TaxIcon,
  TyreIcon,
  WrenchIcon,
  DownloadIcon,
} from '../components/icons'
import { MODELS, getTrim, trimCombinedConsumption, trimDetails, trimsForModel } from '../data/haval'
import { useCalculator } from '../context/CalculatorContext'
import { useSaved } from '../context/SavedContext'
import { computeTco } from '../utils/tco'
import { fmtMoney, fmtNumber, parseLocaleNumber } from '../utils/format'
import { openReport, type ReportOptions } from '../utils/export'
import PdfExportButton from '../components/PdfExportButton'
import { useSeo } from '../utils/seo'
import { track } from '../utils/analytics'
import { STORAGE_KEYS, loadJson, saveJson } from '../utils/storage'

/**
 * Полная стоимость владения.
 *
 * Расход топлива подставляется из официального прайс-листа; цена топлива, ТО,
 * страховка, налог и прочие расходы задаются пользователем — неизвестные тарифы
 * не заполняются выдуманными цифрами. Кредитные платежи считаются отдельной
 * статьёй и не дублируются в эксплуатационных расходах.
 */

const OWNERSHIP_YEARS = [1, 2, 3, 4, 5, 7, 10]

interface PersistedState {
  mileage: string
  fuelPrice: string
  maintenance: string
  insurance: string
  tax: string
  taxRate: string
  tires: string
  tireService: string
  other: string
  years: number
  includeLoan: boolean
  loanIncludesInsurance: boolean
}

const DEFAULTS: PersistedState = {
  mileage: '15000',
  fuelPrice: '',
  maintenance: '',
  insurance: '',
  tax: '',
  taxRate: '',
  tires: '',
  tireService: '',
  other: '',
  years: 3,
  includeLoan: true,
  loanIncludesInsurance: false,
}

export default function OwnershipPage() {
  const [params] = useSearchParams()
  const { state, plan } = useCalculator()
  const { savePlan } = useSaved()

  const [form, setForm] = useState<PersistedState>(() => ({
    ...DEFAULTS,
    ...loadJson<Partial<PersistedState>>(STORAGE_KEYS.tco, {}),
  }))
  const [modelId, setModelId] = useState(state.modelId)
  const [trimId, setTrimId] = useState(params.get('trim') ?? state.trimId ?? trimsForModel(modelId)[0]?.id ?? '')
  const [savedNote, setSavedNote] = useState('')

  useSeo({
    title: 'Стоимость владения HAVAL — топливо, ТО, страховка, налог и кредит',
    description:
      'Рассчитайте полную стоимость владения автомобилем HAVAL: расход топлива по официальному прайс-листу, ' +
      'ТО, страховка, транспортный налог, шины, шиномонтаж и кредитные платежи за выбранный период.',
    path: '/ownership',
  })

  useEffect(() => {
    saveJson(STORAGE_KEYS.tco, form)
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
  const officialConsumption = trimId ? trimCombinedConsumption(trimId) : null

  const set = (patch: Partial<PersistedState>) => setForm((f) => ({ ...f, ...patch }))

  const result = useMemo(() => {
    const years = form.years
    const loanPayment = plan.ok ? plan.plan.monthlyPayment : 0
    const loanTerm = plan.ok ? plan.plan.termMonths : 0
    return computeTco({
      annualMileageKm: Math.max(0, parseLocaleNumber(form.mileage) || 0),
      fuelConsumptionL100: officialConsumption,
      consumptionSource: officialConsumption !== null ? 'official' : 'missing',
      fuelPricePerL: nullIfEmpty(form.fuelPrice),
      maintenancePerYear: nullIfEmpty(form.maintenance),
      insurancePerYear: nullIfEmpty(form.insurance),
      transportTaxPerYear: nullIfEmpty(form.tax),
      horsepower: details?.trim.horsepower ?? null,
      taxRatePerHp: nullIfEmpty(form.taxRate),
      seasonalTires: Math.max(0, parseLocaleNumber(form.tires) || 0),
      tireServicePerYear: Math.max(0, parseLocaleNumber(form.tireService) || 0),
      otherPerYear: Math.max(0, parseLocaleNumber(form.other) || 0),
      ownershipYears: years,
      monthlyLoanPayment: form.includeLoan ? loanPayment : 0,
      loanTermMonths: form.includeLoan ? loanTerm : 0,
      loanIncludesInsurance: form.loanIncludesInsurance,
    })
  }, [form, officialConsumption, plan, details?.trim.horsepower])

  useEffect(() => {
    if (result.ok) {
      track('tco_calculate', {
        trim: trimId || null,
        years: form.years,
        total: Math.round(result.result.grandTotal),
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- событие аналитики на изменение результата
  }, [result])

  const handleSave = () => {
    if (!result.ok) return
    savePlan({
      kind: 'savings',
      title: `Стоимость владения: ${details ? `${details.model.name} ${details.trim.name}` : 'без автомобиля'}`,
      summary: `${form.years} г. · ${fmtMoney(result.result.grandTotal)} всего · ${fmtMoney(
        result.result.monthlyAverage,
      )} в месяц`,
      payload: {
        years: form.years,
        mileage: parseLocaleNumber(form.mileage) || 0,
        grandTotal: Math.round(result.result.grandTotal),
        monthlyAverage: Math.round(result.result.monthlyAverage),
        costPerKm: Number(result.result.costPerKm.toFixed(2)),
        trimId: trimId || null,
      },
    })
    setSavedNote('Расчёт владения сохранён в разделе «Избранное» (локально в браузере).')
  }

  /** Отчёт строится один раз и используется и печатью, и экспортом в PDF */
  const buildReportOptions = (): ReportOptions | null => {
    if (!result.ok) return null
    const r = result.result
    return {
      title: 'Стоимость владения',
      subtitle: details ? `${details.model.name} ${details.trim.name}` : 'Параметры заданы вручную',
      sections: [
        {
          title: 'Параметры',
          rows: [
            { label: 'Срок владения', value: `${form.years} г.` },
            { label: 'Годовой пробег', value: `${fmtNumber(parseLocaleNumber(form.mileage) || 0)} км` },
            {
              label: 'Расход топлива (смешанный)',
              value: officialConsumption !== null ? `${fmtNumber(officialConsumption)} л/100 км (прайс-лист)` : 'не указан',
            },
            { label: 'Цена топлива', value: form.fuelPrice ? `${form.fuelPrice} ₽/л` : 'не указана' },
          ],
        },
        {
          title: 'Расходы за период',
          rows: r.categories.map((c) => ({ label: c.label, value: fmtMoney(c.total) })),
        },
        {
          title: 'Итоги',
          rows: [
            { label: 'Эксплуатационные расходы', value: fmtMoney(r.operatingTotal) },
            { label: 'Кредитные платежи', value: fmtMoney(r.loanPaymentsTotal), tone: 'accent' },
            { label: 'Всего за период', value: fmtMoney(r.grandTotal), tone: 'accent' },
            { label: 'В среднем в месяц', value: fmtMoney(r.monthlyAverage) },
            { label: 'Стоимость 1 км', value: `${fmtNumber(r.costPerKm)} ₽` },
          ],
        },
      ],
      disclaimers: [
        'Значения, введённые пользователем, являются оценкой: тарифы страховых и дилера не подставляются автоматически.',
        'Кредитные платежи показаны отдельной статьёй и не дублируются в эксплуатационных расходах.',
        'Расчёт не является офертой.',
      ],
      sourceNote: 'Расход топлива — официальный прайс-лист haval.ru.',
    }
  }

  const handleExport = () => {
    const options = buildReportOptions()
    if (!options) return
    const ok = openReport(options)
    track('export_print', { kind: 'tco' })
    if (!ok) setSavedNote('Браузер заблокировал окно печати — разрешите всплывающие окна.')
  }

  return (
    <div className="animate-page-enter flex flex-col gap-4">
      <header className="flex flex-col gap-1.5">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#E4002B]">Эксплуатация и кредит</p>
        <h1 className="font-display-num text-[26px] font-bold uppercase tracking-wide text-[#F3F4F4] sm:text-[32px]">
          Стоимость владения
        </h1>
        <p className="max-w-2xl text-[12.5px] leading-relaxed text-[#A9AFB7]">
          Сколько автомобиль будет стоить за выбранный период: топливо, обслуживание, страхование, налоги, шины,
          шиномонтаж, прочие расходы и кредитные платежи. Подтверждённые значения отделены от ваших оценок.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr]">
        {/* ---------------- Параметры ---------------- */}
        <div className="flex flex-col gap-3">
          <Card className="flex flex-col gap-3">
            <p className="flex items-center gap-2 text-[13px] font-bold text-[#F3F4F4]">
              <GaugeIcon className="h-4 w-4 text-[#E4002B]" /> Автомобиль
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select label="Модель" value={modelId} onChange={(e) => {
                setModelId(e.target.value)
                setTrimId(trimsForModel(e.target.value)[0]?.id ?? '')
              }}>
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
                  </option>
                ))}
              </Select>
            </div>

            {officialConsumption !== null ? (
              <Callout tone="success" title="Расход топлива подтверждён">
                {fmtNumber(officialConsumption)} л/100 км (смешанный цикл) — из официального прайс-листа.
                {details?.consumption?.city != null && ` Город: ${fmtNumber(details.consumption.city)} л.`}
                {details?.consumption?.highway != null && ` Трасса: ${fmtNumber(details.consumption.highway)} л.`}
              </Callout>
            ) : (
              <Callout tone="warn" title="Расход топлива не опубликован">
                Для этой комплектации официальный документ не раскрывает расход. Расходы на топливо рассчитаны не будут —
                выдуманные значения не подставляются.
              </Callout>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Годовой пробег"
                suffix="км"
                inputMode="numeric"
                value={form.mileage}
                onChange={(e) => set({ mileage: e.target.value })}
              />
              <Field
                label="Цена топлива"
                suffix="₽/л"
                inputMode="decimal"
                placeholder="не задана"
                value={form.fuelPrice}
                onChange={(e) => set({ fuelPrice: e.target.value })}
              />
            </div>
            <Select label="Срок владения" value={form.years} onChange={(e) => set({ years: Number(e.target.value) })}>
              {OWNERSHIP_YEARS.map((y) => (
                <option key={y} value={y}>
                  {y} {y === 1 ? 'год' : y < 5 ? 'года' : 'лет'}
                </option>
              ))}
            </Select>
          </Card>

          <Card className="flex flex-col gap-3">
            <p className="flex items-center gap-2 text-[13px] font-bold text-[#F3F4F4]">
              <WrenchIcon className="h-4 w-4 text-[#E4002B]" /> Расходы (ваши оценки)
            </p>
            <p className="text-[11.5px] leading-relaxed text-[#A9AFB7]">
              Тарифы дилера, страховых и налоговой не публикуются в прайс-листах, поэтому поля оставлены пустыми.
              Заполните те статьи, которые знаете: пропущенные не учитываются и помечаются в результатах.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                label="ТО в год"
                suffix="₽"
                inputMode="numeric"
                placeholder="не задано"
                value={form.maintenance}
                onChange={(e) => set({ maintenance: e.target.value })}
              />
              <Field
                label="Страхование в год (ОСАГО + КАСКО)"
                suffix="₽"
                inputMode="numeric"
                placeholder="не задано"
                value={form.insurance}
                onChange={(e) => set({ insurance: e.target.value })}
              />
              <Field
                label="Транспортный налог в год"
                suffix="₽"
                inputMode="numeric"
                placeholder="не задано"
                value={form.tax}
                onChange={(e) => set({ tax: e.target.value })}
              />
              <Field
                label="Ставка налога (альтернатива)"
                suffix="₽/л.с."
                inputMode="decimal"
                placeholder="не задана"
                value={form.taxRate}
                onChange={(e) => set({ taxRate: e.target.value })}
                hint={details?.trim.horsepower ? `Мощность: ${details.trim.horsepower} л.с.` : 'Мощность не подтверждена'}
              />
              <Field
                label="Сезонные шины (разовые)"
                suffix="₽"
                inputMode="numeric"
                placeholder="0"
                value={form.tires}
                onChange={(e) => set({ tires: e.target.value })}
              />
              <Field
                label="Шиномонтаж в год"
                suffix="₽"
                inputMode="numeric"
                placeholder="0"
                value={form.tireService}
                onChange={(e) => set({ tireService: e.target.value })}
              />
              <Field
                label="Прочие расходы в год"
                suffix="₽"
                inputMode="numeric"
                placeholder="0"
                value={form.other}
                onChange={(e) => set({ other: e.target.value })}
                hint="Мойка, платные дороги, парковка, омывающая жидкость"
              />
            </div>
          </Card>

          <Card className="flex flex-col gap-3">
            <p className="flex items-center gap-2 text-[13px] font-bold text-[#F3F4F4]">
              <TaxIcon className="h-4 w-4 text-[#E4002B]" /> Кредитные платежи
            </p>
            <div className="flex flex-wrap gap-2">
              <CheckboxRow
                label="Учитывать платежи по кредиту"
                checked={form.includeLoan}
                onChange={(v) => set({ includeLoan: v })}
              />
              <CheckboxRow
                label="Страховка включена в тело кредита"
                hint="Исключает страхование из эксплуатационных расходов, чтобы не считать его дважды"
                checked={form.loanIncludesInsurance}
                onChange={(v) => set({ loanIncludesInsurance: v })}
              />
            </div>
            <p className="text-[11.5px] leading-relaxed text-[#A9AFB7]">
              {plan.ok
                ? `Текущий расчёт калькулятора: ${fmtMoney(plan.plan.monthlyPayment)} в месяц на ${plan.plan.termMonths} мес (ставка ${String(
                    plan.plan.annualRate,
                  ).replace('.', ',')}%).`
                : 'В калькуляторе нет корректного расчёта — кредитные платежи не учитываются.'}{' '}
              <Link to="/calculator" className="underline underline-offset-2 hover:text-[#F3F4F4]">
                Изменить параметры кредита →
              </Link>
            </p>
          </Card>
        </div>

        {/* ---------------- Результаты ---------------- */}
        <div className="flex flex-col gap-3">
          {!result.ok ? (
            <Card className="border-[#EF4444]/40">
              <p className="text-[13px] font-bold text-[#EF4444]">Проверьте параметры</p>
              <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-4 text-[12px] text-[#A9AFB7]">
                {result.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                <StatTile
                  label={`Всего за ${form.years} ${form.years === 1 ? 'год' : form.years < 5 ? 'года' : 'лет'}`}
                  value={fmtMoney(result.result.grandTotal)}
                  tone="accent"
                  hint="эксплуатация + кредитные платежи"
                />
                <StatTile label="В среднем в месяц" value={fmtMoney(result.result.monthlyAverage)} />
                <StatTile
                  label="Стоимость 1 км"
                  value={`${fmtNumber(result.result.costPerKm)} ₽`}
                  hint={`пробег ${fmtNumber(result.result.totalMileageKm)} км`}
                />
                <StatTile
                  label="Эксплуатация"
                  value={fmtMoney(result.result.operatingTotal)}
                  hint={`кредит отдельно: ${fmtMoney(result.result.loanPaymentsTotal)}`}
                />
              </div>

              <DataTable head={['Статья расходов', 'В год', 'В месяц', `За ${form.years} г.`, 'Источник']}>
                {result.result.categories.map((c) => (
                  <tr key={c.key}>
                    <TableCell sticky>
                      <span className="flex items-center gap-1.5">
                        <CategoryIcon category={c.key} />
                        {c.label}
                      </span>
                    </TableCell>
                    <TableCell>{c.perYear > 0 ? fmtMoney(c.perYear) : '—'}</TableCell>
                    <TableCell>{c.perMonth > 0 ? fmtMoney(c.perMonth) : '—'}</TableCell>
                    <TableCell strong>{c.total > 0 ? fmtMoney(c.total) : '—'}</TableCell>
                    <TableCell>
                      {c.source === 'official' ? (
                        <Tag tone="success">прайс-лист</Tag>
                      ) : c.source === 'user' ? (
                        <Tag>ваша оценка</Tag>
                      ) : (
                        <Tag tone="warn">нет данных</Tag>
                      )}
                    </TableCell>
                  </tr>
                ))}
                <tr>
                  <TableCell sticky>Кредитные платежи</TableCell>
                  <TableCell>
                    {result.result.loanMonthsInPeriod > 0
                      ? fmtMoney(result.result.loanPaymentsTotal / (result.result.loanMonthsInPeriod / 12))
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {result.result.loanMonthsInPeriod > 0
                      ? fmtMoney(result.result.loanPaymentsTotal / result.result.loanMonthsInPeriod)
                      : '—'}
                  </TableCell>
                  <TableCell strong>{result.result.loanPaymentsTotal > 0 ? fmtMoney(result.result.loanPaymentsTotal) : '—'}</TableCell>
                  <TableCell>
                    <Tag tone="success">калькулятор</Tag>
                  </TableCell>
                </tr>
              </DataTable>

              {result.result.warnings.length > 0 && (
                <Callout tone="warn" title="Что не учтено">
                  <ul className="ml-4 list-disc">
                    {result.result.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </Callout>
              )}

              <Disclosure title="Подтверждённые значения и ваши оценки">
                <div className="flex flex-col gap-2 text-[11.5px] leading-relaxed text-[#A9AFB7]">
                  {result.result.confirmed.length > 0 && (
                    <div>
                      <p className="mb-1 font-bold text-[#16B374]">Подтверждено официальными данными:</p>
                      <ul className="ml-4 list-disc">
                        {result.result.confirmed.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.result.estimates.length > 0 && (
                    <div>
                      <p className="mb-1 font-bold text-[#F5A623]">Пользовательские оценки и пропуски:</p>
                      <ul className="ml-4 list-disc">
                        {result.result.estimates.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Disclosure>

              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={handleExport}>
                  <DownloadIcon className="h-4 w-4" /> Печать
                </Button>
                <PdfExportButton getOptions={buildReportOptions} filename="stoimost-vladeniya" />
                <Button type="button" variant="secondary" onClick={handleSave}>
                  Сохранить расчёт
                </Button>
                <Link to="/plan">
                  <Button type="button" variant="ghost">
                    К плану покупки
                  </Button>
                </Link>
              </div>
              {savedNote && <Callout tone="success">{savedNote}</Callout>}

              <Callout tone="info">
                Стоимость автомобиля, переплата по кредиту и эксплуатационные расходы показаны раздельно: итоговая сумма
                «всего за период» — это сумма статей, а не цена автомобиля. Если статья не задана, она не учитывается,
                а не подставляется вымышленным тарифом.
              </Callout>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function nullIfEmpty(raw: string): number | null {
  const n = parseLocaleNumber(raw)
  return Number.isFinite(n) ? n : null
}

function CheckboxRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex min-h-[40px] cursor-pointer items-start gap-2.5 rounded-[8px] border border-[#363B43] bg-[#23272D] px-3 py-2 text-[12px] text-[#A9AFB7] transition-colors hover:text-[#F3F4F4]">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 accent-[#E4002B]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        {label}
        {hint && <span className="mt-0.5 block text-[10.5px] text-[#A9AFB7]">{hint}</span>}
      </span>
    </label>
  )
}

function CategoryIcon({ category }: { category: string }) {
  const cls = 'h-3.5 w-3.5 shrink-0 text-[#E4002B]'
  switch (category) {
    case 'fuel':
      return <FuelIcon className={cls} />
    case 'maintenance':
      return <WrenchIcon className={cls} />
    case 'insurance':
      return <LicenseIcon className={cls} />
    case 'tax':
      return <TaxIcon className={cls} />
    case 'tires':
      return <TyreIcon className={cls} />
    case 'tireService':
      return <SnowIcon className={cls} />
    default:
      return <DropletIcon className={cls} />
  }
}
