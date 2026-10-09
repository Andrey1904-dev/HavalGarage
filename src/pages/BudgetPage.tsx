import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Button,
  Callout,
  Card,
  Checkbox,
  EmptyState,
  Field,
  SectionTitle,
  Select,
  StatTile,
  Tag,
} from '../components/ui'
import { AlertIcon, SearchIcon, TargetIcon } from '../components/icons'
import { FavoriteButton, CompareToggle } from '../components/ActionButtons'
import PriceMeta from '../components/PriceMeta'
import { CREDIT_PROGRAMS, getProgram, getTrim, trimCombinedConsumption } from '../data/haval'
import {
  searchByBudget,
  sortBudgetMatches,
  type BudgetMatch,
  type BudgetSort,
  type DrivetrainFilter,
} from '../utils/budget'
import { TERM_OPTIONS } from '../utils/credit'
import { fmtMoney, fmtNumber, parseLocaleNumber, pluralMonths } from '../utils/format'
import { useSeo } from '../utils/seo'
import { track } from '../utils/analytics'

/**
 * Подбор автомобиля по бюджету.
 *
 * Пользователь задаёт максимальный платёж, взнос, срок, ставку (или официальную
 * программу), тип кузова, привод, минимально необходимые функции и необязательный
 * бюджет на обслуживание. Алгоритм — детерминированный (обратная аннуитетная
 * формула), результаты объясняются списком причин.
 *
 * Автомобили, нарушающие обязательные ограничения, не показываются вовсе.
 * Варианты с превышением бюджета не скрываются, но помечены явно.
 */

const FEATURE_PRESETS = [
  'Адаптивный круиз-контроль',
  'Камера кругового обзора',
  'Светодиодные фары',
  'Панорамная крыша',
  'Подогрев руля',
  'Вентиляция сидений',
  'Кожаный салон',
  'Беспроводная зарядка',
]

const SORTS: Array<{ value: BudgetSort; label: string }> = [
  { value: 'fit', label: 'по соответствию' },
  { value: 'payment', label: 'по платежу' },
  { value: 'price', label: 'по цене' },
  { value: 'total', label: 'по общей стоимости кредита' },
]

