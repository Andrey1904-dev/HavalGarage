import { useState } from 'react'
import { SegmentedControl } from '../components/ui'
import PurchaseCalculator from '../components/calculator/PurchaseCalculator'
import ApplicationForm from '../components/calculator/ApplicationForm'
import PrepaymentCalculator from '../components/calculator/PrepaymentCalculator'
import SolverCalculator from '../components/calculator/SolverCalculator'
import PdnCalculator from '../components/calculator/PdnCalculator'

type Tab = 'credit' | 'prepay' | 'solver' | 'pdn'

/**
 * Кредитный калькулятор HAVAL: расчётный сценарий покупки + инструменты
 * (досрочное погашение, подбор 4-го поля, ПДН).
 */
export default function CalculatorPage() {
  const [tab, setTab] = useState<Tab>('credit')

  return (
    <div className="animate-page-enter flex flex-col gap-4">
      <header className="flex flex-col gap-1.5">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#E4002B]">Расчётный сценарий</p>
        <h1 className="font-display-num text-[26px] font-bold uppercase tracking-wide text-[#F3F4F4] sm:text-[32px]">
          Кредитный калькулятор
        </h1>
        <p className="max-w-2xl text-[12.5px] leading-relaxed text-[#A9AFB7]">
          Выберите модель и комплектацию — цена подставится из каталога. Задайте взнос в рублях или процентах,
          срок и ставку: результат пересчитается мгновенно. Официальные программы и их ограничения — во вкладке
          «Программы».
        </p>
      </header>

      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: 'credit', label: 'Кредит' },
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
        {tab === 'prepay' && <PrepaymentCalculator />}
        {tab === 'solver' && <SolverCalculator />}
        {tab === 'pdn' && <PdnCalculator />}
      </div>
    </div>
  )
}
