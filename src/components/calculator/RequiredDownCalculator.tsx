import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Callout, Card, DataTable, Field, InfoTip, Select, StatTile, TableCell } from '../ui'
import { AlertIcon, CardIcon, PercentIcon, TrendDownIcon } from '../icons'
import { useCalculator } from '../../context/CalculatorContext'
import { useSaved } from '../../context/SavedContext'
import { CREDIT_PROGRAMS, MODELS, getTrim, trimsForModel } from '../../data/haval'
import { computeRequiredDownPayment } from '../../utils/required-down'
import { fmtMoney, parseLocaleNumber, pluralMonths } from '../../utils/format'
import { track } from '../../utils/analytics'

/**
 * Обратный расчёт первоначального взноса: «какой взнос нужен, чтобы платить меньше».
 *
 * Пользователь выбирает автомобиль и указывает желаемый платёж, срок, ставку и
 * дополнительные расходы, финансируемые кредитом. Расчёт показывает максимальную
 * сумму кредита, минимальный взнос, его долю от цены и необходимую сумму накоплений.
 * Проверяются лимиты официальной программы, если выбран соответствующий сценарий.
 */
export default function RequiredDownCalculator() {
  const { state: calcState, plan, update: calcUpdate } = useCalculator()
  const { savePlan } = useSaved()

  const [modelId, setModelId] = useState(calcState.modelId)
  const [trimId, setTrimId] = useState(calcState.trimId ?? trimsForModel(modelId)[0]?.id ?? '')
  const [targetPayment, setTargetPayment] = useState('')
  const [termMonths, setTermMonths] = useState(calcState.termMonths)
  const [rate, setRate] = useState(String(calcState.annualRate).replace('.', ','))
  const [financedExtra, setFinancedExtra] = useState('0')
  const [programId, setProgramId] = useState('none')
  const [note, setNote] = useState('')

  const trims = trimsForModel(modelId)
  const trim = getTrim(trimId)

  // подставляем желаемый платёж из текущего сценария, если поле пустое
  useEffect(() => {
    if (!targetPayment && plan.ok && plan.plan.monthlyPayment > 0) {
      setTargetPayment(String(Math.round(plan.plan.monthlyPayment)))
    }
     
  }, [plan, targetPayment])

  const result = useMemo(
    () =>
      computeRequiredDownPayment({
        vehiclePrice: trim?.basePrice ?? NaN,
        targetMonthlyPayment: parseLocaleNumber(targetPayment) || NaN,
        termMonths,
        annualRatePercent: parseLocaleNumber(rate) || 0,
        financedExtraCosts: Math.max(0, parseLocaleNumber(financedExtra) || 0),
        programId: programId === 'none' ? null : programId,
        modelId: programId === 'none' ? null : modelId,
      }),
    [trim?.basePrice, targetPayment, termMonths, rate, financedExtra, programId, modelId],
  )

  useEffect(() => {
    if (result.ok) {
      track('required_down_calculate', {
        trim: trimId || null,
        target: Math.round(parseLocaleNumber(targetPayment) || 0),
        required: Math.round(result.plan.minDownPayment),
        achievable: result.plan.achievable,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- событие аналитики на изменение результата
  }, [result])

  const handleSave = () => {
    if (!result.ok || !trim) return
    savePlan({
      kind: 'required-down',
      title: `Взнос под платёж ${fmtMoney(parseLocaleNumber(targetPayment) || 0)}: ${trim.name}`,
      summary: `Нужен взнос ${fmtMoney(result.plan.minDownPayment)} (${result.plan.downPaymentPct.toFixed(0)}% цены) · кредит ${fmtMoney(
        result.plan.maxLoanAmount,
      )} на ${pluralMonths(termMonths)}`,
      payload: {
        targetPayment: Math.round(parseLocaleNumber(targetPayment) || 0),
        minDownPayment: Math.round(result.plan.minDownPayment),
        downPaymentPct: Number(result.plan.downPaymentPct.toFixed(1)),
        maxLoanAmount: Math.round(result.plan.maxLoanAmount),
        termMonths,
        trimId,
      },
    })
    setNote('Расчёт сохранён в разделе «Избранное» (локально в браузере).')
  }

  const applyDownPayment = () => {
    if (!result.ok) return
    const down = Math.round(result.plan.minDownPayment)
    setModelIdAndTrim(modelId, trimId)
    calcUpdate({
      downPaymentMode: 'rub',
      downPaymentRub: String(down),
      termMonths,
      annualRate: String(result.plan.rate).replace('.', ','),
    })
  }

  function setModelIdAndTrim(nextModel: string, nextTrim: string) {
    if (nextModel !== calcState.modelId) {
      calcUpdate({ modelId: nextModel, trimId: nextTrim })
    } else {
      calcUpdate({ trimId: nextTrim })
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1fr]">
      <Card className="flex flex-col gap-3.5">
        <div className="flex items-center gap-2">
          <span className="h-4 w-1 rounded-full bg-[#E4002B]" aria-hidden="true" />
          <h3 className="font-display-num text-[16px] font-bold uppercase tracking-wide">
            Какой взнос нужен, чтобы платить меньше
          </h3>
          <InfoTip title="Обратный расчёт">
            Максимальная сумма кредита считается из желаемого платежа обратной аннуитетной формулой
            S = P · ((1+r)^n − 1) / (r · (1+r)^n). Минимальный взнос — разница между ценой автомобиля и этой суммой.
          </InfoTip>
        </div>

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

        <Field
          label="Желаемый ежемесячный платёж"
          suffix="₽"
          inputMode="numeric"
          placeholder="40 000"
          value={targetPayment}
          onChange={(e) => setTargetPayment(e.target.value)}
          hint={plan.ok ? `Текущий расчёт: ${fmtMoney(plan.plan.monthlyPayment)} в месяц` : undefined}
        />

        <div className="grid grid-cols-2 gap-3">
          <Select label="Срок кредита" value={termMonths} onChange={(e) => setTermMonths(Number(e.target.value))}>
            {[12, 24, 36, 48, 60, 72, 84, 96, 120].map((t) => (
              <option key={t} value={t}>
                {pluralMonths(t)}
              </option>
            ))}
          </Select>
          <Field
            label="Ставка"
            suffix="%"
            inputMode="decimal"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            hint={programId !== 'none' ? 'может быть заменена ставкой программы' : undefined}
          />
        </div>

        <Select label="Сценарий" value={programId} onChange={(e) => setProgramId(e.target.value)}>
          <option value="none">Свободный расчёт по введённой ставке</option>
          {CREDIT_PROGRAMS.map((p) => (
            <option key={p.id} value={p.id}>
              Официальная программа: {p.name}
            </option>
          ))}
        </Select>

        <Field
          label="Дополнительные расходы, финансируемые кредитом"
          suffix="₽"
          inputMode="numeric"
          value={financedExtra}
          onChange={(e) => setFinancedExtra(e.target.value)}
          hint="Например, КАСКО или оборудование, включённые в тело кредита. Не указывайте здесь то, что уже учтено в расходах на владение."
        />
      </Card>

      <div className="flex flex-col gap-3">
        {!trim || trim.basePrice === null ? (
          <Callout tone="warn" title="Нет подтверждённой цены">
            По выбранной комплектации нет цены из официального прайс-листа — обратный расчёт невозможен, чтобы не
            опираться на выдуманную стоимость.
          </Callout>
        ) : !result.ok ? (
          <Card className="border-[#EF4444]/40">
            <div className="flex items-start gap-3">
              <AlertIcon className="h-5 w-5 shrink-0 text-[#EF4444]" />
              <div>
                <p className="text-[13px] font-bold text-[#EF4444]">Проверьте параметры</p>
                <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-4 text-[12px] text-[#A9AFB7]">
                  {result.errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <StatTile
                label="Минимальный взнос"
                value={fmtMoney(result.plan.minDownPayment)}
                tone={result.plan.achievable ? 'accent' : 'warn'}
                hint={`${result.plan.downPaymentPct.toFixed(1)}% от цены автомобиля`}
              />
              <StatTile
                label="Максимальная сумма кредита"
                value={fmtMoney(result.plan.maxLoanAmount)}
                hint={`при платеже ${fmtMoney(parseLocaleNumber(targetPayment) || 0)} и сроке ${termMonths} мес`}
              />
              <StatTile
                label="Нужно накопить"
                value={fmtMoney(result.plan.savingsNeeded)}
                hint="сумма взноса без эксплуатационных расходов"
              />
              <StatTile
                label="Фактический платёж"
                value={result.plan.actualPayment > 0 ? fmtMoney(result.plan.actualPayment) : 'кредит не нужен'}
                tone="success"
                hint={`ставка ${String(result.plan.rate).replace('.', ',')}%${
                  result.plan.rateSource === 'program' ? ' (программа)' : ''
                }`}
              />
            </div>

            {!result.plan.achievable && (
              <Callout tone="warn" title="Желаемый платёж недостижим">
                Даже при взносе в размере всей стоимости автомобиля платёж не станет меньше заданного: сумма слишком мала
                для выбранной ставки и срока. Варианты — увеличить срок кредита, снизить ставку или выбрать автомобиль
                дешевле. Таблица вариантов по срокам ниже.
              </Callout>
            )}

            {result.plan.warnings.map((w) => (
              <Callout key={w} tone="warn">
                {w}
              </Callout>
            ))}
            {result.plan.notes.map((n) => (
              <Callout key={n} tone="info">
                {n}
              </Callout>
            ))}

            <Card className="flex flex-col gap-2">
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#A9AFB7]">
                <TrendDownIcon className="h-3.5 w-3.5 text-[#E4002B]" /> Варианты по срокам
              </p>
              <DataTable head={['Срок', 'Нужен взнос', 'Доля от цены', 'Макс. кредит', 'Возможно']} className="border-0">
                {result.plan.alternatives.map((a) => (
                  <tr key={a.termMonths}>
                    <TableCell sticky>{pluralMonths(a.termMonths)}</TableCell>
                    <TableCell>{fmtMoney(a.requiredDownPayment)}</TableCell>
                    <TableCell>{a.downPaymentPct.toFixed(0)}%</TableCell>
                    <TableCell>{fmtMoney(a.maxLoanAmount)}</TableCell>
                    <TableCell>
                      {a.requiredDownPayment <= 0 ? (
                        <span className="text-[#16B374]">взнос не нужен</span>
                      ) : a.achievable ? (
                        <span className="text-[#16B374]">да</span>
                      ) : (
                        <span className="text-[#F5A623]">нет</span>
                      )}
                    </TableCell>
                  </tr>
                ))}
              </DataTable>
            </Card>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={applyDownPayment}>
                <PercentIcon className="h-4 w-4" /> Подставить взнос в калькулятор
              </Button>
              <Button type="button" variant="secondary" onClick={handleSave}>
                <CardIcon className="h-4 w-4" /> Сохранить расчёт
              </Button>
              <Link to="/plan">
                <Button type="button" variant="ghost">
                  План накопления →
                </Button>
              </Link>
            </div>
            {note && <Callout tone="success">{note}</Callout>}

            <Callout tone="info">
              Расчёт — математическая симуляция, не оферта и не одобрение кредита. Ограничения официальной программы
              (минимальный и максимальный взнос, сумма кредита, срок) проверяются и показываются в предупреждениях;
              итоговые условия определяет банк.
            </Callout>
          </>
        )}
      </div>
    </div>
  )
}
