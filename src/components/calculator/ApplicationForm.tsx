import { useState, type FormEvent } from 'react'
import { Button, Card, Field, Tag } from '../ui'
import { useCalculator } from '../../context/CalculatorContext'
import { MODELS, getTrim } from '../../data/haval'
import { isSupabaseConfigured, submitCreditApplication } from '../../lib/supabase'
import { AlertIcon, CheckIcon, DatabaseIcon } from '../icons'

type Status = 'idle' | 'sending' | 'success' | 'error'

/**
 * Отправка расчёта в базу данных (Supabase): сохраняет текущий сценарий
 * калькулятора (модель, комплектация, параметры кредита) как предварительную
 * заявку. Расчёт остаётся симуляцией и не является одобрением кредита.
 */
export default function ApplicationForm() {
  const { state, plan, discountRub } = useCalculator()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [formError, setFormError] = useState('')

  if (!plan.ok) return null
  const model = MODELS.find((m) => m.id === state.modelId)
  if (!model) return null
  const trim = getTrim(state.trimId ?? '')

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormError('')

    const trimmedName = name.trim()
    const trimmedPhone = phone.replace(/[^\d+()\-\s]/g, '').trim()
    if (!trimmedName) {
      setFormError('Укажите имя — так дилеру будет к кому обратиться.')
      return
    }
    if (trimmedPhone.replace(/\D/g, '').length < 10) {
      setFormError('Укажите корректный номер телефона (не менее 10 цифр).')
      return
    }

    setStatus('sending')
    setMessage('')
    const result = await submitCreditApplication({
      model_id: model.id,
      model_name: model.name,
      trim_id: trim?.id ?? null,
      trim_name: trim?.name ?? null,
      vehicle_price: plan.plan.vehiclePrice,
      discount_applied: discountRub,
      effective_price: plan.plan.effectivePrice,
      down_payment: plan.plan.downPayment,
      credit_amount: plan.plan.creditAmount,
      term_months: plan.plan.termMonths,
      annual_rate: plan.plan.annualRate,
      monthly_payment: plan.plan.monthlyPayment,
      total_paid: plan.plan.totalPaid,
      interest_overpay: plan.plan.interestOverpay,
      extra_costs: plan.plan.extraCosts,
      total_cost: plan.plan.totalCost,
      contact_name: trimmedName,
      contact_phone: trimmedPhone,
    })

    if (result.ok) {
      setStatus('success')
      setMessage('Расчёт сохранён в базе данных. Дилер свяжется с вами для уточнения условий.')
    } else {
      setStatus('error')
      setMessage(result.error)
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <DatabaseIcon className="h-4 w-4 text-[#E4002B]" />
        <h3 className="text-[15px] font-bold text-[#F3F4F4]">Отправить расчёт дилеру</h3>
        {isSupabaseConfigured ? (
          <Tag tone="success">БД подключена</Tag>
        ) : (
          <Tag tone="warn">БД не настроена</Tag>
        )}
      </div>

      <p className="text-[12px] leading-relaxed text-[#A9AFB7]">
        Текущий расчёт ({model.name}
        {trim ? `, ${trim.name}` : ''}) будет сохранён в базе данных вместе с контактными
        данными — дилер сможет подготовить предметное предложение. Расчёт предварительный
        и не является одобрением кредита.
      </p>

      <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={handleSubmit}>
        <Field
          label="Ваше имя"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setFormError('')
          }}
          placeholder="Иван"
          autoComplete="name"
        />
        <Field
          label="Телефон"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value)
            setFormError('')
          }}
          placeholder="+7 900 000-00-00"
          type="tel"
          autoComplete="tel"
        />
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Button type="submit" disabled={!isSupabaseConfigured || status === 'sending'}>
            {status === 'sending' ? 'Сохраняем…' : 'Сохранить расчёт в базе'}
          </Button>

          {formError && (
            <p className="flex items-start gap-1.5 text-[12px] leading-relaxed text-[#F5A623]">
              <AlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {formError}
            </p>
          )}

          {status === 'success' && (
            <p className="flex items-start gap-1.5 text-[12px] leading-relaxed text-[#16B374]">
              <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {message}
            </p>
          )}

          {status === 'error' && (
            <p className="flex items-start gap-1.5 text-[12px] leading-relaxed text-[#E4002B]">
              <AlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {message} Расчёт доступен локально — калькулятор продолжает работать без БД.
            </p>
          )}
        </div>
      </form>
    </Card>
  )
}
