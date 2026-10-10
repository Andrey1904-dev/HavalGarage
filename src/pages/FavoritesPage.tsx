import { Link, useNavigate } from 'react-router-dom'
import { Button, Callout, Card, DataTable, EmptyState, SectionTitle, TableCell, Tag } from '../components/ui'
import {
  BookmarkIcon,
  CompareIcon,
  DownloadIcon,
  HeartIcon,
  SavingsIcon,
  TrashIcon,
} from '../components/icons'
import { getModel, getTrim, trimDetails } from '../data/haval'
import { useSaved } from '../context/SavedContext'
import { useCompare } from '../context/CompareContext'
import { useCalculator } from '../context/CalculatorContext'
import { fmtDate, fmtMoney } from '../utils/format'
import { openReport, type ReportOptions, type ReportSection } from '../utils/export'
import PdfExportButton from '../components/PdfExportButton'
import { clearAppStorage } from '../utils/storage'
import { useSeo } from '../utils/seo'
import { track } from '../utils/analytics'
import { useState } from 'react'

/**
 * Избранное и сохранённые расчёты.
 *
 * Хранение — только localStorage браузера: регистрация не нужна, персональные
 * финансовые данные на сервер не отправляются. Расчёты можно повторно открыть,
 * сравнить, напечатать или сохранить в PDF через диалог печати браузера.
 */
