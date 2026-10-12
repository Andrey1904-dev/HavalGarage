import { Link } from 'react-router-dom'
import { Callout, Card, ScrollRegion, SectionTitle, Tag } from '../components/ui'
import { CREDIT_PROGRAMS, getModel } from '../data/haval'
import { fmtMoney } from '../utils/format'
import { useSeo } from '../utils/seo'
import { track } from '../utils/analytics'

/**
 * Официальные кредитные программы дилера АГАТ — опубликованные условия.
 * Отдельно от расчётного сценария: здесь нет «обещания банка», только
 * зафиксированные диапазоны, требования и ограничения.
 */
export default function ProgramsPage() {
  useSeo({
    title: 'Официальные кредитные программы HAVAL — условия, ставки и ограничения',
    description:
      'Опубликованные условия кредитных программ HAVAL: диапазоны ставок по взносу и сроку, требования к страхованию, ' +
      'лимиты суммы кредита и участвующие модели. Отдельно от свободного расчёта по ставке пользователя.',
    path: '/programs',
  })

  return (
    <div className="animate-page-enter flex flex-col gap-2">
      <header className="flex flex-col gap-1.5 border-b border-[#242930] pb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#FF334B]">Официальные условия</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#F4F5F6] sm:text-4xl">
          Кредитные программы HAVAL
        </h1>
        <p className="max-w-2xl text-[13px] leading-relaxed text-[#A2A7AF]">
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
              <h3 className="font-display-num text-[16px] font-bold uppercase tracking-wide text-[#F4F5F6]">{p.name}</h3>
              <Tag tone="accent">официальная</Tag>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {p.modelIds.map((id) => (
                <Link
                  key={id}
                  to={`/models/${getModel(id)?.slug ?? id}`}
                  className="rounded-[6px] border border-[#2B3037] bg-[#20242A] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#A2A7AF] transition-colors hover:text-[#F4F5F6]"
                >
                  {getModel(id)?.name.replace('HAVAL ', '').replace('GWM ', '') ?? id}
                </Link>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 text-[12px]">
              <Meta label="Срок" value={`${p.termMonthsMin}–${p.termMonthsMax} мес`} />
              <Meta label="Первоначальный взнос" value={`${p.downPaymentMinPct}–${p.downPaymentMaxPct}%`} />
              {p.modelYears && p.modelYears.length > 0 && (
                <Meta label="Модельные годы" value={p.modelYears.join(', ')} />
              )}
              {p.loanAmountMin !== null && (
                <Meta label="Сумма кредита" value={`${fmtMoney(p.loanAmountMin)}${p.loanAmountMax ? ` – ${fmtMoney(p.loanAmountMax)}` : '+'}`} />
              )}
              {p.pskRange && <Meta label="ПСК" value={p.pskRange} />}
            </div>

            {p.rateBands && (
              <ScrollRegion label={`Ставки программы ${p.name} по взносу и сроку`} className="rounded-lg border border-[#2B3037]">
                <table className="w-full min-w-[420px] text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-[#2B3037] bg-[#20242A]/60 text-[#A2A7AF]">
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
                      <tr key={b.fromPct} className="border-b border-[#2B3037]/50 last:border-0">
                        <td className="px-2.5 py-1.5 font-semibold text-[#F4F5F6]">
                          {b.fromPct}–{b.toPct}%
                        </td>
                        {[12, 24, 36, 48, 60, 72, 84].map((t) => {
                          const r = b.ratesByTerm[t]
                          return (
                            <td key={t} className={`px-2 py-1.5 text-right font-mono ${r === null ? 'text-[#8A919B]' : r <= 5 ? 'text-[#10B981]' : 'text-[#F4F5F6]'}`}>
                              {r === null ? (
                                <>
                                  <span aria-hidden="true">×</span>
                                  <span className="sr-only">недоступно</span>
                                </>
                              ) : (
                                String(r).replace('.', ',')
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollRegion>
            )}

            {p.requiredProducts.length > 0 && (
              <div className="rounded-lg border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-2.5 py-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#F59E0B]">
                  Обязательные дополнительные продукты
                </p>
                <p className="mt-0.5 text-[12px] text-[#F59E0B]">{p.requiredProducts.join(', ')}</p>
              </div>
            )}
            {p.insurance && (
              <p className="text-[12px] leading-relaxed text-[#A2A7AF]">
                <strong className="text-[#F4F5F6]">Страхование:</strong> {p.insurance}. Стоимость страхования
                рассчитывается страховщиком индивидуально и не включается в наш расчёт — выдуманные тарифы не
                подставляются.
              </p>
            )}
            {p.tradeIn && (
              <p className="text-[12px] leading-relaxed text-[#A2A7AF]">
                <strong className="text-[#F4F5F6]">Трейд-ин:</strong> {p.tradeIn}
              </p>
            )}

            <ul className="flex flex-col gap-1">
              {p.requirements.map((r) => (
                <li key={r} className="flex items-start gap-1.5 text-[12px] leading-relaxed text-[#A2A7AF]">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#F59E0B]" />
                  {r}
                </li>
              ))}
            </ul>

            <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-[#A2A7AF]">
                Источник:{' '}
                <a
                  className="underline decoration-[#2B3037] underline-offset-2 hover:text-[#F4F5F6]"
                  href={p.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => track('official_source_click', { program: p.id, url: p.sourceUrl })}
                >
                  {p.sourceUrl.replace('https://', '')}
                </a>
              </p>
              <Link
                to={`/budget?program=${p.id}`}
                onClick={() => track('program_view', { program: p.id })}
                className="flex min-h-[36px] items-center rounded-lg border border-[#2B3037] bg-[#20242A] px-2.5 text-[12px] font-bold text-[#A2A7AF] transition-colors hover:text-[#F4F5F6]"
              >
                Подобрать по этой программе →
              </Link>
            </div>
          </Card>
        ))}
      </div>

      <SectionTitle tip="Три сценария разделены, чтобы предварительный расчёт не выдавался за точные условия банка.">
        Как устроены расчёты по программам
      </SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Callout tone="info" title="1. Свободный расчёт">
          Вы сами задаёте ставку и срок — сервис считает аннуитет. Используется во вкладке «Кредит» и в подборе по
          бюджету, если программа не выбрана.
        </Callout>
        <Callout tone="success" title="2. Условия официальной программы">
          Ставка подставляется из опубликованной таблицы «взнос × срок» только для моделей-участниц и только в пределах
          лимитов программы (взнос, срок, сумма). Обязательные продукты (КАСКО) показываются явно.
        </Callout>
        <Callout tone="warn" title="3. Неизвестные условия банка">
          Если индивидуальная ставка банка не опубликована, расчёт помечается как предварительный: примерный платёж не
          выдаётся за точный, а одобрение не предполагается.
        </Callout>
      </div>

      <Card className="mt-4 bg-[#0B0C0E]">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 h-4 w-1 shrink-0 rounded-full bg-[#F59E0B]" aria-hidden="true" />
          <p className="text-[11px] leading-relaxed text-[#A2A7AF]">
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
    <div className="rounded-lg border border-[#2B3037] bg-[#0B0C0E]/70 px-2.5 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A2A7AF]">{label}</p>
      <p className="mt-0.5 text-[12px] font-semibold text-[#F4F5F6]">{value}</p>
    </div>
  )
}
