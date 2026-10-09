import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SegmentedControl } from '../components/ui'
import PurchaseCalculator from '../components/calculator/PurchaseCalculator'
import ApplicationForm from '../components/calculator/ApplicationForm'
import RequiredDownCalculator from '../components/calculator/RequiredDownCalculator'
import PrepaymentCalculator from '../components/calculator/PrepaymentCalculator'
import SolverCalculator from '../components/calculator/SolverCalculator'
import PdnCalculator from '../components/calculator/PdnCalculator'
import { useCalculator } from '../context/CalculatorContext'
import { getTrim } from '../data/haval'
import { useSeo } from '../utils/seo'
import { track } from '../utils/analytics'

type Tab = 'credit' | 'down' | 'prepay' | 'solver' | 'pdn'

/**
 * Кредитный калькулятор HAVAL: расчётный сценарий покупки и инструменты —
 * обратный расчёт взноса, досрочное погашение, подбор 4-го параметра, ПДН.
 *
 * Три сценария разделены:
 *  1. свободный расчёт по ставке пользователя;
 *  2. расчёт по опубликованным условиям официальной программы (кнопка «ставка программы»);
 *  3. сценарий с неизвестными условиями банка — помечается как предварительный.
 */
export default function CalculatorPage() {
  const [tab, setTab] = useState<Tab>('credit')
  const [params, setParams] = useSearchParams()
  const { selectModel, update } = useCalculator()

  useSeo({
    title: 'Кредитный калькулятор HAVAL — расчёт платежа, переплаты и взноса',
    description:
      'Расчёт аннуитетного платежа по моделям HAVAL: цена из официального прайс-листа, первоначальный взнос в рублях ' +
      'или процентах, срок, ставка, подтверждённые скидки, переплата и график платежей. Не является офертой.',
    path: '/calculator',
  })

  // переход из каталога/сравнения с конкретной комплектацией
  useEffect(() => {
    const trimParam = params.get('trim')
    if (trimParam) {
      const trim = getTrim(trimParam)
      if (trim) {
        selectModel(trim.modelId)
        update({ trimId: trim.id })
        setTab('credit')
      }
      const next = new URLSearchParams(params)
      next.delete('trim')
      setParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- разовая синхронизация с query-параметром
  }, [params])

  useEffect(() => {
    track('calculator_open', { tab })
  }, [tab])

  useEffect(() => {
    const t = setTimeout(() => track('credit_params_change', { tab }), 800)
    return () => clearTimeout(t)
  }, [tab])

  return (
    <div className="animate-page-enter flex flex-col gap-4">
      <header className="flex flex-col gap-1.5">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#E4002B]">Расчётный сценарий</p>
        <h1 className="font-display-num text-[26px] font-bold uppercase tracking-wide text-[#F3F4F4] sm:text-[32px]">
          Кредитный калькулятор
        </h1>
        <p className="max-w-2xl text-[12.5px] leading-relaxed text-[#A9AFB7]">
          Выберите модель и комплектацию — цена подставится из официального прайс-листа. Задайте взнос в рублях или
          процентах, срок и ставку: результат пересчитывается мгновенно. Официальные программы и их ограничения — в
          разделе «Программы».
        </p>
      </header>

      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: 'credit', label: 'Кредит' },
          { value: 'down', label: 'Взнос' },
          { value: 'prepay', label: 'Досрочно' },
          { value: 'solver', label: 'Подбор' },
          { value: 'pdn', label: 'ПДН' },
        ]}
      />

      <div key={tab} className="animate-pop-in">
        {tab === 'credit' && (
          <div className="flex flex-col gap-4">
            <PurchaseCalculator />
            <ApplicationForm />
          </div>
        )}
        {tab === 'down' && <RequiredDownCalculator />}
        {tab === 'prepay' && <PrepaymentCalculator />}
        {tab === 'solver' && <SolverCalculator />}
        {tab === 'pdn' && <PdnCalculator />}
      </div>
    </div>
  )
}