export default function FavoritesPage() {
  const {
    storageAvailable,
    favorites,
    calculations,
    comparisons,
    plans,
    removeFavorite,
    removeCalculation,
    removeComparison,
    removePlan,
    clearAll,
  } = useSaved()
  const navigate = useNavigate()
  const { set: setCompare } = useCompare()
  const { update, selectModel } = useCalculator()
  const [note, setNote] = useState('')

  useSeo({
    title: 'Избранное и сохранённые расчёты | HAVAL Гараж',
    description:
      'Сохранённые автомобили, сравнения комплектаций, параметры кредита и планы накопления — локально в браузере, ' +
      'без регистрации. Повторное открытие, печать и экспорт в PDF.',
    path: '/favorites',
    noindex: true,
  })

  const isEmpty =
    favorites.length === 0 && calculations.length === 0 && comparisons.length === 0 && plans.length === 0

  const openCalculation = (id: string) => {
    const calc = calculations.find((c) => c.id === id)
    if (!calc) return
    selectModel(calc.modelId)
    update({
      trimId: calc.trimId,
      termMonths: calc.termMonths,
      annualRate: String(calc.annualRate).replace('.', ','),
      downPaymentMode: 'percent',
      downPaymentPercent: String(Math.round(calc.downPaymentPct)),
    })
    track('calculator_open', { source: 'saved', model: calc.modelId })
    navigate('/calculator')
  }

  /** Отчёт строится один раз и используется и печатью, и экспортом в PDF */
  const buildCalculationReport = (id: string): ReportOptions | null => {
    const c = calculations.find((x) => x.id === id)
    if (!c) return null
    const sections: ReportSection[] = [
      {
        title: 'Автомобиль',
        rows: [
          { label: 'Модель и комплектация', value: `${c.modelName}${c.trimName ? ` · ${c.trimName}` : ''}` },
          { label: 'Цена', value: fmtMoney(c.vehiclePrice) },
          { label: 'Тип цены', value: c.priceType },
          ...(c.discountApplied > 0
            ? [{ label: 'Подтверждённая выгода', value: `−${fmtMoney(c.discountApplied)}` }]
            : []),
          { label: 'Цена с учётом выгоды', value: fmtMoney(c.effectivePrice) },
        ],
      },
      {
        title: 'Кредит',
        rows: [
          { label: 'Первоначальный взнос', value: `${fmtMoney(c.downPayment)} (${c.downPaymentPct.toFixed(0)}%)` },
          { label: 'Сумма кредита', value: fmtMoney(c.creditAmount) },
          { label: 'Срок', value: `${c.termMonths} мес` },
          { label: 'Ставка', value: `${String(c.annualRate).replace('.', ',')}% годовых` },
          { label: 'Программа', value: c.programName ?? 'свободный расчёт' },
          { label: 'Ежемесячный платёж', value: fmtMoney(c.monthlyPayment), tone: 'accent' },
          { label: 'Всего выплат по кредиту', value: fmtMoney(c.totalPaid) },
          { label: 'Переплата по процентам', value: fmtMoney(c.interestOverpay) },
          { label: 'Дополнительные расходы', value: fmtMoney(c.extraCosts) },
          { label: 'Итого затрат на приобретение', value: fmtMoney(c.totalCost), tone: 'accent' },
        ],
      },
      ...(c.tcoSummary ? [{ title: 'Стоимость владения', rows: [{ label: 'Итог', value: c.tcoSummary }] }] : []),
    ]
    return {
      title: 'Расчёт кредита',
      subtitle: `${c.modelName}${c.trimName ? ` · ${c.trimName}` : ''} · сохранён ${fmtDate(c.createdAt)}`,
      sections,
      disclaimers: [
        'Расчёт является математической симуляцией и не является офертой, рекламой ставки или одобрением кредита.',
        'Цены — МЦП из официальных прайс-листов haval.ru, не публичная оферта.',
        'Выгода применяется только при выполнении условий соответствующей программы.',
      ],
      sourceNote: 'Источник данных: официальные каталоги и прайс-листы haval.ru.',
    }
  }

  const exportCalculation = (id: string) => {
    const options = buildCalculationReport(id)
    if (!options) return
    const ok = openReport(options)
    track('export_print', { kind: 'calculation' })
    if (!ok) setNote('Браузер заблокировал окно печати — разрешите всплывающие окна для этого сайта.')
  }

  return (
    <div className="animate-page-enter flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#E4002B]">Локально в браузере</p>
          <h1 className="font-display-num text-[26px] font-bold uppercase tracking-wide text-[#F3F4F4] sm:text-[32px]">
            Избранное и расчёты
          </h1>
          <p className="max-w-2xl text-[12.5px] leading-relaxed text-[#A9AFB7]">
            Сохранённые автомобили, сравнения, параметры кредита и планы покупки. Регистрация не требуется, данные не
            отправляются на сервер: всё хранится в localStorage этого браузера.
          </p>
        </div>
        {!isEmpty && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                clearAll()
                clearAppStorage()
                setNote('Все сохранённые данные удалены из этого браузера.')
              }}
            >
              <TrashIcon className="h-4 w-4" /> Очистить всё
            </Button>
          </div>
        )}
      </header>

      {!storageAvailable && (
        <Callout tone="warn" title="Локальное хранилище недоступно">
          Браузер блокирует localStorage (приватный режим или настройки сайта). Сохранение не работает, но все
          калькуляторы продолжают считать в текущей сессии.
        </Callout>
      )}

      {note && <Callout tone="success">{note}</Callout>}

      {isEmpty ? (
        <EmptyState
          icon={<HeartIcon className="h-6 w-6" />}
          title="Пока ничего не сохранено"
          text="Добавляйте модели и комплектации в избранное, сохраняйте сравнения и расчёты — они появятся здесь и переживут перезагрузку страницы."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/catalog">
                <Button type="button">В каталог</Button>
              </Link>
              <Link to="/calculator">
                <Button type="button" variant="secondary">
                  К кредитному калькулятору
                </Button>
              </Link>
            </div>
          }
        />
      ) : (
        <>
          {/* ---------------- Избранное ---------------- */}
          {favorites.length > 0 && (
            <>
              <SectionTitle tip="Избранное хранится локально: модели и конкретные комплектации.">
                Избранные автомобили ({favorites.length})
              </SectionTitle>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {favorites.map((f) => {
                  const model = getModel(f.modelId)
                  const trim = f.trimId ? getTrim(f.trimId) : null
                  const d = f.trimId ? trimDetails(f.trimId) : null
                  if (!model) return null
                  return (
                    <Card key={f.id} className="flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#A9AFB7]">
                            {f.kind === 'trim' ? 'Комплектация' : 'Модель'} · {fmtDate(f.addedAt)}
                          </p>
                          <Link to={`/models/${model.slug}`} className="text-[14px] font-bold text-[#F3F4F4] hover:text-[#E4002B]">
                            {model.name}
                          </Link>
                          {trim && <p className="text-[11.5px] text-[#A9AFB7]">{trim.name}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFavorite(f.id)}
                          aria-label="Убрать из избранного"
                          className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#363B43] text-[#A9AFB7] hover:text-[#EF4444]"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="font-display-num text-[20px] font-bold text-[#F3F4F4]">
                        {trim?.basePrice !== null && trim?.basePrice !== undefined
                          ? fmtMoney(trim.basePrice)
                          : d?.model
                            ? 'цена от — см. модель'
                            : 'нет данных'}
                      </p>
                      <div className="mt-auto flex flex-wrap gap-2">
                        {trim && trim.basePrice !== null && (
                          <Button
                            type="button"
                            variant="secondary"
                            className="min-h-[38px]"
                            onClick={() => {
                              selectModel(model.id)
                              update({ trimId: trim.id })
                              navigate('/calculator')
                            }}
                          >
                            Рассчитать
                          </Button>
                        )}
                        {trim && (
                          <Link
                            to={`/compare?trims=${trim.id}`}
                            className="flex min-h-[38px] items-center gap-1.5 rounded-[8px] border border-[#363B43] bg-[#23272D] px-2.5 text-[11.5px] font-bold text-[#A9AFB7] hover:text-[#F3F4F4]"
                            onClick={() => setCompare([trim.id])}
                          >
                            <CompareIcon className="h-3.5 w-3.5" /> Сравнить
                          </Link>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            </>
          )}

          {/* ---------------- Сохранённые расчёты ---------------- */}
          {calculations.length > 0 && (
            <>
              <SectionTitle tip="Расчёты сохраняются вместе с параметрами кредита: их можно повторно открыть, напечатать или выгрузить в PDF.">
                Сохранённые расчёты ({calculations.length})
              </SectionTitle>
              <DataTable head={['Расчёт', 'Платёж', 'Взнос', 'Срок и ставка', 'Сохранён', 'Действия']}>
                {calculations.map((c) => (
                  <tr key={c.id}>
                    <TableCell sticky>
                      {c.modelName}
                      {c.trimName && <span className="block text-[10.5px] font-normal text-[#A9AFB7]">{c.trimName}</span>}
                      {c.programName && <Tag tone="accent">{c.programName}</Tag>}
                    </TableCell>
                    <TableCell strong>{fmtMoney(c.monthlyPayment)}</TableCell>
                    <TableCell>
                      {fmtMoney(c.downPayment)}
                      <span className="block text-[10.5px] text-[#A9AFB7]">{c.downPaymentPct.toFixed(0)}%</span>
                    </TableCell>
                    <TableCell>
                      {c.termMonths} мес · {String(c.annualRate).replace('.', ',')}%
                    </TableCell>
                    <TableCell>{fmtDate(c.createdAt)}</TableCell>
                    <TableCell>
                      <span className="flex flex-wrap gap-1.5">
                        <Button type="button" variant="ghost" className="min-h-[34px] px-2" onClick={() => openCalculation(c.id)}>
                          Открыть
                        </Button>
                        <PdfExportButton
                          getOptions={() => buildCalculationReport(c.id)}
                          filename={`raschet-${c.modelName}`}
                          label="PDF"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          className="min-h-[34px] px-2"
                          onClick={() => exportCalculation(c.id)}
                        >
                          <DownloadIcon className="h-3.5 w-3.5" /> Печать
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="min-h-[34px] px-2"
                          onClick={() => removeCalculation(c.id)}
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </Button>
                      </span>
                    </TableCell>
                  </tr>
                ))}
              </DataTable>
            </>
          )}

          {/* ---------------- Сохранённые сравнения ---------------- */}
          {comparisons.length > 0 && (
            <>
              <SectionTitle tip="Сравнения сохраняются набором комплектаций — открываются одним кликом.">
                Сохранённые сравнения ({comparisons.length})
              </SectionTitle>
              <div className="flex flex-col gap-2.5">
                {comparisons.map((c) => (
                  <Card key={c.id} className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-[13px] font-bold text-[#F3F4F4]">{c.title}</p>
                      <p className="text-[11px] text-[#A9AFB7]">
                        Сохранено {fmtDate(c.createdAt)} · {c.trimIds.length} комплектации
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/compare?trims=${c.trimIds.join(',')}`}>
                        <Button type="button" variant="secondary" className="min-h-[38px]" onClick={() => setCompare(c.trimIds)}>
                          Открыть сравнение
                        </Button>
                      </Link>
                      <Button type="button" variant="ghost" className="min-h-[38px]" onClick={() => removeComparison(c.id)}>
                        <TrashIcon className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* ---------------- Планы ---------------- */}
          {plans.length > 0 && (
            <>
              <SectionTitle tip="Планы накопления и расчёты стоимости владения — с параметрами для повторного открытия.">
                Планы и расчёты владения ({plans.length})
              </SectionTitle>
              <div className="flex flex-col gap-2.5">
                {plans.map((p) => (
                  <Card key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="flex items-center gap-2 text-[13px] font-bold text-[#F3F4F4]">
                        <SavingsIcon className="h-4 w-4 text-[#E4002B]" />
                        {p.title}
                      </p>
                      <p className="text-[11.5px] text-[#A9AFB7]">{p.summary}</p>
                      <p className="mt-0.5 text-[10.5px] text-[#A9AFB7]">
                        {fmtDate(p.createdAt)} · тип: {p.kind === 'savings' ? 'план/владение' : p.kind}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link to="/plan">
                        <Button type="button" variant="secondary" className="min-h-[38px]">
                          <BookmarkIcon className="h-3.5 w-3.5" /> К плану покупки
                        </Button>
                      </Link>
                      <Button type="button" variant="ghost" className="min-h-[38px]" onClick={() => removePlan(p.id)}>
                        <TrashIcon className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}

          <Callout tone="info" title="Приватность">
            Персональные финансовые данные не сохраняются на сервере: избранное, расчёты и планы живут только в этом
            браузере. Очистка данных сайта удаляет их безвозвратно — приложение продолжит работать с пустым состоянием.
            Имя и телефон отправляются в базу только при явной отправке заявки в кредитном калькуляторе.
          </Callout>
        </>
      )}
    </div>
  )
}
