import { useMemo, useState } from 'react'
import { Button, Callout, Card, Field, InfoTip, Select, Tag } from '../ui'
import PriceMeta from '../PriceMeta'
import ScheduleChart from './ScheduleChart'
import { useCalculator } from '../../context/CalculatorContext'
import { useSaved } from '../../context/SavedContext'
import { CREDIT_PROGRAMS, MODELS, programsForModel, programRateFor } from '../../data/haval'
import { TERM_OPTIONS, MAX_TERM, MIN_TERM } from '../../utils/credit'
import { fmtMoney, parseLocaleNumber, plural } from '../../utils/format'
import { AlertIcon, CheckIcon, DownloadIcon, HeartIcon, PercentIcon, RefreshIcon } from '../icons'
import { openReport } from '../../utils/export'
import { track } from '../../utils/analytics'

/**
 * Главный расчётный сценарий: модель → комплектация → цена → скидка →
 * взнос (₽ или %) → срок → ставка → мгновенный пересчёт.
 * Математика — аннуитет (utils/loan.ts), нулевая ставка обрабатывается
 * отдельной веткой.
 */
export default function PurchaseCalculator() {
  const {
    state,
    update,
    selectModel,
    trims,
    trim,
    offers,
    plan,
    program,
    programRate,
    rateScenario,
    programViolations,
    effectiveRate,
  } = useCalculator()
  const { saveCalculation } = useSaved()
  const [note, setNote] = useState('')

  const model = MODELS.find((m) => m.id === state.modelId)
  const currentTrims = trims.filter((t) => t.status === 'current')
  const modelPrograms = programsForModel(state.modelId)

  const suggestedRate = useMemo(() => {
    const pct = plan.ok ? plan.plan.downPaymentPct : parseLocaleNumber(state.downPaymentPercent) || 0
    for (const p of programsForModel(state.modelId)) {
      if (!p.rateBands) continue
      const rate = programRateFor(p.id, state.modelId, pct, state.termMonths)
      if (rate !== null) return { program: p, rate }
    }
    return null
  }, [state.modelId, state.termMonths, state.downPaymentPercent, plan])

  const dpPct = plan.ok ? plan.plan.downPaymentPct : 0

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_1fr]">
      {/* -------- Параметры -------- */}
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-3.5">
          <div className="flex items-center gap-2">
            <span className="h-4 w-1 rounded-full bg-[#E4002B]" aria-hidden="true" />
            <h3 className="font-display-num text-[16px] font-bold uppercase tracking-wide">Автомобиль</h3>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select label="Модель" value={state.modelId} onChange={(e) => selectModel(e.target.value)}>
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
            <Select
              label="Комплектация"
              value={trim?.id ?? ''}
              onChange={(e) => update({ trimId: e.target.value })}
              disabled={currentTrims.length === 0}
            >
              {currentTrims.length === 0 && <option value="">Нет подтверждённых цен</option>}
              {currentTrims.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.basePrice ? ` — ${fmtMoney(t.basePrice)}` : ''}
                </option>
              ))}
            </Select>
          </div>

          {trim ? (
            <div className="rounded-[10px] border border-[#363B43] bg-[#0E1013]/80 p-3.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A9AFB7]">
                  Стоимость автомобиля
                </p>
                <p className="font-display-num text-[24px] font-bold leading-none text-[#F3F4F4]">
                  {trim.basePrice !== null ? fmtMoney(trim.basePrice) : 'Нет данных'}
                </p>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#A9AFB7]">
                <span>
                  {[trim.engine !== 'Нет данных' ? trim.engine : null, trim.horsepower ? `${trim.horsepower} л.с.` : null, trim.transmission !== 'Нет данных' ? trim.transmission : null, trim.drivetrain !== 'Нет данных' ? trim.drivetrain : null]
                    .filter(Boolean)
                    .join(' · ') || 'Характеристики не опубликованы'}
                </span>
              </div>
              {trim.note && <p className="mt-1.5 text-[10.5px] leading-relaxed text-[#A9AFB7]">{trim.note}</p>}
              <div className="mt-2">
                <PriceMeta trim={trim} />
              </div>
            </div>
          ) : (
            <p className="rounded-[10px] border border-[#F5A623]/40 bg-[#F5A623]/10 px-3.5 py-2.5 text-[12px] text-[#F5A623]">
              По выбранной модели нет подтверждённых цен — расчёт недоступен.
            </p>
          )}

          {/* Скидки */}
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <span className="text-[12.5px] font-semibold text-[#A9AFB7]">Скидка / спецпредложение</span>
              <InfoTip title="Скидки">
                Применяются только подтверждённые предложения дилера. Процентные скидки (госпрограмма)
                считаются от цены комплектации. Можно задать свою скидку вручную — например, согласованную в салоне.
              </InfoTip>
            </div>
            <Select value={state.offerId} onChange={(e) => update({ offerId: e.target.value as typeof state.offerId })}>
              <option value="none">Без скидки</option>
              {offers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.offerType === 'state-support' ? 'Госпрограмма' : 'Спецпредложение'}
                  {o.discountPercent ? ` (до ${o.discountPercent}%)` : o.discountAmount ? ` (−${fmtMoney(o.discountAmount)})` : ''}
                </option>
              ))}
              <option value="custom">Своя скидка, ₽</option>
            </Select>
            {state.offerId === 'custom' && (
              <Field
                className="mt-2"
                label="Сумма скидки"
                suffix="₽"
                inputMode="numeric"
                value={state.customDiscountRub}
                onChange={(e) => update({ customDiscountRub: e.target.value })}
              />
            )}
            {state.offerId !== 'none' && state.offerId !== 'custom' && (
              <p className="mt-1.5 text-[10.5px] leading-relaxed text-[#A9AFB7]">
                {offers.find((o) => o.id === state.offerId)?.conditions}
              </p>
            )}
          </div>

          {/* Официальная кредитная программа */}
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <span className="text-[12.5px] font-semibold text-[#A9AFB7]">Сценарий расчёта ставки</span>
              <InfoTip title="Сценарии">
                Три разделённых сценария: свободный расчёт по вашей ставке; расчёт по опубликованным условиям
                официальной программы (ставка подставляется из таблицы «взнос × срок»); сценарий с неизвестными
                условиями банка — тогда расчёт помечается как предварительный.
              </InfoTip>
            </div>
            <Select
              value={state.programId}
              onChange={(e) => {
                update({ programId: e.target.value })
                track('credit_params_change', { program: e.target.value })
              }}
            >
              <option value="none">Свободный расчёт по введённой ставке</option>
              {CREDIT_PROGRAMS.filter((p) => modelPrograms.some((mp) => mp.id === p.id)).map((p) => (
                <option key={p.id} value={p.id}>
                  Официальная программа: {p.name}
                </option>
              ))}
            </Select>
            {program && (
              <p className="mt-1.5 text-[10.5px] leading-relaxed text-[#A9AFB7]">
                {program.name}: взнос {program.downPaymentMinPct}–{program.downPaymentMaxPct}%, срок{' '}
                {program.termMonthsMin}–{program.termMonthsMax} мес
                {program.requiredProducts.length > 0 ? `, условия: ${program.requiredProducts.join(', ')}` : ''}.{' '}
                <span
                  className={
                    rateScenario === 'program'
                      ? 'text-[#16B374]'
                      : 'text-[#F5A623]'
                  }
                >
                  {rateScenario === 'program'
                    ? `Ставка программы ${String(programRate).replace('.', ',')}% применена к расчёту.`
                    : 'Ставка программы для этой комбинации не опубликована — расчёт предварительный, по вашей ставке.'}
                </span>
              </p>
            )}
            {programViolations.length > 0 && (
              <Callout tone="warn" className="mt-2" title="Ограничения программы">
                <ul className="ml-4 list-disc">
                  {programViolations.map((v) => (
                    <li key={v}>{v}</li>
                  ))}
                </ul>
              </Callout>
            )}
          </div>
        </Card>

        <Card className="flex flex-col gap-3.5">
          <div className="flex items-center gap-2">
            <span className="h-4 w-1 rounded-full bg-[#E4002B]" aria-hidden="true" />
            <h3 className="font-display-num text-[16px] font-bold uppercase tracking-wide">Параметры кредита</h3>
          </div>

          {/* Первоначальный взнос: ₽ / % */}
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-semibold text-[#A9AFB7]">Первоначальный взнос</span>
              <div className="flex gap-1">
                {(['rub', 'percent'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => update({ downPaymentMode: m })}
                    className={`min-h-[32px] rounded-[8px] border px-2.5 text-[11.5px] font-bold transition-colors ${
                      state.downPaymentMode === m
                        ? 'border-[#E4002B] bg-[#E4002B]/12 text-[#F3F4F4]'
                        : 'border-[#363B43] bg-[#23272D] text-[#A9AFB7]'
                    }`}
                  >
                    {m === 'rub' ? '₽' : '%'}
                  </button>
                ))}
              </div>
            </div>
            {state.downPaymentMode === 'rub' ? (
              <Field
                label="Сумма взноса"
                suffix="₽"
                inputMode="numeric"
                placeholder="500 000"
                value={state.downPaymentRub}
                onChange={(e) => update({ downPaymentRub: e.target.value })}
                hint={plan.ok ? `Это ${dpPct.toFixed(1)}% стоимости после скидки` : undefined}
              />
            ) : (
              <Field
                label="Процент взноса"
                suffix="%"
                inputMode="decimal"
                placeholder="20"
                value={state.downPaymentPercent}
                onChange={(e) => update({ downPaymentPercent: e.target.value })}
                hint={plan.ok ? `В рублях: ${fmtMoney(plan.plan.downPayment)}` : undefined}
              />
            )}
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(Math.min(100, Math.max(0, dpPct)))}
              onChange={(e) => update({ downPaymentMode: 'percent', downPaymentPercent: e.target.value })}
              className="mt-2 w-full accent-[#E4002B]"
              aria-label="Первоначальный взнос, процентов"
            />
          </div>

          {/* Срок */}
          <div>
            <span className="mb-1.5 block text-[12.5px] font-semibold text-[#A9AFB7]">Срок кредита</span>
            <div className="flex flex-wrap gap-1.5">
              {TERM_OPTIONS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => update({ termMonths: t })}
                  className={`min-h-[38px] rounded-[8px] border px-3 text-[12px] font-bold transition-colors ${
                    state.termMonths === t
                      ? 'border-[#E4002B] bg-[#E4002B]/12 text-[#F3F4F4]'
                      : 'border-[#363B43] bg-[#23272D] text-[#A9AFB7] hover:text-[#F3F4F4]'
                  }`}
                >
                  {t} {plural(t, ['мес', 'мес', 'мес'])}
                </button>
              ))}
            </div>
            {!(TERM_OPTIONS as readonly number[]).includes(state.termMonths) && (
              <p className="mt-1.5 text-[11px] text-[#F5A623]">
                Выбран нестандартный срок: {state.termMonths} мес (допустимо {MIN_TERM}–{MAX_TERM}).
              </p>
            )}
          </div>

          {/* Ставка */}
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <span className="text-[12.5px] font-semibold text-[#A9AFB7]">Процентная ставка</span>
              <InfoTip title="Ставка">
                Расчётный сценарий: вы задаёте ставку сами. Кнопка «ставка программы» подставляет ставку
                официальной программы для выбранных взноса и срока — при выполнении её условий (взнос,
                срок, КАСКО). Это симуляция, а не одобрение банка.
              </InfoTip>
            </div>
            <div className="flex items-end gap-2">
              <Field
                className="flex-1"
                label=""
                suffix="%"
                inputMode="decimal"
                placeholder="16,4"
                value={state.annualRate}
                onChange={(e) => update({ annualRate: e.target.value, programId: 'none' })}
                badge={
                  rateScenario === 'program'
                    ? `в расчёте ${String(effectiveRate).replace('.', ',')}%`
                    : rateScenario === 'unknown'
                      ? 'предварительный'
                      : undefined
                }
              />
              {suggestedRate && (
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-[46px] whitespace-nowrap"
                  onClick={() => update({ annualRate: String(suggestedRate.rate).replace('.', ',') })}
                >
                  <PercentIcon className="h-3.5 w-3.5 text-[#E4002B]" />
                  {suggestedRate.program.name}: {String(suggestedRate.rate).replace('.', ',')}%
                </Button>
              )}
            </div>
            {suggestedRate && (
              <p className="mt-1.5 text-[10.5px] leading-relaxed text-[#A9AFB7]">
                Ставка по программе «{suggestedRate.program.name}» для взноса {Math.round(dpPct)}% и срока{' '}
                {state.termMonths} мес. Условия: {suggestedRate.program.requirements.join('; ')}.
              </p>
            )}
          </div>

          {/* Доп. расходы */}
          <Field
            label="Дополнительные расходы (необязательно)"
            suffix="₽"
            inputMode="numeric"
            placeholder="0"
            value={state.extraCostsRub}
            onChange={(e) => update({ extraCostsRub: e.target.value })}
            hint="Например, оценённая вами стоимость КАСКО или оборудования — добавляется к общим затратам, но не в тело кредита"
          />

          <Button type="button" variant="ghost" className="self-start" onClick={() => update({ offerId: 'none', programId: 'none', customDiscountRub: '0', extraCostsRub: '0', downPaymentPercent: '20', downPaymentMode: 'percent', termMonths: 60, annualRate: '16.4' })}>
            <RefreshIcon className="h-3.5 w-3.5" /> Сбросить параметры
          </Button>
        </Card>
      </div>

      {/* -------- Результаты -------- */}
      <div className="flex flex-col gap-4">
        {!plan.ok ? (
          <Card className="border-[#EF4444]/40">
            <div className="flex items-start gap-3">
              <AlertIcon className="h-5 w-5 shrink-0 text-[#EF4444]" />
              <div>
                <p className="text-[13px] font-bold text-[#EF4444]">Проверьте параметры</p>
                <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-4 text-[12px] text-[#A9AFB7]">
                  {plan.errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        ) : (
          <>
            <Card className="border-[#E4002B]/45 bg-gradient-to-b from-[#E4002B]/10 to-transparent">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#A9AFB7]">Ежемесячный платёж</p>
              </div>
              <p className="font-display-num mt-1 text-[38px] font-bold leading-none text-[#F3F4F4]">
                {plan.plan.noLoanNeeded ? '—' : fmtMoney(plan.plan.monthlyPayment)}
              </p>
              {plan.plan.noLoanNeeded ? (
                <p className="mt-2 flex items-center gap-1.5 text-[12px] text-[#16B374]">
                  <CheckIcon className="h-3.5 w-3.5" /> Взнос покрывает стоимость — кредит не требуется
                </p>
              ) : (
                <p className="mt-2 text-[11.5px] text-[#A9AFB7]">
                  {model?.name} · {trim?.name} · {state.termMonths} мес · ставка{' '}
                  {String(plan.plan.annualRate).replace('.', ',')}%
                  {rateScenario === 'program' && program ? ` (программа «${program.name}»)` : ''}
                  {rateScenario === 'unknown' ? ' — расчёт предварительный' : ''}
                </p>
              )}
            </Card>

            <Card className="flex flex-col gap-1.5">
              <ResultRow label="Стоимость автомобиля" value={fmtMoney(plan.plan.vehiclePrice)} />
              {plan.plan.discountApplied > 0 && (
                <ResultRow label="Подтверждённая скидка" value={`−${fmtMoney(plan.plan.discountApplied)}`} accent="#16B374" />
              )}
              <ResultRow label="Цена после скидки" value={fmtMoney(plan.plan.effectivePrice)} />
              <ResultRow label={`Первоначальный взнос (${plan.plan.downPaymentPct.toFixed(0)}%)`} value={fmtMoney(plan.plan.downPayment)} />
              <ResultRow label="Сумма кредита" value={fmtMoney(plan.plan.creditAmount)} />
              <ResultRow label="Срок кредитования" value={`${plan.plan.termMonths} мес`} />
              <ResultRow
                label="Процентная ставка"
                value={`${String(plan.plan.annualRate).replace('.', ',')}% годовых${
                  rateScenario === 'program' && program ? ` · ${program.name}` : ''
                }`}
              />
              <ResultRow label="Общая сумма выплат" value={fmtMoney(plan.plan.downPayment + plan.plan.totalPaid)} />
              <ResultRow label="Переплата по кредиту" value={`+${fmtMoney(plan.plan.interestOverpay)}`} accent="#E4002B" />
              {plan.plan.extraCosts > 0 && (
                <ResultRow label="Дополнительные расходы" value={fmtMoney(plan.plan.extraCosts)} />
              )}
              <div className="mt-1 border-t border-[#363B43] pt-2">
                <ResultRow label="Всего затрат" value={fmtMoney(plan.plan.totalCost)} strong />
              </div>
            </Card>

            {!plan.plan.noLoanNeeded && (
              <Card>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#A9AFB7]">
                  Структура платежей{state.termMonths > 24 ? ' по годам' : ' по месяцам'}
                </p>
                <ScheduleChart
                  creditAmount={plan.plan.creditAmount}
                  annualRate={plan.plan.annualRate}
                  termMonths={plan.plan.termMonths}
                />
              </Card>
            )}
          </>
        )}

        {plan.ok && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                saveCalculation({
                  title: `${model?.name ?? ''} ${trim?.name ?? ''}`.trim(),
                  modelId: state.modelId,
                  modelName: model?.name ?? state.modelId,
                  trimId: trim?.id ?? null,
                  trimName: trim?.name ?? null,
                  priceType: trim?.priceType ?? 'msrp',
                  vehiclePrice: plan.plan.vehiclePrice,
                  discountApplied: plan.plan.discountApplied,
                  effectivePrice: plan.plan.effectivePrice,
                  downPayment: plan.plan.downPayment,
                  downPaymentPct: plan.plan.downPaymentPct,
                  creditAmount: plan.plan.creditAmount,
                  termMonths: plan.plan.termMonths,
                  annualRate: plan.plan.annualRate,
                  monthlyPayment: plan.plan.monthlyPayment,
                  totalPaid: plan.plan.totalPaid,
                  interestOverpay: plan.plan.interestOverpay,
                  extraCosts: plan.plan.extraCosts,
                  totalCost: plan.plan.totalCost,
                  programId: program?.id ?? null,
                  programName: program?.name ?? null,
                  tcoSummary: null,
                })
                setNote('Расчёт сохранён в разделе «Избранное» (локально в браузере, без регистрации).')
              }}
            >
              <HeartIcon className="h-4 w-4" /> Сохранить расчёт
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                const ok = openReport({
                  title: 'Расчёт кредита',
                  subtitle: `${model?.name ?? ''}${trim ? ` · ${trim.name}` : ''}`,
                  sections: [
                    {
                      title: 'Автомобиль',
                      rows: [
                        { label: 'Модель', value: model?.name ?? '—' },
                        { label: 'Комплектация', value: trim?.name ?? '—' },
                        { label: 'Цена', value: fmtMoney(plan.plan.vehiclePrice) },
                        ...(plan.plan.discountApplied > 0
                          ? [{ label: 'Подтверждённая скидка', value: `−${fmtMoney(plan.plan.discountApplied)}` }]
                          : []),
                        { label: 'Цена после скидки', value: fmtMoney(plan.plan.effectivePrice) },
                      ],
                      note: trim ? `Источник цены: ${trim.priceSourceUrl}` : undefined,
                    },
                    {
                      title: 'Кредит',
                      rows: [
                        {
                          label: 'Первоначальный взнос',
                          value: `${fmtMoney(plan.plan.downPayment)} (${plan.plan.downPaymentPct.toFixed(0)}%)`,
                        },
                        { label: 'Сумма кредита', value: fmtMoney(plan.plan.creditAmount) },
                        { label: 'Срок', value: `${plan.plan.termMonths} мес` },
                        {
                          label: 'Ставка',
                          value: `${String(plan.plan.annualRate).replace('.', ',')}% годовых${
                            program ? ` · программа «${program.name}»` : ''
                          }`,
                        },
                        { label: 'Ежемесячный платёж', value: fmtMoney(plan.plan.monthlyPayment), tone: 'accent' },
                        { label: 'Общая сумма выплат', value: fmtMoney(plan.plan.totalPaid) },
                        { label: 'Переплата по процентам', value: fmtMoney(plan.plan.interestOverpay) },
                        { label: 'Дополнительные расходы', value: fmtMoney(plan.plan.extraCosts) },
                        { label: 'Итого затрат на приобретение', value: fmtMoney(plan.plan.totalCost), tone: 'accent' },
                      ],
                    },
                  ],
                  disclaimers: [
                    'Расчёт является математической симуляцией аннуитетной схемы и не является офертой или одобрением кредита.',
                    'Цены — МЦП из официальных прайс-листов haval.ru, не публичная оферта.',
                    'Скидка применяется только при выполнении условий соответствующей программы.',
                    ...(program ? program.requirements : []),
                  ],
                  sourceNote: trim ? `Источник: ${trim.priceSourceUrl}` : undefined,
                })
                track('export_print', { kind: 'credit' })
                if (!ok) setNote('Браузер заблокировал окно печати — разрешите всплывающие окна для этого сайта.')
                else setNote('Открыто окно печати: выберите «Сохранить как PDF» для выгрузки документа.')
              }}
            >
              <DownloadIcon className="h-4 w-4" /> Печать / PDF
            </Button>
          </div>
        )}

        {note && <Callout tone="success">{note}</Callout>}

        <Card className="bg-[#0E1013]">
          <p className="text-[10.5px] leading-relaxed text-[#A9AFB7]">
            Расчёт — математическая симуляция аннуитетной схемы и не является офертой, рекламой ставки или
            одобрением кредита. Фактические условия определяет банк. Официальные программы и их ограничения —
            на вкладке «Программы». {model && <>Модель: {model.name}. </>}
            <Tag tone="warn">данные о ценах: {trim?.priceUpdatedAt ?? '—'}</Tag>
          </p>
        </Card>
      </div>
    </div>
  )
}

function ResultRow({ label, value, accent, strong }: { label: string; value: string; accent?: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className={`text-[12px] ${strong ? 'font-bold text-[#F3F4F4]' : 'text-[#A9AFB7]'}`}>{label}</span>
      <span
        className={`font-display-num text-[14px] font-bold ${strong ? 'text-[17px] text-[#F3F4F4]' : ''}`}
        style={{ color: accent ?? '#F3F4F4' }}
      >
        {value}
      </span>
    </div>
  )
}
