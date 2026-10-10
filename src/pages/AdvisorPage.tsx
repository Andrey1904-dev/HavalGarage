import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button, Callout, Card, Field, SectionTitle, Select, TableCell, Tag } from '../components/ui'
import { SparklesIcon } from '../components/icons'
import {
  ADVISOR_DEFAULTS,
  advisorModels,
  askAdvisor,
  detectIntent,
  modelFacts,
  type AdvisorAnswer,
} from '../utils/advisor'
import { MODELS, minCurrentPrice } from '../data/haval'
import { fmtMoney, parseLocaleNumber } from '../utils/format'
import { useSeo } from '../utils/seo'
import { track } from '../utils/analytics'

/**
 * Помощник по выбору автомобиля.
 *
 * Детерминированный: ответ собирается из подтверждённых данных каталога по
 * правилам, а деньги считает тот же код, что и калькуляторы. Никаких
 * языковых моделей и платных API: ключ нельзя безопасно хранить в статическом
 * приложении, а имитация «умного» ответа создавала бы ложную уверенность.
 */
const EXAMPLES = [
  'Подберите автомобиль до 35 000 ₽ в месяц',
  'В чём разница комплектаций JOLION?',
  'Сравните H9 и H7',
  'Из чего состоит ежемесячный платёж?',
  'Стоит ли переплачивать за Техно +?',
]

