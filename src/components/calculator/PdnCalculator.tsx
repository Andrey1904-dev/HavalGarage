import { useMemo, useState } from 'react'
import { Card, Field, InfoTip } from '../ui'
import { fmtMoney, parseLocaleNumber } from '../../utils/format'
import { pdnRelief } from '../../utils/loan'
import { PercentIcon } from '../icons'

/**
 * Перенесён из исходного проекта (Modeling.tsx): калькулятор показателя
 * долговой нагрузки со шкалой 0–100% и порогами ЦБ 30% и 50%, плюс совет,
 * какой остаток долга закрыть для снижения нагрузки.
 */
export default function PdnCalculator() {
  const [income, setIncome] = useState('')
  const [otherPayments, setOtherPayments] = useState('0')
  const [thisPayment, setThisPayment] = useState('')
  const [closeRate, setCloseRate] = useState('')
  const [closeTerm, setCloseTerm] = useState('')

  const calc = useMemo(() => {
    const inc = parseLocaleNumber(income)
    const other = Math.max(0, parseLocaleNumber(otherPayments) || 0)
    const self = Math.max(0, parseLocaleNumber(thisPayment) || 0)
    const total = other + self
    if (!(inc > 0) || total <= 0) return null
    const pdn = (total / inc) * 100
    const zone: 'safe' | 'warn' | 'danger' = pdn < 30 ? 'safe' : pdn <= 50 ? 'warn' : 'danger'
    const reliefInput = {
      income: inc,
      totalMonthlyDebt: total,
      annualPercent: parseLocaleNumber(closeRate) || 0,
      termLeft: parseLocaleNumber(closeTerm) || 0,
    }
    return {
      pdn,
      zone,
      total,
      safe: pdnRelief({ ...reliefInput, targetPercent: 30 }),
      limit: pdnRelief({ ...reliefInput, targetPercent: 50 }),
    }
  }, [income, otherPayments, thisPayment, closeRate, closeTerm])

  const zoneConfig = {
    safe: {
      color: '#16B374',
      badge: 'Безопасная зона (до 30%)',
      text: 'Долговая нагрузка в зелёной зоне: платежи занимают менее 30% ежемесячного дохода.',
    },
    warn: {
      color: '#F5A623',
      badge: 'Повышенная нагрузка (30–50%)',
      text: 'Умеренная зона риска: от 30% до 50% дохода уходит на кредиты. Рекомендуется финансовый резерв.',
    },
    danger: {
      color: '#EF4444',
      badge: 'Критическая нагрузка (> 50%)',
      text: 'Свыше 50% дохода уходит на платежи — высокая вероятность отказа банка и кассового разрыва.',
    },
  } as const

  const pdn = calc?.pdn ?? null
  const zone: 'safe' | 'warn' | 'danger' | null = calc?.zone ?? null

  return (
    <Card className="p-0 overflow-hidden">
      <div className="border-b border-[#363B43] bg-[#23272D]/60 px-4 py-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <PercentIcon className="h-4 w-4 text-[#E4002B]" />
          <h3 className="font-display-num text-[16px] font-bold uppercase tracking-wide text-[#F3F4F4]">
            Показатель долговой нагрузки (ПДН)
          </h3>
          <InfoTip title="ПДН">
            ПДН = сумма всех ежемесячных платежей по кредитам ÷ ваш среднемесячный доход × 100 %.
            Банк считает его сам по данным бюро кредитных историй и обязан учитывать с 2023 года:
            при ПДН выше 50 % кредит выдают неохотно и с надбавкой к ставке, выше 80 % — почти
            всегда отказ. До 30 % — комфортная зона, когда платёж не мешает жить.
          </InfoTip>
        </div>
        <p className="mt-1 text-[12px] leading-relaxed text-[#A9AFB7]">
          Оценка доли ежемесячного дохода, уходящей на обслуживание всех кредитов (пороги ЦБ: 30% и 50%)
        </p>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <Field
            label="Ваш доход в месяц"
            suffix="₽"
            inputMode="numeric"
            placeholder="115 000"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
          />
          <Field
            label="Другие кредиты"
            suffix="₽"
            inputMode="numeric"
            placeholder="0"
            value={otherPayments}
            onChange={(e) => setOtherPayments(e.target.value)}
          />
          <Field
            label="Платёж по автокредиту"
            suffix="₽"
            inputMode="numeric"
            placeholder="30 000"
            value={thisPayment}
            onChange={(e) => setThisPayment(e.target.value)}
          />
        </div>

        <div className="mt-4 rounded-[10px] border border-[#363B43] bg-[#0E1013] p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <span className="text-[11.5px] font-bold uppercase tracking-wider text-[#A9AFB7]">Расчётный ПДН</span>
              <p
                className="font-display-num mt-0.5 text-[30px] font-bold leading-none"
                style={{ color: zone ? zoneConfig[zone].color : '#F3F4F4' }}
              >
                {pdn === null ? '—' : `${Math.min(999, Math.round(pdn))}%`}
              </p>
            </div>
            {zone && (
              <span
                className="rounded-[6px] border px-2.5 py-1 text-[11.5px] font-bold"
                style={{
                  borderColor: `${zoneConfig[zone].color}55`,
                  backgroundColor: `${zoneConfig[zone].color}18`,
                  color: zoneConfig[zone].color,
                }}
              >
                {zoneConfig[zone].badge}
              </span>
            )}
          </div>

          <div className="relative mt-4">
            <div className="grid h-3 w-full grid-cols-[30fr_20fr_50fr] overflow-hidden rounded-full border border-[#363B43] bg-[#1A1D22]">
              <div className="bg-[#16B374]/80" title="До 30% — безопасная зона" />
              <div className="border-x border-[#0E1013] bg-[#F5A623]/80" title="30–50% — умеренная нагрузка" />
              <div className="bg-[#EF4444]/80" title="Свыше 50% — высокая нагрузка" />
            </div>
            {pdn !== null && (
              <div
                className="pointer-events-none absolute -top-1.5 h-6 w-1.5 -translate-x-1/2 rounded-full bg-[#F3F4F4] shadow-[0_0_0_2px_#0E1013] transition-all duration-200"
                style={{ left: `${Math.min(100, Math.max(0, pdn))}%` }}
                aria-hidden="true"
              />
            )}
          </div>

          <div className="relative mt-1.5 h-4 text-[11px] font-mono font-semibold text-[#A9AFB7]">
            <span className="absolute left-0">0%</span>
            <span className="absolute left-[30%] -translate-x-1/2 text-[#16B374]">30%</span>
            <span className="absolute left-[50%] -translate-x-1/2 text-[#F5A623]">50%</span>
            <span className="absolute right-0 text-[#EF4444]">100%</span>
          </div>

          {zone && calc ? (
            <div className="mt-3 border-t border-[#363B43]/70 pt-2.5 text-[12.5px] leading-relaxed text-[#A9AFB7]">
              Суммарный платёж <strong className="text-[#F3F4F4]">{fmtMoney(calc.total)}</strong> в месяц.{' '}
              {zoneConfig[zone].text}
            </div>
          ) : (
            <p className="mt-3 border-t border-[#363B43]/70 pt-2.5 text-[12.5px] text-[#A9AFB7]">
              Укажите ваш ежемесячный доход и платежи, чтобы рассчитать ПДН и увидеть зону нагрузки.
            </p>
          )}
        </div>

        {calc && (calc.safe || calc.limit) && (
          <div className="mt-3 rounded-[10px] border border-[#363B43] bg-[#0E1013] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-display-num text-[13.5px] font-bold uppercase tracking-wide text-[#F3F4F4]">
                Что закрыть, чтобы снизить ПДН
              </h4>
              <InfoTip title="Как считаем">
                Сначала считаем, на сколько рублей нужно уменьшить суммарный ежемесячный платёж,
                чтобы уложиться в порог. Затем переводим этот платёж в остаток долга по формуле
                аннуитета — при указанных ниже ставке и остатке срока закрываемых кредитов.
                Это оценка: точные суммы для досрочного погашения берите из справки банка.
              </InfoTip>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {(['limit', 'safe'] as const).map((key) => {
                const r = calc[key]
                if (!r) return null
                const color = key === 'limit' ? '#F5A623' : '#16B374'
                return (
                  <div
                    key={key}
                    className="rounded-[8px] border px-3 py-2.5 text-[12.5px] leading-relaxed"
                    style={{ borderColor: `${color}45`, backgroundColor: `${color}12` }}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <span className="text-[11.5px] font-bold uppercase tracking-wider" style={{ color }}>
                        Цель — ПДН до {r.targetPercent}%
                      </span>
                      <span className="font-mono text-[11.5px] text-[#A9AFB7]">
                        предел платежей {fmtMoney(r.allowedPayment)}/мес
                      </span>
                    </div>
                    {r.reached ? (
                      <p className="mt-1 text-[#A9AFB7]">
                        Порог уже соблюдён — запас <strong className="text-[#F3F4F4]">{fmtMoney(r.headroom)}</strong> в
                        месяц до его превышения.
                      </p>
                    ) : (
                      <p className="mt-1 text-[#A9AFB7]">
                        Снизьте ежемесячные платежи на{' '}
                        <strong className="text-[#F3F4F4]">{fmtMoney(r.paymentToCut)}</strong> — это примерно{' '}
                        <strong className="text-[#F3F4F4]">
                          {Number.isFinite(r.principalToClose) ? fmtMoney(r.principalToClose) : '—'}
                        </strong>{' '}
                        остатка долга, который нужно погасить или закрыть досрочно.
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                label="Ставка по закрываемым кредитам"
                suffix="%"
                inputMode="decimal"
                placeholder="24,9"
                value={closeRate}
                onChange={(e) => setCloseRate(e.target.value)}
              />
              <Field
                label="Остаток срока по ним"
                suffix="мес"
                inputMode="numeric"
                placeholder="36"
                value={closeTerm}
                onChange={(e) => setCloseTerm(e.target.value)}
              />
            </div>
            <p className="mt-2 text-[11.5px] leading-relaxed text-[#A9AFB7]">
              Выгоднее закрывать самые дорогие и короткие долги — кредитные карты и микрозаймы: они дают
              максимальное снижение платежа на каждый вложенный рубль.
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}
