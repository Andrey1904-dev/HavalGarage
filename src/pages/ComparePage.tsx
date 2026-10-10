import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Button,
  Callout,
  Card,
  DataTable,
  EmptyState,
  Field,
  SectionTitle,
  Select,
  StatTile,
  TableCell,
  Tag,
} from '../components/ui'
import { CompareIcon, DownloadIcon, HeartIcon, TrashIcon } from '../components/icons'
import { FavoriteButton } from '../components/ActionButtons'
import {
  MODELS,
  compareFeatures,
  getOfficialSpecs,
  getTrim,
  trimDetails,
  trimsForModel,
  type FeatureAvailability,
} from '../data/haval'
import { useCompare, MAX_COMPARE } from '../context/CompareContext'
import { useCalculator } from '../context/CalculatorContext'
import { useSaved } from '../context/SavedContext'
import { annuityPayment } from '../utils/loan'
import { fmtMoney, fmtNumber, parseLocaleNumber } from '../utils/format'
import { openReport, type ReportOptions, type ReportSection } from '../utils/export'
import PdfExportButton from '../components/PdfExportButton'
import { useSeo } from '../utils/seo'
import { track } from '../utils/analytics'

/**
 * Сравнение до трёх автомобилей: разные комплектации одной модели или разные
 * модели HAVAL. Сравниваются цена, характеристики, оснащение по группам,
 * кредитные платежи и эксплуатационные расходы, показаны различия и стоимость
 * перехода на следующую комплектацию.
 *
 * Параметры кредита берутся из общего состояния калькулятора — логика расчёта
 * не дублируется.
 */