export default function AdvisorPage() {
  const [params, setParams] = useSearchParams()
  const [question, setQuestion] = useState('')
  const [submitted, setSubmitted] = useState<string>('')
  const [answer, setAnswer] = useState<AdvisorAnswer | null>(null)

  const modelId = params.get('model') ?? ''
  const payment = params.get('payment') ?? '35000'
  const term = params.get('term') ?? String(ADVISOR_DEFAULTS.termMonths)
  const rate = params.get('rate') ?? String(ADVISOR_DEFAULTS.annualRatePercent).replace('.', ',')
  const downPct = params.get('down') ?? String(ADVISOR_DEFAULTS.downPaymentPercent)

  useSeo({
    title: 'Помощник по выбору HAVAL — подбор по бюджету, разница комплектаций, структура платежа',
    description:
      'Детерминированный помощник по каталогу HAVAL: подбор автомобиля под ежемесячный платёж, разница комплектаций ' +
      'по официальным прайс-листам, сравнение моделей и структура кредитного платежа. Отвечает только подтверждёнными данными.',
    path: '/advisor',
  })

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value === null || value === '') next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const model = MODELS.find((m) => m.id === modelId) ?? null
  const minPrice = model ? (minCurrentPrice(model.id)?.basePrice ?? null) : null

  const request = useMemo(
    () => ({
      maxMonthlyPayment: parseLocaleNumber(payment) || null,
      downPaymentRub:
        minPrice !== null ? Math.round((minPrice * (parseLocaleNumber(downPct) || 0)) / 100) : 0,
      termMonths: Math.round(parseLocaleNumber(term) || ADVISOR_DEFAULTS.termMonths),
      annualRatePercent: parseLocaleNumber(rate) || 0,
      modelId: modelId || null,
      trimIds: params.get('trims')?.split(',').filter(Boolean) ?? [],
    }),
    [payment, downPct, minPrice, term, rate, modelId, params],
  )

  const submit = (text: string) => {
    const value = text.trim()
    if (!value) return
    const result = askAdvisor(value, request)
    setSubmitted(value)
    setAnswer(result)
    track('advisor_query', { intent: result.intent, model: modelId || null })
  }

  const intentLabel = submitted ? detectIntent(submitted) : null

  return (
    <div className="animate-page-enter flex flex-col gap-4">
      <header className="flex flex-col gap-1.5">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#E4002B]">
          Детерминированный помощник · без языковой модели
        </p>
        <h1 className="font-display-num text-[26px] font-bold uppercase tracking-wide text-[#F3F4F4] sm:text-[32px]">
          Помощник по выбору
        </h1>
        <p className="max-w-3xl text-[12.5px] leading-relaxed text-[#A9AFB7]">
          Отвечает только подтверждёнными данными каталога: цены и комплектации — из официальных прайс-листов
          haval.ru, все денежные расчёты выполняет тот же код, что и калькуляторы. Никаких догадок: если данных
          нет, помощник так и скажет. Это не языковая модель и не имитация «умного» ответа.
        </p>
      </header>

      {/* ---------------- Параметры ---------------- */}
      <Card className="flex flex-col gap-3 p-3.5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Select label="Модель" value={modelId} onChange={(e) => setParam('model', e.target.value || null)}>
            <option value="">Не выбрана</option>
            {advisorModels().map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
          <Field
            label="Макс. платёж, ₽"
            inputMode="numeric"
            value={payment}
            onChange={(e) => setParam('payment', e.target.value)}
          />
          <Field label="Срок, мес" inputMode="numeric" value={term} onChange={(e) => setParam('term', e.target.value)} />
          <Field label="Ставка, %" inputMode="decimal" value={rate} onChange={(e) => setParam('rate', e.target.value)} />
          <Field
            label="Взнос, %"
            inputMode="numeric"
            value={downPct}
            onChange={(e) => setParam('down', e.target.value)}
          />
        </div>
        {model && minPrice !== null && (
          <p className="text-[11.5px] text-[#A9AFB7]">
            {model.name}: минимальная подтверждённая цена {fmtMoney(minPrice)} → взнос {downPct}% ={' '}
            <strong className="text-[#F3F4F4]">{fmtMoney(request.downPaymentRub)}</strong>
          </p>
        )}
      </Card>

      {/* ---------------- Вопрос ---------------- */}
      <Card className="flex flex-col gap-3 p-3.5">
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-semibold text-[#A9AFB7]">Ваш вопрос</span>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={2}
            placeholder="Например: подберите автомобиль до 35 000 ₽ в месяц"
            className="w-full rounded-[10px] border border-[#363B43] bg-[#23272D] px-3.5 py-2.5 text-[14px] text-[#F3F4F4] outline-none transition-colors placeholder:text-[#6B7280] focus:border-[#E4002B]"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={() => submit(question)} disabled={!question.trim()}>
            <SparklesIcon className="h-4 w-4" /> Спросить
          </Button>
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  setQuestion(e)
                  submit(e)
                }}
                className="min-h-[32px] rounded-[8px] border border-[#363B43] bg-[#23272D] px-2.5 text-[11px] text-[#A9AFB7] transition-colors hover:text-[#F3F4F4]"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* ---------------- Ответ ---------------- */}
      {answer && (
        <>
          <SectionTitle tip={intentLabel ? `Распознанное намерение: ${intentLabel}` : undefined}>
            {answer.title}
          </SectionTitle>

          <Card className="flex flex-col gap-2.5 p-3.5">
            {answer.paragraphs.map((p, i) => (
              <p key={i} className="text-[12.5px] leading-relaxed text-[#A9AFB7]">
                {p}
              </p>
            ))}

            {answer.rows.length > 0 && (
              <div className="mt-1 overflow-x-auto rounded-[10px] border border-[#363B43]/70">
                <table className="w-full min-w-[520px] border-collapse text-left text-[11.5px]">
                  <tbody>
                    {answer.rows.map((row, i) => (
                      <tr key={`${row.label}-${i}`} className="border-b border-[#363B43]/40 last:border-0">
                        <TableCell>{row.label}</TableCell>
                        <TableCell strong>
                          <span className={row.accent ? 'text-[#E4002B]' : undefined}>{row.value}</span>
                        </TableCell>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {answer.links.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-2">
                {answer.links.map((l) => (
                  <Link key={l.to + l.label} to={l.to}>
                    <Button type="button" variant="secondary" className="min-h-[36px]">
                      {l.label}
                    </Button>
                  </Link>
                ))}
              </div>
            )}

            {answer.disclaimer && (
              <Callout tone="warn" title="Важно понимать">
                {answer.disclaimer}
              </Callout>
            )}
          </Card>
        </>
      )}

      {/* ---------------- Справка по модели ---------------- */}
      {model && (
        <>
          <SectionTitle>Справка по {model.name}</SectionTitle>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {modelFacts(model).map((f) => (
              <Card key={f.label} className="p-3">
                <p className="text-[10px] uppercase tracking-wider text-[#A9AFB7]">{f.label}</p>
                <p className="font-display-num mt-0.5 text-[16px] font-bold text-[#F3F4F4]">{f.value}</p>
              </Card>
            ))}
          </div>
        </>
      )}

      <Callout tone="info" title="Почему здесь нет языковой модели">
        Подключение внешней языковой модели потребовало бы ключа API, а хранить его в статическом приложении на
        GitHub Pages нельзя — ключ попадёт в открытый бандл. Вместо этого помощник детерминирован: правила плюс
        подтверждённые данные каталога. Вариант подключения модели через собственный backend описан в{' '}
        <span className="font-bold text-[#F3F4F4]">docs/ARCHITECTURE.md</span>.
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Tag>без API-ключей</Tag>
          <Tag>без генерации цен</Tag>
          <Tag>только подтверждённые данные</Tag>
        </div>
      </Callout>
    </div>
  )
}
