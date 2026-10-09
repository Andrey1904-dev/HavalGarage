import { useMemo, useState } from 'react'
import { Button, Card, EmptyState, Field, InfoTip, SectionTitle } from '../ui'
import { CardIcon, CheckIcon, SparklesIcon, TrendDownIcon } from '../icons'
import { useCalculator } from '../../context/CalculatorContext'
import { addMonths } from '../../utils/date'
import { fmtDate, fmtMoney, parseLocaleNumber, plural } from '../../utils/format'
import {
  simulatePrepayment,
  type PrepaymentMode,
  type PrepaymentPlan,
} from '../../utils/loan'

/**
 * Помесячная симуляция досрочного погашения на остатке долга, сравнение
 * «сократить срок» и «уменьшить платёж». Остаток берётся из расчётного
 * сценария калькулятора (или вводится вручную).
 */
export default function PrepaymentCalculator() {
  const { state, trim, plan } = useCalculator()
  const [baseBalance, setBaseBalance] = useState('')
  const [baseRate, setBaseRate] = useState('')
  const [basePayment, setBasePayment] = useState('')
  const [baseTermLeft, setBaseTermLeft] = useState('')
  const [hasBase, setHasBase] = useState(false)
  const [oneTimeRaw, setOneTimeRaw] = useState('100000')
  const [monthlyRaw, setMonthlyRaw] = useState('0')
  const [mode, setMode] = useState<PrepaymentMode>('term')

  const scenarioAvailable = plan.ok && !plan.plan.noLoanNeeded && plan.plan.creditAmount > 0

  const fillFromScenario = () => {
    if (!plan.ok) return
    setBaseBalance(String(Math.round(plan.plan.creditAmount)))
    setBaseRate(String(plan.plan.annualRate).replace('.', ','))
    setBasePayment(String(Math.round(plan.plan.monthlyPayment)))
    setBaseTermLeft(String(plan.plan.termMonths))
    setHasBase(true)
  }

  const base = useMemo(() => {
    const balance = hasBase ? parseLocaleNumber(baseBalance) : scenarioAvailable && plan.ok ? plan.plan.creditAmount : NaN
    const rate = hasBase ? parseLocaleNumber(baseRate) : scenarioAvailable && plan.ok ? plan.plan.annualRate : NaN
    const payment = hasBase ? parseLocaleNumber(basePayment) : scenarioAvailable && plan.ok ? plan.plan.monthlyPayment : NaN
    const termLeft = hasBase ? parseLocaleNumber(baseTermLeft) : scenarioAvailable && plan.ok ? plan.plan.termMonths : NaN
    if (!(balance > 0) || !(rate >= 0) || !(payment > 0) || !(termLeft > 0)) return null
    return { balance, rate, payment, termLeft: Math.max(1, Math.round(termLeft)) }
  }, [hasBase, baseBalance, baseRate, basePayment, baseTermLeft, scenarioAvailable, plan])

  const oneTime = Math.max(0, parseLocaleNumber(oneTimeRaw) || 0)
  const monthly = Math.max(0, parseLocaleNumber(monthlyRaw) || 0)

  const result = useMemo(() => {
    if (!base) return null
    const common = {
      balance: base.balance,
      annualPercent: base.rate,
      payment: base.payment,
      termLeft: base.termLeft,
    }
    const baseline = simulatePrepayment({ ...common, mode: 'term' })
    const byTerm = simulatePrepayment({ ...common, oneTime, monthly, mode: 'term' })
    const byPayment = simulatePrepayment({ ...common, oneTime, monthly, mode: 'payment' })
    return { baseline, byTerm, byPayment }
  }, [base, oneTime, monthly])

  if (!base) {
    return (
      <EmptyState
        icon={<CardIcon className="h-6 w-6" />}
        title="Нужны параметры кредита"
        text="Калькулятор досрочного погашения работает с остатком долга: подставьте параметры текущего сценария или введите их вручную."
        action={
          scenarioAvailable ? (
            <Button type="button" onClick={fillFromScenario}>
              Подставить сценарий ({trim?.name})
            </Button>
          ) : undefined
        }
      />
    )
  }

  if (base.balance <= 0) {
    return (
      <EmptyState
        icon={<CheckIcon className="h-6 w-6" />}
        title="Кредит уже погашен"
        text="Остаток основного долга равен нулю — досрочное погашение больше не требуется"
      />
    )
  }

  const chosen = mode === 'term' ? result?.byTerm : result?.byPayment
  const baseline = result?.baseline ?? null
  const saved = baseline && chosen ? baseline.interest - chosen.interest : 0
  const monthsSaved = baseline && chosen ? baseline.months - chosen.months : 0

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A9AFB7]">Остаток основного долга</p>
            <p className="font-display-num mt-1 text-[26px] font-bold leading-none text-[#F3F4F4]">{fmtMoney(base.balance)}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A9AFB7]">Осталось платежей</p>
            <p className="font-display-num mt-1 text-[20px] font-bold leading-none text-[#F3F4F4]">{base.termLeft}</p>
          </div>
          {scenarioAvailable && (
            <Button type="button" variant="ghost" className="min-h-[36px] px-2.5 py-1 text-[12px]" onClick={fillFromScenario}>
              Из сценария кредита
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Остаток долга, ₽" inputMode="numeric" value={baseBalance} onChange={(e) => { setBaseBalance(e.target.value); setHasBase(true) }} />
          <Field label="Ставка, %" inputMode="decimal" value={baseRate} onChange={(e) => { setBaseRate(e.target.value); setHasBase(true) }} />
          <Field label="Платёж, ₽" inputMode="numeric" value={basePayment} onChange={(e) => { setBasePayment(e.target.value); setHasBase(true) }} />
          <Field label="Платежей осталось" inputMode="numeric" value={baseTermLeft} onChange={(e) => { setBaseTermLeft(e.target.value); setHasBase(true) }} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label="Разовый досрочный взнос, ₽"
            inputMode="decimal"
            value={oneTimeRaw}
            onChange={(e) => setOneTimeRaw(e.target.value)}
            hint="Сумма сверх ближайшего платежа"
          />
          <Field
            label="Доплата каждый месяц, ₽"
            inputMode="decimal"
            value={monthlyRaw}
            onChange={(e) => setMonthlyRaw(e.target.value)}
            hint="Регулярно округляете платёж вверх? Впишите надбавку"
          />
        </div>

        <div>
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <p className="text-[12.5px] font-semibold text-[#A9AFB7]">Что пересчитывает банк</p>
            <InfoTip title="Сократить срок или уменьшить платёж">
              При досрочном погашении вы выбираете, что банк пересчитает. «Сократить срок» — платёж остаётся
              прежним, но месяцев до конца кредита становится меньше: проценты начисляются на остаток, поэтому
              выгода почти всегда больше. «Уменьшить платёж» — срок тот же, а ежемесячная нагрузка падает.
              Досрочное погашение — право заёмщика (ст. 809–810 ГК РФ), комиссий за него быть не должно.
            </InfoTip>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['term', 'Сократить срок'],
                ['payment', 'Уменьшить платёж'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`min-h-[44px] rounded-[10px] border px-3 py-2 text-[13px] font-semibold transition-colors ${
                  mode === value
                    ? 'border-[#E4002B] bg-[#23272D] text-[#F3F4F4]'
                    : 'border-[#363B43] bg-[#1A1D22] text-[#A9AFB7]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {!chosen || !baseline ? (
        <Card>
          <p className="text-[13px] text-[#A9AFB7]">
            С такими параметрами кредит не гасится: платёж меньше начисляемых процентов. Проверьте ставку и
            сумму платежа.
          </p>
        </Card>
      ) : (
        <>
          <Card className="border-[#16B374]/40 bg-[#16B374]/8">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#16B374]/16 text-[#16B374]">
                <TrendDownIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A9AFB7]">Экономия на процентах</p>
                <p className="font-display-num mt-1 text-[26px] font-bold leading-none text-[#16B374]">
                  {fmtMoney(Math.max(0, saved))}
                </p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#A9AFB7]">
                  {mode === 'term'
                    ? monthsSaved > 0
                      ? `Кредит закроется на ${monthsSaved} ${plural(monthsSaved, ['месяц', 'месяца', 'месяцев'])} раньше — ${fmtDate(addMonths(new Date(), chosen.months))} вместо ${fmtDate(addMonths(new Date(), baseline.months))}.`
                      : 'Взнос слишком мал, чтобы сократить срок хотя бы на месяц.'
                    : `Платёж уменьшится до ${fmtMoney(chosen.payment)} вместо ${fmtMoney(base.payment)} при том же сроке.`}
                </p>
              </div>
            </div>
          </Card>

          <SectionTitle
            tip={
              <>
                Обе карточки считаются от одного и того же остатка долга и вашей ставки. «Экономия» — это разница
                процентов с графиком без досрочных платежей: сколько денег останется у вас, а не у банка.
              </>
            }
          >
            Сравнение вариантов
          </SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <PlanCard title="Сократить срок" hint="Платёж прежний, кредит закрывается раньше" plan={result?.byTerm ?? null} baseline={baseline} active={mode === 'term'} payment={base.payment} mode="term" />
            <PlanCard title="Уменьшить платёж" hint="Срок прежний, ежемесячная нагрузка ниже" plan={result?.byPayment ?? null} baseline={baseline} active={mode === 'payment'} payment={base.payment} mode="payment" />
          </div>

          <Card className="flex gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#E4002B]/14 text-[#E4002B]">
              <SparklesIcon className="h-5 w-5" />
            </span>
            <div className="text-[12.5px] leading-relaxed text-[#A9AFB7]">
              <p className="mb-1 font-semibold text-[#F3F4F4]">Как это работает у банка</p>
              Проценты начисляются на остаток долга, поэтому досрочный взнос выгоднее вносить как можно раньше и
              направлять на <strong className="text-[#F3F4F4]">сокращение срока</strong>: платёж остаётся прежним, но
              месяцев начисления меньше. Уменьшение платежа выбирают, когда важнее снизить нагрузку на бюджет прямо
              сейчас.
            </div>
          </Card>

          <Card className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A9AFB7]">Без досрочного погашения</p>
            <Row label="Платежей осталось" value={`${baseline.months}`} />
            <Row label="Проценты за оставшийся срок" value={fmtMoney(baseline.interest)} />
            <Row label="Всего к выплате" value={fmtMoney(baseline.totalPaid)} />
            <Row label="Дата закрытия" value={fmtDate(addMonths(new Date(), baseline.months))} />
          </Card>
        </>
      )}
      <p className="text-[10.5px] text-[#A9AFB7]">Сценарий: {state.modelId} · расчёт симуляцией, не оферта.</p>
    </div>
  )
}

function PlanCard({
  title,
  hint,
  plan,
  baseline,
  active,
  payment,
  mode,
}: {
  title: string
  hint: string
  plan: PrepaymentPlan | null
  baseline: PrepaymentPlan
  active: boolean
  payment: number
  mode: PrepaymentMode
}) {
  const saved = plan ? Math.max(0, baseline.interest - plan.interest) : 0
  return (
    <Card className={`flex flex-col gap-2 transition-colors ${active ? 'border-[#E4002B]/60' : 'border-[#363B43]'}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-bold text-[#F3F4F4]">{title}</p>
        {active && (
          <span className="rounded-full bg-[#E4002B]/14 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-[#E4002B]">
            выбрано
          </span>
        )}
      </div>
      <p className="text-[11.5px] leading-snug text-[#A9AFB7]">{hint}</p>
      {plan ? (
        <>
          <Row label="Экономия процентов" value={fmtMoney(saved)} accent />
          <Row label="Платёж" value={mode === 'payment' ? fmtMoney(plan.payment) : fmtMoney(payment)} />
          <Row label="Платежей осталось" value={`${plan.months}`} />
          <Row label="Проценты" value={fmtMoney(plan.interest)} />
        </>
      ) : (
        <p className="text-[12px] text-[#A9AFB7]">Расчёт невозможен с этими параметрами</p>
      )}
    </Card>
  )
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-t border-[#363B43]/70 pt-1.5 first:border-0 first:pt-0">
      <span className="text-[12px] text-[#A9AFB7]">{label}</span>
      <span className={`font-display-num text-[13.5px] font-bold ${accent ? 'text-[#16B374]' : 'text-[#F3F4F4]'}`}>
        {value}
      </span>
    </div>
  )
}
