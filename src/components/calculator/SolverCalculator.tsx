import { useMemo, useState } from 'react'
import { Card, Field } from '../ui'
import { fmtMoney, parseLocaleNumber } from '../../utils/format'
import {
  annuityPayment,
  principalFromPayment,
  rateFromPayment,
  termFromPayment,
} from '../../utils/loan'
import { RefreshIcon } from '../icons'

type CalcField = 'amount' | 'rate' | 'payment' | 'term'

const FIELD_ORDER: CalcField[] = ['amount', 'rate', 'payment', 'term']

/**
 * Режим «Подбор параметров»: заполняете любые 3 из 4 полей — четвёртое
 * вычисляется автоматически (ставка ищется численно методом бисекции).
 * При редактировании вычисленного поля «отпускается» самое давнее поле.
 */
export default function SolverCalculator() {
  const [values, setValues] = useState<Record<CalcField, string>>({
    amount: '',
    rate: '',
    payment: '',
    term: '',
  })
  const [given, setGiven] = useState<CalcField[]>([])
  const [computed, setComputed] = useState<CalcField | null>(null)
  const [error, setError] = useState('')

  const solve = (target: CalcField, v: Record<CalcField, string>): { text: string; err: string } => {
    const S = parseLocaleNumber(v.amount)
    const R = parseLocaleNumber(v.rate)
    const P = parseLocaleNumber(v.payment)
    const N = parseLocaleNumber(v.term)
    switch (target) {
      case 'payment': {
        const p = annuityPayment(S, R, N)
        return Number.isFinite(p)
          ? { text: String(Math.round(p)), err: '' }
          : { text: '', err: 'Проверьте сумму, ставку и срок кредита' }
      }
      case 'term': {
        const n = termFromPayment(S, R, P)
        if (!Number.isFinite(n)) {
          return {
            text: '',
            err: 'Платёж не покрывает даже ежемесячные проценты — увеличьте платёж или снизьте ставку',
          }
        }
        return { text: String(Math.ceil(n)), err: '' }
      }
      case 'amount': {
        const s = principalFromPayment(P, R, N)
        return Number.isFinite(s)
          ? { text: String(Math.round(s)), err: '' }
          : { text: '', err: 'Проверьте платёж, ставку и срок' }
      }
      case 'rate': {
        const r = rateFromPayment(S, P, N)
        return Number.isFinite(r)
          ? { text: (Math.round(r * 100) / 100).toString(), err: '' }
          : { text: '', err: 'Не удалось подобрать процентную ставку' }
      }
    }
  }

  const handleChange = (field: CalcField, text: string) => {
    const next = { ...values, [field]: text }
    let order = given.filter((f) => f !== field)
    if (text.trim() !== '') order.push(field)

    if (order.length >= 3) {
      let target: CalcField
      if (order.length === 3) {
        target = FIELD_ORDER.find((f) => !order.includes(f))!
      } else {
        target = order[0]
        order = order.slice(1)
      }
      const res = solve(target, next)
      next[target] = res.text
      setValues(next)
      setError(res.err)
      setComputed(target)
      setGiven(order)
    } else {
      if (computed) next[computed] = ''
      setValues(next)
      setComputed(null)
      setError('')
      setGiven(order)
    }
  }

  const clearAll = () => {
    setValues({ amount: '', rate: '', payment: '', term: '' })
    setGiven([])
    setComputed(null)
    setError('')
  }

  const summary = useMemo(() => {
    const S = parseLocaleNumber(values.amount)
    const P = parseLocaleNumber(values.payment)
    const N = parseLocaleNumber(values.term)
    if (!(S > 0 && P > 0 && N > 0)) return null
    const totalPaid = P * N
    const overpay = Math.max(0, totalPaid - S)
    return { totalPaid, overpay }
  }, [values])

  const labels: Record<CalcField, { label: string; suffix: string; placeholder: string; inputMode: 'numeric' | 'decimal' }> = {
    amount: { label: 'Сумма кредита', suffix: '₽', placeholder: '2 500 000', inputMode: 'numeric' },
    rate: { label: 'Ставка, % годовых', suffix: '%', placeholder: '16.4', inputMode: 'decimal' },
    payment: { label: 'Ежемесячный платёж', suffix: '₽', placeholder: '61 000', inputMode: 'numeric' },
    term: { label: 'Срок кредита', suffix: 'мес', placeholder: '60', inputMode: 'numeric' },
  }

  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#363B43] bg-[#23272D]/60 px-4 py-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-4 w-1 rounded-full bg-[#E4002B]" aria-hidden="true" />
            <h3 className="font-display-num text-[16px] font-bold uppercase tracking-wide text-[#F3F4F4]">
              Подбор параметров кредита
            </h3>
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-[#A9AFB7]">
            Заполните любые 3 поля — четвёртое рассчитается автоматически (ставка ищется бисекцией)
          </p>
        </div>
        {(given.length > 0 || computed) && (
          <button
            type="button"
            onClick={clearAll}
            aria-label="Сбросить поля калькулятора"
            className="flex min-h-[38px] items-center gap-1 rounded-[8px] border border-[#363B43] bg-[#1A1D22] px-2.5 py-1.5 text-[12px] font-semibold text-[#A9AFB7] transition-colors hover:text-[#F3F4F4]"
          >
            <RefreshIcon className="h-3.5 w-3.5" />
            Сброс
          </button>
        )}
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {FIELD_ORDER.map((f) => {
            const meta = labels[f]
            const isComputed = computed === f
            return (
              <Field
                key={f}
                label={meta.label}
                suffix={meta.suffix}
                placeholder={meta.placeholder}
                inputMode={meta.inputMode}
                value={values[f]}
                highlighted={isComputed}
                badge={isComputed ? 'Расчёт' : undefined}
                onChange={(e) => handleChange(f, e.target.value)}
              />
            )
          })}
        </div>

        {error && (
          <div role="alert" className="mt-3.5 rounded-[8px] border border-[#EF4444]/40 bg-[#EF4444]/12 px-3.5 py-2.5 text-[12.5px] font-medium text-[#EF4444]">
            {error}
          </div>
        )}

        {summary && !error && (
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-[8px] border border-[#363B43] bg-[#0E1013]/80 p-3.5">
            <div>
              <p className="text-[11px] font-medium text-[#A9AFB7]">Итого выплат за весь срок</p>
              <p className="font-display-num mt-0.5 text-[18px] font-bold text-[#F3F4F4]">{fmtMoney(summary.totalPaid)}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-[#A9AFB7]">Переплата по процентам</p>
              <p className="font-display-num mt-0.5 text-[18px] font-bold text-[#E4002B]">+{fmtMoney(summary.overpay)}</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