export default function BudgetPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const [payment, setPayment] = useState(params.get('payment') ?? '45000')
  const [down, setDown] = useState(params.get('down') ?? '400000')
  const [term, setTerm] = useState(Number(params.get('term') ?? 60))
  const [rate, setRate] = useState(params.get('rate') ?? '16,4')
  const [programId, setProgramId] = useState<string>(params.get('program') ?? 'none')
  const [priceMode, setPriceMode] = useState<'msrp' | 'best-available'>('msrp')
  const [bodyTypes, setBodyTypes] = useState<string[]>([])
  const [drivetrain, setDrivetrain] = useState<DrivetrainFilter>('any')
  const [features, setFeatures] = useState<string[]>([])
  const [customFeature, setCustomFeature] = useState('')
  const [maintenance, setMaintenance] = useState('')
  const [sort, setSort] = useState<BudgetSort>('fit')

  useSeo({
    title: 'Подбор автомобиля HAVAL по бюджету и ежемесячному платежу',
    description:
      'Укажите комфортный ежемесячный платёж, первоначальный взнос, срок и ставку — сервис рассчитает максимальную ' +
      'стоимость автомобиля и подберёт модели и комплектации HAVAL с объяснением причин. Расчёт детерминированный.',
    path: '/budget',
  })

  useEffect(() => {
    const trimParam = params.get('trim')
    if (trimParam && getTrim(trimParam)) {
      // переход из калькулятора с конкретной комплектацией — ничего не меняем, просто фиксируем событие
      track('budget_search', { source: 'query', trim: trimParam })
    }
     
  }, [params])

  const paymentNum = parseLocaleNumber(payment) || 0
  const downNum = Math.max(0, parseLocaleNumber(down) || 0)
  const rateNum = Math.max(0, parseLocaleNumber(rate) || 0)
  const maintenanceNum = parseLocaleNumber(maintenance)
  const usingProgram = programId !== 'none'

  const result = useMemo(
    () =>
      searchByBudget({
        maxMonthlyPayment: paymentNum,
        downPaymentRub: downNum,
        termMonths: term,
        annualRatePercent: rateNum,
        programId: usingProgram ? programId : null,
        priceMode,
        bodyTypes,
        drivetrain,
        requiredFeatures: features,
        maintenanceBudgetMonthly: Number.isFinite(maintenanceNum) && maintenanceNum > 0 ? maintenanceNum : null,
      }),
    [paymentNum, downNum, term, rateNum, usingProgram, programId, priceMode, bodyTypes, drivetrain, features, maintenanceNum],
  )

  useEffect(() => {
    if (result.ok) {
      track('budget_search', {
        payment: Math.round(paymentNum),
        down: Math.round(downNum),
        term,
        program: usingProgram ? programId : null,
        results: result.matches.length,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- событие аналитики на изменение результата
  }, [result])

  const sorted = useMemo(() => (result.ok ? sortBudgetMatches(result.matches, sort) : []), [result, sort])
  const fitting = sorted.filter((m) => m.withinBudget)
  const over = sorted.filter((m) => !m.withinBudget)

  const program = usingProgram ? getProgram(programId) : null

  const toggleBody = (value: string) =>
    setBodyTypes((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))

  const toggleFeature = (value: string) =>
    setFeatures((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))

  const addCustomFeature = () => {
    const value = customFeature.trim()
    if (!value) return
    toggleFeature(value)
    setCustomFeature('')
  }

  return (
    <div className="animate-page-enter flex flex-col gap-4">
      <header className="flex flex-col gap-1.5">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#E4002B]">Что можно купить с вашим бюджетом</p>
        <h1 className="font-display-num text-[26px] font-bold uppercase tracking-wide text-[#F3F4F4] sm:text-[32px]">
          Подбор по бюджету
        </h1>
        <p className="max-w-2xl text-[12.5px] leading-relaxed text-[#A9AFB7]">
          Расчёт воспроизводимый: максимальная сумма кредита определяется обратной аннуитетной формулой, затем к ней
          добавляется ваш взнос. Обязательные ограничения (кузов, привод, функции, лимиты программы) исключают
          неподходящие варианты; превышающие бюджет показываются отдельно и помечаются.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.35fr]">
        {/* ---------------- Параметры ---------------- */}
        <div className="flex flex-col gap-3">
          <Card className="flex flex-col gap-3">
            <p className="flex items-center gap-2 text-[13px] font-bold text-[#F3F4F4]">
              <TargetIcon className="h-4 w-4 text-[#E4002B]" /> Бюджет и кредит
            </p>

            <Field
              label="Максимальный комфортный платёж в месяц"
              suffix="₽"
              inputMode="numeric"
              value={payment}
              onChange={(e) => setPayment(e.target.value)}
            />
            <Field
              label="Первоначальный взнос"
              suffix="₽"
              inputMode="numeric"
              value={down}
              onChange={(e) => setDown(e.target.value)}
              hint="Накопления и сумма от продажи текущего автомобиля (трейд-ин считается в разделе «План покупки»)"
            />

            <div className="grid grid-cols-2 gap-3">
              <Select label="Срок кредита" value={term} onChange={(e) => setTerm(Number(e.target.value))}>
                {TERM_OPTIONS.map((t) => (
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
                hint={usingProgram ? 'Заменена ставкой программы' : undefined}
              />
            </div>

            <Select
              label="Сценарий расчёта"
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
            >
              <option value="none">Свободный расчёт по введённой ставке</option>
              {CREDIT_PROGRAMS.map((p) => (
                <option key={p.id} value={p.id}>
                  Официальная программа: {p.name}
                </option>
              ))}
            </Select>

            {program && (
              <Callout tone="info" title={program.name}>
                Срок {program.termMonthsMin}–{program.termMonthsMax} мес · взнос {program.downPaymentMinPct}–
                {program.downPaymentMaxPct}%
                {program.loanAmountMax ? ` · сумма до ${fmtMoney(program.loanAmountMax)}` : ''}
                {program.requiredProducts.length > 0 ? ` · условия: ${program.requiredProducts.join(', ')}` : ''}.
                Автомобили, не участвующие в программе или не подходящие под её лимиты, исключаются из выдачи.
                Расчёт предварительный: индивидуальные условия банка неизвестны.
              </Callout>
            )}

            <Field
              label="Бюджет на обслуживание и эксплуатацию (необязательно)"
              suffix="₽/мес"
              inputMode="numeric"
              placeholder="0"
              value={maintenance}
              onChange={(e) => setMaintenance(e.target.value)}
              hint="Вычитается из доступного платежа: кредит и эксплуатация не смешиваются в одну сумму"
            />

            <div>
              <span className="mb-1.5 block text-[12.5px] font-semibold text-[#A9AFB7]">Какую цену использовать</span>
              <div className="flex gap-1.5">
                {(
                  [
                    ['msrp', 'МЦП из прайс-листа'],
                    ['best-available', 'С подтверждённой выгодой'],
                  ] as Array<['msrp' | 'best-available', string]>
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPriceMode(value)}
                    className={`min-h-[40px] flex-1 rounded-[8px] border px-2.5 text-[11.5px] font-bold transition-colors ${
                      priceMode === value
                        ? 'border-[#E4002B] bg-[#E4002B]/12 text-[#F3F4F4]'
                        : 'border-[#363B43] bg-[#23272D] text-[#A9AFB7] hover:text-[#F3F4F4]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {priceMode === 'best-available' && (
                <p className="mt-1.5 text-[10.5px] leading-relaxed text-[#A9AFB7]">
                  Показываются и варианты с выгодой (трейд-ин, спеццены в наличии). Выгода не применяется автоматически:
                  в карточке указаны условия её получения.
                </p>
              )}
            </div>
          </Card>

          <Card className="flex flex-col gap-3">
            <p className="text-[13px] font-bold text-[#F3F4F4]">Обязательные требования</p>

            <div>
              <span className="mb-1.5 block text-[12.5px] font-semibold text-[#A9AFB7]">Тип кузова</span>
              <div className="grid grid-cols-2 gap-1.5">
                {['Кроссовер', 'Купе-кроссовер', 'Внедорожник', 'Пикап'].map((b) => (
                  <Checkbox
                    key={b}
                    label={b}
                    checked={bodyTypes.includes(b)}
                    onChange={() => toggleBody(b)}
                  />
                ))}
              </div>
            </div>

            <Select
              label="Привод"
              value={drivetrain}
              onChange={(e) => setDrivetrain(e.target.value as DrivetrainFilter)}
            >
              <option value="any">Любой</option>
              <option value="fwd">Передний (2WD)</option>
              <option value="awd">Полный (4WD)</option>
            </Select>

            <div>
              <span className="mb-1.5 block text-[12.5px] font-semibold text-[#A9AFB7]">Минимально необходимые функции</span>
              <div className="flex flex-wrap gap-1.5">
                {FEATURE_PRESETS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleFeature(f)}
                    aria-pressed={features.includes(f)}
                    className={`min-h-[36px] rounded-[8px] border px-2.5 text-[11.5px] font-semibold transition-colors ${
                      features.includes(f)
                        ? 'border-[#E4002B] bg-[#E4002B]/12 text-[#F3F4F4]'
                        : 'border-[#363B43] bg-[#23272D] text-[#A9AFB7] hover:text-[#F3F4F4]'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Field
                  className="flex-1"
                  label=""
                  placeholder="Своя функция, например «массаж»"
                  value={customFeature}
                  onChange={(e) => setCustomFeature(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addCustomFeature()
                    }
                  }}
                />
                <Button type="button" variant="secondary" className="mt-auto" onClick={addCustomFeature}>
                  Добавить
                </Button>
              </div>
              {features.length > 0 && (
                <p className="mt-1.5 text-[10.5px] leading-relaxed text-[#A9AFB7]">
                  Требования проверяются по официальным прайс-листам. Если документ не раскрывает функцию для
                  комплектации, вариант исключается — отсутствие сведений не считается наличием функции.
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* ---------------- Результаты ---------------- */}
        <div className="flex flex-col gap-3">
          {!result.ok ? (
            <Card className="border-[#EF4444]/40">
              <div className="flex items-start gap-3">
                <AlertIcon className="h-5 w-5 shrink-0 text-[#EF4444]" />
                <div>
                  <p className="text-[13px] font-bold text-[#EF4444]">Проверьте параметры подбора</p>
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
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <StatTile
                  label="Бюджет на авто"
                  value={fmtMoney(result.maxAffordablePrice)}
                  hint="взнос + сумма кредита"
                  tone="accent"
                />
                <StatTile
                  label="Доступно под кредит"
                  value={fmtMoney(result.availableForLoanPayment)}
                  hint={maintenanceNum > 0 ? `после вычета ${fmtMoney(maintenanceNum)} на эксплуатацию` : 'весь платёж — на кредит'}
                />
                <StatTile label="Подходит" value={fitting.length} tone="success" hint="в пределах платежа" />
                <StatTile label="Альтернативы" value={over.length} tone="warn" hint="превышают бюджет" />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[12px] text-[#A9AFB7]">
                  Срок {pluralMonths(term)} · ставка{' '}
                  {usingProgram && program ? `по программе «${program.name}»` : `${String(rateNum).replace('.', ',')}%`} ·
                  взнос {fmtMoney(downNum)}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SORTS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => {
                        setSort(s.value)
                        track('budget_sort', { sort: s.value })
                      }}
                      className={`min-h-[34px] rounded-[8px] border px-2.5 text-[11px] font-bold transition-colors ${
                        sort === s.value
                          ? 'border-[#E4002B] bg-[#E4002B]/12 text-[#F3F4F4]'
                          : 'border-[#363B43] bg-[#23272D] text-[#A9AFB7] hover:text-[#F3F4F4]'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {sorted.length === 0 ? (
                <EmptyState
                  icon={<SearchIcon className="h-6 w-6" />}
                  title="Подходящих вариантов нет"
                  text={
                    usingProgram
                      ? 'Ни одна комплектация не проходит по условиям выбранной программы и вашим требованиям. Попробуйте свободный расчёт, другой срок или взнос.'
                      : 'Ни одна комплектация каталога не соответствует вашим обязательным требованиям. Ослабьте требования или увеличьте бюджет.'
                  }
                  action={
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setBodyTypes([])
                          setFeatures([])
                          setDrivetrain('any')
                        }}
                      >
                        Сбросить требования
                      </Button>
                      <Link to="/calculator">
                        <Button type="button" variant="ghost">
                          К кредитному калькулятору
                        </Button>
                      </Link>
                    </div>
                  }
                />
              ) : (
                <>
                  {fitting.length > 0 && (
                    <>
                      <SectionTitle tip="Варианты, укладывающиеся в заданный платёж с учётом бюджета на эксплуатацию.">
                        Подходят под бюджет
                      </SectionTitle>
                      <div className="flex flex-col gap-3">
                        {fitting.map((m) => (
                          <MatchCard
                            key={`${m.candidate.trimId}-${m.candidate.priceType}-${m.candidate.price}`}
                            match={m}
                            onOpen={(trimId) => navigate(`/calculator?trim=${trimId}`)}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  {over.length > 0 && (
                    <>
                      <SectionTitle tip="Эти варианты превышают заданный платёж. Превышение указано явно — они не выдаются за подходящие.">
                        Альтернативы с превышением бюджета
                      </SectionTitle>
                      <div className="flex flex-col gap-3">
                        {over.map((m) => (
                          <MatchCard
                            key={`${m.candidate.trimId}-${m.candidate.priceType}-${m.candidate.price}`}
                            match={m}
                            onOpen={(trimId) => navigate(`/calculator?trim=${trimId}`)}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}

              <Callout tone="warn">
                Подбор — математическая симуляция, а не одобрение кредита. Итоговые условия определяет банк; ставки
                официальных программ достигаются только при выполнении опубликованных требований (взнос, срок, сумма,
                КАСКО). Цены — МЦП из официальных прайс-листов, не публичная оферта.
              </Callout>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function MatchCard({ match, onOpen }: { match: BudgetMatch; onOpen: (trimId: string) => void }) {
  const trim = match.trim
  const consumption = trim ? trimCombinedConsumption(trim.id) : null

  return (
    <Card className={`flex flex-col gap-2.5 ${match.withinBudget ? '' : 'border-[#F5A623]/40'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link
            to={`/models/${match.model?.slug ?? match.candidate.modelId}`}
            className="font-display-num text-[16px] font-bold uppercase tracking-wide text-[#F3F4F4] hover:text-[#E4002B]"
          >
            {match.candidate.modelName}
          </Link>
          <p className="text-[12px] text-[#A9AFB7]">
            {match.candidate.trimName} · {match.candidate.bodyType} · {match.candidate.drivetrain}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <p className="font-display-num text-[20px] font-bold leading-none text-[#F3F4F4]">{fmtMoney(match.price)}</p>
          {match.withinBudget ? (
            <Tag tone="success">в бюджете</Tag>
          ) : (
            <Tag tone="warn">превышение {fmtMoney(match.overBy)}/мес</Tag>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniStat label="Платёж" value={fmtMoney(match.monthlyPayment)} />
        <MiniStat label="Взнос" value={`${fmtMoney(match.downPayment)} (${match.downPaymentPct.toFixed(0)}%)`} />
        <MiniStat label="Сумма кредита" value={fmtMoney(match.creditAmount)} />
        <MiniStat
          label="Переплата"
          value={fmtMoney(match.interestOverpay)}
          tone="accent"
          hint={`всего выплат ${fmtMoney(match.totalPaid)}`}
        />
      </div>

      {consumption !== null && (
        <p className="text-[11px] text-[#A9AFB7]">
          Расход топлива (смешанный, по прайс-листу): {fmtNumber(consumption)} л/100 км. Полная стоимость владения с ТО,
          страховкой и налогом — в разделе{' '}
          <Link to={`/ownership?trim=${match.candidate.trimId}`} className="underline underline-offset-2 hover:text-[#F3F4F4]">
            «Стоимость владения»
          </Link>
          .
        </p>
      )}

      <ul className="flex flex-col gap-1">
        {match.reasons.map((r) => (
          <li key={r} className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-[#A9AFB7]">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#16B374]" aria-hidden="true" />
            {r}
          </li>
        ))}
      </ul>

      {match.warnings.length > 0 && (
        <ul className="flex flex-col gap-1">
          {match.warnings.map((w) => (
            <li key={w} className="flex items-start gap-1.5 text-[11px] leading-relaxed text-[#F5A623]">
              <AlertIcon className="mt-0.5 h-3 w-3 shrink-0" />
              {w}
            </li>
          ))}
        </ul>
      )}

      {trim && <PriceMeta trim={trim} compact />}

      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        <Button type="button" variant="secondary" className="min-h-[40px]" onClick={() => onOpen(match.candidate.trimId)}>
          Рассчитать этот вариант
        </Button>
        <CompareToggle trimId={match.candidate.trimId} />
        {match.model && <FavoriteButton modelId={match.model.id} trimId={match.candidate.trimId} />}
      </div>
    </Card>
  )
}

function MiniStat({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: string
  hint?: string
  tone?: 'default' | 'accent'
}) {
  return (
    <div className="rounded-[8px] border border-[#363B43] bg-[#0E1013]/70 px-2.5 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#A9AFB7]">{label}</p>
      <p
        className={`font-display-num mt-0.5 text-[14px] font-bold ${
          tone === 'accent' ? 'text-[#E4002B]' : 'text-[#F3F4F4]'
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[10px] text-[#A9AFB7]">{hint}</p>}
    </div>
  )
}
