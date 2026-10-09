import { Link } from 'react-router-dom'
import { Card, SectionTitle, Tag } from '../components/ui'
import { CREDIT_PROGRAMS, getModel } from '../data/haval'
import { fmtMoney } from '../utils/format'

/**
 * Официальные кредитные программы дилера АГАТ — опубликованные условия.
 * Отдельно от расчётного сценария: здесь нет «обещания банка», только
 * зафиксированные диапазоны, требования и ограничения.
 */
export default function ProgramsPage() {
  return (
    <div className="animate-page-enter flex flex-col gap-2">
      <header className="flex flex-col gap-1.5">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#E4002B]">Официальные условия</p>
        <h1 className="font-display-num text-[26px] font-bold uppercase tracking-wide text-[#F3F4F4] sm:text-[32px]">
          Кредитные программы HAVAL
        </h1>
        <p className="max-w-2xl text-[12.5px] leading-relaxed text-[#A9AFB7]">
          Условия опубликованы дилером АГАТ (agat-ekb-haval.ru). Рекламная ставка «от 0,01%» достигается только
          при выполнении ограничений — взнос, срок, страхование КАСКО; они приведены в карточках. Решение о
          кредите и точную ставку определяет банк.
        </p>
      </header>

      <SectionTitle
        tip={
          <>
            «Расчётный сценарий» во вкладке «Кредит» — математическая симуляция: вы сами задаёте ставку и срок.
            «Официальная программа» — опубликованные условия: диапазоны ставок по взносу и сроку, требования к
            страхованию и модели участия. Мы не применяем льготную ставку ко всему модельному ряду и не считаем
            обязательные страховые платежи по выдуманным тарифам.
          </>
        }
      >
        Чем программа отличается от симуляции
      </SectionTitle>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {CREDIT_PROGRAMS.map((p) => (
          <Card key={p.id} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display-num text-[16px] font-bold uppercase tracking-wide text-[#F3F4F4]">{p.name}</h3>
              <Tag tone="accent">официальная</Tag>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {p.modelIds.map((id) => (
                <Link
                  key={id}
                  to={`/models/${getModel(id)?.slug ?? id}`}
                  className="rounded-[6px] border border-[#363B43] bg-[#23272D] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-[#A9AFB7] transition-colors hover:text-[#F3F4F4]"
                >
                  {getModel(id)?.name.replace('HAVAL ', '').replace('GWM ', '') ?? id}
                </Link>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 text-[12px]">
              <Meta label="Срок" value={`${p.termMonthsMin}–${p.termMonthsMax} мес`} />
              <Meta label="Первоначальный взнос" value={`${p.downPaymentMinPct}–${p.downPaymentMaxPct}%`} />
              {p.loanAmountMin !== null && (
                <Meta label="Сумма кредита" value={`${fmtMoney(p.loanAmountMin)}${p.loanAmountMax ? ` – ${fmtMoney(p.loanAmountMax)}` : '+'}`} />
              )}
              {p.pskRange && <Meta label="ПСК" value={p.pskRange} />}
            </div>

            {p.rateBands && (
              <div className="overflow-x-auto rounded-[8px] border border-[#363B43]">
                <table className="w-full min-w-[420px] text-left text-[11.5px]">
                  <thead>
                    <tr className="border-b border-[#363B43] bg-[#23272D]/60 text-[#A9AFB7]">
                      <th className="px-2.5 py-1.5 font-semibold">Взнос</th>
                      {[12, 24, 36, 48, 60, 72, 84].map((t) => (
                        <th key={t} className="px-2 py-1.5 text-right font-semibold">
                          {t} мес
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {p.rateBands.map((b) => (
                      <tr key={b.fromPct} className="border-b border-[#363B43]/50 last:border-0">
                        <td className="px-2.5 py-1.5 font-semibold text-[#F3F4F4]">
                          {b.fromPct}–{b.toPct}%
                        </td>
                        {[12, 24, 36, 48, 60, 72, 84].map((t) => {
                          const r = b.ratesByTerm[t]
                          return (
                            <td key={t} className={`px-2 py-1.5 text-right font-mono ${r === null ? 'text-[#4A5058]' : r <= 5 ? 'text-[#16B374]' : 'text-[#F3F4F4]'}`}>
                              {r === null ? '×' : String(r).replace('.', ',')}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <ul className="flex flex-col gap-1">
              {p.requirements.map((r) => (
                <li key={r} className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-[#A9AFB7]">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#F5A623]" />
                  {r}
                </li>
              ))}
            </ul>

            <p className="mt-auto text-[10.5px] text-[#A9AFB7]">
              Источник:{' '}
              <a className="underline decoration-[#363B43] underline-offset-2 hover:text-[#F3F4F4]" href={p.sourceUrl} target="_blank" rel="noreferrer">
                {p.sourceUrl.replace('https://', '')}
              </a>
            </p>
          </Card>
        ))}
      </div>

      <Card className="mt-4 bg-[#0E1013]">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 h-4 w-1 shrink-0 rounded-full bg-[#F5A623]" aria-hidden="true" />
          <p className="text-[11px] leading-relaxed text-[#A9AFB7]">
            Диапазоны ПСК и ставок приведены так, как их публикует дилер; размер ставки зависит от первоначального
            взноса, срока и решения банка. Указанные условия по ряду программ действуют при оформлении страхования
            КАСКО HAVAL Страхование / HAVAL Insurance — стоимость страхования рассчитывается страховщиком
            индивидуально и не включена в наш расчёт. Предложения не являются офертой.
          </p>
        </div>
      </Card>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-[#363B43] bg-[#0E1013]/70 px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A9AFB7]">{label}</p>
      <p className="mt-0.5 text-[12px] font-semibold text-[#F3F4F4]">{value}</p>
    </div>
  )
}