export default function ComparePage() {
  const [params, setParams] = useSearchParams()
  const { trimIds, set, remove, clear, add } = useCompare()
  const { state } = useCalculator()
  const { saveComparison } = useSaved()

  const [mileage, setMileage] = useState('15000')
  const [fuelPrice, setFuelPrice] = useState('60')
  const [onlyDiff, setOnlyDiff] = useState(true)
  const [savedNote, setSavedNote] = useState('')

  useSeo({
    title: 'Сравнение комплектаций HAVAL — цена, оснащение, кредит и стоимость владения',
    description:
      'Сравните до трёх автомобилей HAVAL: цены по официальным прайс-листам, технические характеристики, ' +
      'оснащение по группам, ежемесячные кредитные платежи и эксплуатационные расходы.',
    path: '/compare',
    noindex: true,
  })

  // синхронизация выбора с query-параметром (ссылкой можно поделиться);
  // зависимости намеренно ограничены params — иначе цикл записи в URL
  useEffect(() => {
    const fromUrl = (params.get('trims') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter((id) => Boolean(getTrim(id)))
    if (fromUrl.length > 0 && fromUrl.join(',') !== trimIds.join(',')) {
      set(fromUrl.slice(0, MAX_COMPARE))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  useEffect(() => {
    const current = params.get('trims') ?? ''
    if (current !== trimIds.join(',')) {
      const next = new URLSearchParams(params)
      if (trimIds.length > 0) next.set('trims', trimIds.join(','))
      else next.delete('trims')
      setParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimIds])

  const details = useMemo(() => trimIds.map((id) => trimDetails(id)).filter((d) => d !== null), [trimIds])

  const term = state.termMonths
  const rate = parseLocaleNumber(state.annualRate) || 0
  const downPct = Math.min(100, Math.max(0, parseLocaleNumber(state.downPaymentPercent) || 0))

  const credit = useMemo(
    () =>
      details.map((d) => {
        const price = d.trim.basePrice ?? 0
        const down = (price * downPct) / 100
        const creditAmount = Math.max(0, price - down)
        const payment = creditAmount > 0 ? annuityPayment(creditAmount, rate, term) : 0
        return {
          price,
          down,
          creditAmount,
          payment: Number.isFinite(payment) ? payment : 0,
          totalPaid: Number.isFinite(payment) ? payment * term : 0,
        }
      }),
    [details, downPct, rate, term],
  )

  const mileageNum = Math.max(0, parseLocaleNumber(mileage) || 0)
  const fuelPriceNum = Math.max(0, parseLocaleNumber(fuelPrice) || 0)

  const operating = useMemo(
    () =>
      details.map((d) => {
        const consumption = d.consumption?.combined ?? null
        const fuelPerYear = consumption !== null ? (mileageNum * consumption * fuelPriceNum) / 100 : null
        return { consumption, fuelPerYear }
      }),
    [details, mileageNum, fuelPriceNum],
  )

  const features = useMemo(() => compareFeatures(trimIds), [trimIds])

  const specRows = useMemo(() => {
    if (details.length === 0) return []
    const specs = details.map((d) => (d.model ? getOfficialSpecs(d.model.id) : null))
    const rows: Array<{ label: string; values: Array<string | null> }> = []
    const push = (label: string, get: (d: (typeof details)[number], s: (typeof specs)[number]) => string | null) =>
      rows.push({ label, values: details.map((d, i) => get(d, specs[i])) })

    push('Цена (МЦП)', (d) => (d.trim.basePrice !== null ? fmtMoney(d.trim.basePrice) : null))
    push('Тип цены', (d) => priceTypeLabel(d.trim.priceType ?? 'msrp'))
    push('Модельный год', (d) => (d.trim.modelYear ? `${d.trim.modelYear} м.г.` : null))
    push('Год производства', (d) => (d.trim.productionYear ? `${d.trim.productionYear} г.в.` : null))
    push('Двигатель', (d) => (d.trim.engine !== 'Нет данных' ? d.trim.engine : null))
    push('Рабочий объём', (d) => (d.displacementCc ? `${fmtNumber(d.displacementCc)} см³` : null))
    push('Мощность', (d) => (d.trim.horsepower ? `${d.trim.horsepower} л.с.` : null))
    push('Крутящий момент', (d) => (d.torqueNm ? `${d.torqueNm} Нм` : null))
    push('Коробка передач', (d) => (d.trim.transmission !== 'Нет данных' ? d.trim.transmission : null))
    push('Привод', (d) => (d.trim.drivetrain !== 'Нет данных' ? d.trim.drivetrain : null))
    push('Тип топлива', (_d, s) => s?.engines[0]?.fuel ?? null)
    push('Расход: город', (d) => (d.consumption?.city != null ? `${fmtNumber(d.consumption.city)} л/100 км` : null))
    push('Расход: трасса', (d) =>
      d.consumption?.highway != null ? `${fmtNumber(d.consumption.highway)} л/100 км` : null,
    )
    push('Расход: смешанный', (d) =>
      d.consumption?.combined != null ? `${fmtNumber(d.consumption.combined)} л/100 км` : null,
    )
    push('Клиренс', (d) => (d.clearanceMm ? `${d.clearanceMm} мм` : null))
    push('Габариты (Д × Ш × В)', (d) => d.dimensionsText)
    push('Колёсная база', (d) => (d.wheelbaseMm ? `${fmtNumber(d.wheelbaseMm)} мм` : null))
    push('Объём багажника', (d) => (d.trunkL ? `${d.trunkL} л` : null))
    push('Топливный бак', (d) => (d.fuelTankL ? `${d.fuelTankL} л` : null))
    push('Снаряжённая масса', (d) => (d.weightKg ? `${d.weightKg} кг` : null))
    push('Разгон 0–100 км/ч', (d) => (d.acceleration0to100 ? `${d.acceleration0to100} с` : null))
    push('Максимальная скорость', (d) => (d.maxSpeedKmh ? `${d.maxSpeedKmh} км/ч` : null))
    push('Диски', (d) => d.wheels)
    push('Шины', (d) => d.tires)
    push('Цвета кузова', (d) => (d.colorsExterior.length > 0 ? d.colorsExterior.join(', ') : null))
    push('Цвет салона', (d) => (d.colorsInterior.length > 0 ? d.colorsInterior.join(', ') : null))
    push('Мест', (_d, s) => (s?.seats ? String(s.seats) : null))
    push('Внедорожные функции', (_d, s) => (s && s.offroad.length > 0 ? s.offroad.join('; ') : null))
    push('Дата проверки цены', (d) => d.trim.priceUpdatedAt)
    push('Цена действует с', (d) => d.trim.priceValidFrom)
    push('Источник цены', (d) => d.trim.priceSourceUrl)
    return rows
  }, [details])

  const grouped = useMemo(() => {
    const shown = onlyDiff
      ? features.filter((f) => {
          const values = trimIds.map((id) => f.values[id] ?? 'unknown')
          return new Set(values).size > 1
        })
      : features
    const map = new Map<string, typeof shown>()
    for (const f of shown) {
      const arr = map.get(f.group) ?? []
      arr.push(f)
      map.set(f.group, arr)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ru'))
  }, [features, onlyDiff, trimIds])

  if (details.length === 0) {
    return (
      <div className="animate-page-enter flex flex-col gap-4">
        <Header />
        <EmptyState
          icon={<CompareIcon className="h-6 w-6" />}
          title="Выберите комплектации для сравнения"
          text={`Можно сравнить до ${MAX_COMPARE} автомобилей: разные комплектации одной модели или разные модели HAVAL. Добавьте их в каталоге или выберите ниже.`}
          action={
            <Link to="/catalog">
              <Button type="button" variant="secondary">
                В каталог
              </Button>
            </Link>
          }
        />
        <ComparePicker onAdd={add} />
      </div>
    )
  }

  const handleSave = () => {
    saveComparison({
      title: details.map((d) => `${d.model.name} ${d.trim.name}`).join(' vs '),
      trimIds,
    })
    setSavedNote('Сравнение сохранено в разделе «Избранное» (локально в браузере).')
  }

  /** Отчёт строится один раз и используется и печатью, и экспортом в PDF */
  const buildReportOptions = (): ReportOptions | null => {
    if (details.length === 0) return null
    const sections: ReportSection[] = [
      {
        title: 'Участники сравнения',
        rows: details.map((d, i) => ({
          label: `${i + 1}. ${d.model.name} ${d.trim.name}`,
          value: d.trim.basePrice !== null ? fmtMoney(d.trim.basePrice) : 'нет данных',
        })),
      },
      {
        title: 'Характеристики',
        rows: specRows
          .filter((r) => r.label !== 'Источник цены')
          .map((r) => ({ label: r.label, value: r.values.map((v) => v ?? '—').join(' | ') })),
      },
      {
        title: `Кредит (${term} мес, ставка ${String(rate).replace('.', ',')}%, взнос ${downPct}%)`,
        rows: [
          { label: 'Ежемесячный платёж', value: credit.map((c) => fmtMoney(c.payment)).join(' | ') },
          { label: 'Сумма кредита', value: credit.map((c) => fmtMoney(c.creditAmount)).join(' | ') },
          { label: 'Всего выплат по кредиту', value: credit.map((c) => fmtMoney(c.totalPaid)).join(' | ') },
        ],
      },
      {
        title: `Эксплуатация (${fmtNumber(mileageNum)} км/год, топливо ${fmtNumber(fuelPriceNum)} ₽/л)`,
        rows: [
          {
            label: 'Расход (смешанный)',
            value: operating.map((o) => (o.consumption !== null ? `${fmtNumber(o.consumption)} л/100 км` : 'нет данных')).join(' | '),
          },
          {
            label: 'Топливо в год',
            value: operating.map((o) => (o.fuelPerYear !== null ? fmtMoney(o.fuelPerYear) : 'нет данных')).join(' | '),
          },
        ],
      },
      {
        title: 'Различия в оснащении',
        rows: grouped.flatMap(([group, rows]) =>
          rows.map((r) => ({
            label: `${group}: ${r.feature}`,
            value: trimIds.map((id) => availabilityLabel(r.values[id] ?? 'unknown')).join(' | '),
          })),
        ),
      },
    ]
    return {
      title: 'Сравнение комплектаций HAVAL',
      subtitle: details.map((d) => `${d.model.name} ${d.trim.name}`).join(' · '),
      sections,
      disclaimers: [
        'Расчёт кредита — математическая симуляция, не оферта и не одобрение кредита.',
        'Отсутствие сведений об оснащении не означает отсутствие функции: значение «не подтверждено» значит, что официальный документ не раскрывает позицию.',
        'Цены — МЦП из официальных прайс-листов haval.ru; выгоды применяются только при выполнении условий.',
      ],
      sourceNote: 'Источник данных: официальные каталоги и прайс-листы haval.ru.',
    }
  }

  const handleExport = () => {
    const options = buildReportOptions()
    if (!options) return
    const ok = openReport(options)
    track('export_print', { kind: 'comparison', count: details.length })
    if (!ok) setSavedNote('Браузер заблокировал окно печати — разрешите всплывающие окна для этого сайта.')
  }

  return (
    <div className="animate-page-enter flex flex-col gap-4">
      <Header />

      {/* Выбор участников */}
      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12.5px] font-bold text-[#F3F4F4]">
            Выбрано {details.length} из {MAX_COMPARE}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" className="min-h-[38px]" onClick={clear}>
              <TrashIcon className="h-3.5 w-3.5" /> Очистить
            </Button>
            <Button type="button" variant="secondary" className="min-h-[38px]" onClick={handleSave}>
              <HeartIcon className="h-3.5 w-3.5" /> Сохранить сравнение
            </Button>
            <Button type="button" className="min-h-[38px]" onClick={handleExport}>
              <DownloadIcon className="h-3.5 w-3.5" /> Печать
            </Button>
            <PdfExportButton getOptions={buildReportOptions} filename="sravnenie" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {details.map((d, i) => (
            <div key={d.trim.id} className="flex flex-col gap-2 rounded-[10px] border border-[#363B43] bg-[#0E1013]/70 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#A9AFB7]">Вариант {i + 1}</p>
                  <Link to={`/models/${d.model.slug}`} className="text-[13px] font-bold text-[#F3F4F4] hover:text-[#E4002B]">
                    {d.model.name}
                  </Link>
                  <p className="text-[11.5px] text-[#A9AFB7]">{d.trim.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(d.trim.id)}
                  aria-label={`Убрать ${d.model.name} ${d.trim.name} из сравнения`}
                  className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[#363B43] text-[#A9AFB7] hover:text-[#EF4444]"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="font-display-num text-[18px] font-bold text-[#F3F4F4]">
                {d.trim.basePrice !== null ? fmtMoney(d.trim.basePrice) : 'нет данных'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <FavoriteButton modelId={d.model.id} trimId={d.trim.id} />
                <Link
                  to={`/calculator?trim=${d.trim.id}`}
                  className="flex min-h-[38px] items-center rounded-[8px] border border-[#363B43] bg-[#23272D] px-2.5 text-[11.5px] font-bold text-[#A9AFB7] hover:text-[#F3F4F4]"
                >
                  В калькулятор
                </Link>
              </div>
            </div>
          ))}
          {details.length < MAX_COMPARE && <ComparePicker onAdd={add} compact />}
        </div>
        {savedNote && <Callout tone="success">{savedNote}</Callout>}
      </Card>

      {/* Стоимость перехода */}
      <SectionTitle tip="Разница в цене между соседними вариантами сравнения — помогает понять, сколько стоит переход на следующую комплектацию.">
        Цена и стоимость перехода
      </SectionTitle>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {details.map((d, i) => {
          const prev = i > 0 ? details[i - 1] : null
          const diff =
            prev && d.trim.basePrice !== null && prev.trim.basePrice !== null
              ? d.trim.basePrice - prev.trim.basePrice
              : null
          return (
            <StatTile
              key={d.trim.id}
              label={d.model.name}
              value={d.trim.basePrice !== null ? fmtMoney(d.trim.basePrice) : 'нет данных'}
              hint={
                diff === null
                  ? d.trim.name
                  : `${d.trim.name} · ${diff >= 0 ? '+' : '−'}${fmtMoney(Math.abs(diff))} к предыдущему`
              }
              tone={i === 0 ? 'accent' : 'default'}
            />
          )
        })}
      </div>

      {/* Кредитные платежи */}
      <SectionTitle
        tip={`Параметры кредита общие для всех вариантов: срок ${term} мес, ставка ${String(rate).replace('.', ',')}%, взнос ${downPct}%. Изменяются во вкладке «Кредит» — сравнение пересчитается.`}
        action={
          <Link to="/calculator" className="text-[12px] font-bold text-[#A9AFB7] hover:text-[#F3F4F4]">
            Изменить параметры →
          </Link>
        }
      >
        Кредитные платежи
      </SectionTitle>
      <DataTable head={['Показатель', ...details.map((d) => `${d.model.name} ${d.trim.name}`)]}>
        <tr>
          <TableCell sticky>Ежемесячный платёж</TableCell>
          {credit.map((c, i) => (
            <TableCell key={details[i].trim.id} strong>
              {c.price > 0 ? fmtMoney(c.payment) : '—'}
            </TableCell>
          ))}
        </tr>
        <tr>
          <TableCell sticky>Первоначальный взнос ({downPct}%)</TableCell>
          {credit.map((c, i) => (
            <TableCell key={details[i].trim.id}>{fmtMoney(c.down)}</TableCell>
          ))}
        </tr>
        <tr>
          <TableCell sticky>Сумма кредита</TableCell>
          {credit.map((c, i) => (
            <TableCell key={details[i].trim.id}>{fmtMoney(c.creditAmount)}</TableCell>
          ))}
        </tr>
        <tr>
          <TableCell sticky>Всего выплат по кредиту</TableCell>
          {credit.map((c, i) => (
            <TableCell key={details[i].trim.id}>{fmtMoney(c.totalPaid)}</TableCell>
          ))}
        </tr>
        <tr>
          <TableCell sticky>Переплата по процентам</TableCell>
          {credit.map((c, i) => (
            <TableCell key={details[i].trim.id}>
              <span className="text-[#E4002B]">{fmtMoney(Math.max(0, c.totalPaid - c.creditAmount))}</span>
            </TableCell>
          ))}
        </tr>
        <tr>
          <TableCell sticky>Итого затраты на приобретение</TableCell>
          {credit.map((c, i) => (
            <TableCell key={details[i].trim.id} strong>
              {fmtMoney(c.down + c.totalPaid)}
            </TableCell>
          ))}
        </tr>
      </DataTable>

      {/* Эксплуатационные расходы */}
      <SectionTitle tip="Расход топлива — из официального прайс-листа. Цена топлива и годовой пробег задаются вами: выдуманные тарифы не подставляются. ТО, страховка и налог считаются в разделе «Стоимость владения».">
        Эксплуатационные расходы
      </SectionTitle>
      <Card className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label="Годовой пробег"
            suffix="км"
            inputMode="numeric"
            value={mileage}
            onChange={(e) => setMileage(e.target.value)}
          />
          <Field
            label="Цена топлива"
            suffix="₽/л"
            inputMode="decimal"
            value={fuelPrice}
            onChange={(e) => setFuelPrice(e.target.value)}
          />
        </div>
        <DataTable head={['Показатель', ...details.map((d) => d.model.name)]}>
          <tr>
            <TableCell sticky>Расход (смешанный цикл)</TableCell>
            {operating.map((o, i) => (
              <TableCell key={details[i].trim.id}>
                {o.consumption !== null ? `${fmtNumber(o.consumption)} л/100 км` : <Tag tone="warn">нет данных</Tag>}
              </TableCell>
            ))}
          </tr>
          <tr>
            <TableCell sticky>Топливо в год</TableCell>
            {operating.map((o, i) => (
              <TableCell key={details[i].trim.id}>
                {o.fuelPerYear !== null ? fmtMoney(o.fuelPerYear) : '—'}
              </TableCell>
            ))}
          </tr>
          <tr>
            <TableCell sticky>Стоимость 1 км (только топливо)</TableCell>
            {operating.map((o, i) => (
              <TableCell key={details[i].trim.id}>
                {o.fuelPerYear !== null && mileageNum > 0
                  ? `${fmtNumber(o.fuelPerYear / mileageNum)} ₽/км`
                  : '—'}
              </TableCell>
            ))}
          </tr>
          <tr>
            <TableCell sticky>Платёж + топливо в месяц</TableCell>
            {operating.map((o, i) => (
              <TableCell key={details[i].trim.id} strong>
                {fmtMoney(credit[i].payment + (o.fuelPerYear !== null ? o.fuelPerYear / 12 : 0))}
              </TableCell>
            ))}
          </tr>
        </DataTable>
        <p className="text-[11px] leading-relaxed text-[#A9AFB7]">
          Кредитный платёж и эксплуатационные расходы показаны раздельно и не суммируются в «стоимость автомобиля»:
          переплата по кредиту и расходы на топливо — разные статьи. Полная стоимость владения с ТО, страховкой и
          налогом — в разделе{' '}
          <Link to="/ownership" className="underline underline-offset-2 hover:text-[#F3F4F4]">
            «Стоимость владения»
          </Link>
          .
        </p>
      </Card>

      {/* Характеристики */}
      <SectionTitle tip="Значения перенесены из официальных прайс-листов без изменений. «Нет данных» означает, что документ не раскрывает параметр.">
        Характеристики
      </SectionTitle>
      <DataTable head={['Параметр', ...details.map((d) => `${d.model.name} ${d.trim.name}`)]}>
        {specRows.map((r) => (
          <tr key={r.label}>
            <TableCell sticky>{r.label}</TableCell>
            {r.values.map((v, i) => (
              <TableCell key={details[i].trim.id}>
                {r.label === 'Источник цены' && v ? (
                  <a href={v} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-[#F3F4F4]">
                    открыть
                  </a>
                ) : (
                  v ?? <span className="text-[#A9AFB7]">нет данных</span>
                )}
              </TableCell>
            ))}
          </tr>
        ))}
      </DataTable>

      {/* Оснащение */}
      <SectionTitle
        tip="Значения: есть / нет / доступно опционально / не подтверждено официальными данными. Отсутствие сведений не считается доказательством отсутствия функции."
        action={
          <button
            type="button"
            onClick={() => setOnlyDiff((v) => !v)}
            aria-pressed={onlyDiff}
            className="min-h-[36px] rounded-[8px] border border-[#363B43] bg-[#1A1D22] px-3 text-[11.5px] font-bold text-[#A9AFB7] transition-colors hover:text-[#F3F4F4]"
          >
            {onlyDiff ? 'Показать все позиции' : 'Только различия'}
          </button>
        }
      >
        Оснащение
      </SectionTitle>

      {grouped.length === 0 ? (
        <Callout tone="info">
          Различий в оснащении между выбранными комплектациями не найдено — либо позиции совпадают, либо официальный
          документ не раскрывает их для этих комплектаций. Переключите режим «Показать все позиции».
        </Callout>
      ) : (
        <div className="flex flex-col gap-3">
          {grouped.map(([group, rows]) => (
            <Card key={group} className="flex flex-col gap-2">
              <p className="text-[12px] font-bold uppercase tracking-wider text-[#E4002B]">{group}</p>
              <DataTable head={['Позиция', ...details.map((d) => d.trim.name)]} className="border-0">
                {rows.map((r) => (
                  <tr key={r.feature}>
                    <TableCell sticky>{r.feature}</TableCell>
                    {trimIds.map((id) => (
                      <TableCell key={id} className="text-center">
                        <Availability value={r.values[id] ?? 'unknown'} />
                      </TableCell>
                    ))}
                  </tr>
                ))}
              </DataTable>
            </Card>
          ))}
        </div>
      )}

      <Callout tone="warn" title="Ограничения сравнения">
        Оснащение сравнивается по официальным прайс-листам производителя. Если документ не публикует позицию для
        комплектации, она помечена как «не подтверждено» — это не означает, что функции нет. Цены указаны как МЦП и не
        являются публичной офертой; выгоды по трейд-ин и специальным программам применяются только при выполнении
        условий.
      </Callout>
    </div>
  )
}

function Header() {
  return (
    <header className="flex flex-col gap-1.5">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#E4002B]">До трёх автомобилей</p>
      <h1 className="font-display-num text-[26px] font-bold uppercase tracking-wide text-[#F3F4F4] sm:text-[32px]">
        Сравнение комплектаций
      </h1>
      <p className="max-w-2xl text-[12.5px] leading-relaxed text-[#A9AFB7]">
        Цена, характеристики, оснащение по группам, кредитные платежи и эксплуатационные расходы — в одной таблице.
        Можно сравнивать разные комплектации одной модели и разные модели HAVAL.
      </p>
    </header>
  )
}

function ComparePicker({ onAdd, compact = false }: { onAdd: (id: string) => boolean; compact?: boolean }) {
  const [modelId, setModelId] = useState(MODELS[0].id)
  const [trimId, setTrimId] = useState('')
  const trims = trimsForModel(modelId)

  useEffect(() => {
    setTrimId(trims[0]?.id ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps -- сброс выбора при смене модели
  }, [modelId])

  return (
    <div className={`flex flex-col gap-2 rounded-[10px] border border-dashed border-[#363B43] p-3 ${compact ? '' : ''}`}>
      <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#A9AFB7]">Добавить к сравнению</p>
      <Select label="Модель" value={modelId} onChange={(e) => setModelId(e.target.value)}>
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
      <Button
        type="button"
        variant="secondary"
        className="min-h-[40px]"
        disabled={!trimId}
        onClick={() => {
          const added = onAdd(trimId)
          track('compare_start', { trim: trimId, added })
        }}
      >
        Добавить
      </Button>
    </div>
  )
}

function Availability({ value }: { value: FeatureAvailability }) {
  if (value === 'standard') return <Tag tone="success">есть</Tag>
  if (value === 'optional') return <Tag tone="warn">опция</Tag>
  if (value === 'unavailable') return <Tag>нет</Tag>
  return <Tag>не подтверждено</Tag>
}

function availabilityLabel(value: FeatureAvailability): string {
  switch (value) {
    case 'standard':
      return 'есть'
    case 'optional':
      return 'опционально'
    case 'unavailable':
      return 'нет'
    default:
      return 'не подтверждено'
  }
}

function priceTypeLabel(type: string): string {
  switch (type) {
    case 'msrp':
      return 'МЦП (рекомендованная)'
    case 'trade-in':
      return 'с трейд-ин'
    case 'with-benefit':
      return 'с выгодой'
    case 'stock':
      return 'в наличии'
    case 'credit':
      return 'по кредитной программе'
    case 'teaser':
      return 'тизер дилера'
    default:
      return '—'
  }
}
