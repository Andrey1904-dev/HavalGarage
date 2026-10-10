import { annuityPayment, principalFromPayment, termFromPayment } from './loan'
import { searchByBudget, type BudgetMatch } from './budget'
import { fmtMoney } from './format'
import {
  MODELS,
  compareFeatures,
  getModel,
  getOfficialSpecs,
  minCurrentPrice,
  programsForModel,
  trimDetails,
  trimsForModel,
  type HavalModel,
  type Trim,
} from '../data/haval'

/**
 * Детерминированный помощник по выбору автомобиля.
 *
 * Это НЕ имитация языковой модели: никаких случайных ответов и «креативных»
 * формулировок. Каждый ответ собирается из подтверждённых данных каталога
 * правилами, а все денежные вычисления выполняет тот же код, что и
 * калькуляторы (utils/loan, utils/budget). Если данных не хватает, помощник
 * так и говорит — вместо того чтобы придумать недостающее.
 *
 * Интеграция с внешней языковой моделью не подключается: она требовала бы
 * ключа API, который в статическом приложении хранить нельзя. Вариант
 * подключения описан в docs/ARCHITECTURE.md.
 */

export type AdvisorIntent = 'budget' | 'trim-diff' | 'compare' | 'payment-structure' | 'tradeoff' | 'unknown'

export interface AdvisorAnswer {
  intent: AdvisorIntent
  /** Заголовок ответа */
  title: string
  /** Абзацы пояснения */
  paragraphs: string[]
  /** Табличные строки ответа (подпись → значение) */
  rows: Array<{ label: string; value: string; accent?: boolean }>
  /** Ссылки, упомянутые в ответе */
  links: Array<{ label: string; to: string }>
  /** Явная оговорка об оценочных данных, если она уместна */
  disclaimer?: string
}

export interface AdvisorRequest {
  /** Основа запроса: максимальный платёж, ₽ */
  maxMonthlyPayment: number | null
  downPaymentRub: number
  termMonths: number
  annualRatePercent: number
  /** Модель для вопросов о комплектациях (slug или id) */
  modelId?: string | null
  /** Комплектации для сравнения */
  trimIds?: string[]
}

const MIN_TERM = 12
const MAX_TERM = 84

/** Условия по умолчанию: 20% взноса, 60 месяцев, 16,4% — как в каталоге комплектаций */
export const ADVISOR_DEFAULTS = {
  downPaymentPercent: 20,
  termMonths: 60,
  annualRatePercent: 16.4,
}

/** Грубое определение намерения по тексту пользователя */
export function detectIntent(text: string): AdvisorIntent {
  const t = text.toLowerCase()
  // Порядок важен. Вопрос о компромиссе («стоит ли переплачивать») содержит
  // «переплат», а вопрос о структуре платежа («из чего состоит платёж») —
  // «платёж», поэтому более конкретные правила проверяются первыми.
  if (/компромисс|стоит ли перепла|дороже, но|оправдан/.test(t)) return 'tradeoff'
  if (/из чего|состоит|структур|переплат|процент|аннуитет/.test(t)) return 'payment-structure'
  if (/бюджет|плат[ие]ть|плат[её]ж|в месяц|до \d|не более|потян|хватает|подешевле|денег|подбер|подбор/.test(t)) return 'budget'
  if (/разниц|отлича|чем отлича|что добав|в чём разн/.test(t)) return 'trim-diff'
  if (/сравн|или|выбрать между|что лучше/.test(t)) return 'compare'
  return 'unknown'
}

/** Условия по умолчанию для расчёта платежа */
function paymentFor(price: number, request: AdvisorRequest): number {
  const down = Math.min(price, request.downPaymentRub)
  const creditAmount = Math.max(0, price - down)
  if (creditAmount <= 0) return 0
  return annuityPayment(creditAmount, request.annualRatePercent, request.termMonths)
}

/** Ответ «подберите модель под платёж» */
function answerBudget(request: AdvisorRequest): AdvisorAnswer {
  const maxPayment = request.maxMonthlyPayment
  if (maxPayment === null || !Number.isFinite(maxPayment) || maxPayment <= 0) {
    return {
      intent: 'budget',
      title: 'Нужен максимальный платёж',
      paragraphs: [
        'Чтобы подобрать автомобиль по бюджету, укажите сумму, которую готовы платить ежемесячно. ' +
          'Подбор детерминированный: считается максимальная сумма кредита по аннуитетной схеме, к ней ' +
          'прибавляется первоначальный взнос, затем из каталога выбираются комплектации, укладывающиеся в лимит.',
      ],
      rows: [],
      links: [{ label: 'Открыть подбор по бюджету', to: '/budget' }],
    }
  }

  const term = Math.min(MAX_TERM, Math.max(MIN_TERM, Math.round(request.termMonths)))
  const result = searchByBudget({
    maxMonthlyPayment: maxPayment,
    downPaymentRub: request.downPaymentRub,
    termMonths: term,
    annualRatePercent: request.annualRatePercent,
  })

  if (!result.ok) {
    return {
      intent: 'budget',
      title: 'Не удалось выполнить подбор',
      paragraphs: result.errors.map((e) => `• ${e}`),
      rows: [],
      links: [{ label: 'Открыть подбор по бюджету', to: '/budget' }],
    }
  }

  const affordable = result.matches.filter((m) => m.eligible && m.withinBudget)

  if (affordable.length === 0) {
    const cheapest = [...result.matches].sort((a, b) => a.monthlyPayment - b.monthlyPayment)[0]
    const shortest = cheapest ? termFromPayment(cheapest.creditAmount, request.annualRatePercent, maxPayment) : null
    const biggerDown = cheapest
      ? Math.max(0, cheapest.price - principalFromPayment(maxPayment, request.annualRatePercent, term))
      : null
    return {
      intent: 'budget',
      title: 'В этот платёж автомобиль не укладывается',
      paragraphs: [
        `При взносе ${fmtMoney(request.downPaymentRub)}, сроке ${term} мес. и ставке ${request.annualRatePercent}% ` +
          `доступная сумма кредита даёт максимальную цену автомобиля около ${fmtMoney(result.maxAffordablePrice)}.`,
        cheapest
          ? `Самый доступный вариант каталога — ${cheapest.candidate.modelName} ${cheapest.candidate.trimName} ` +
            `за ${fmtMoney(cheapest.price)}, но его платёж ${fmtMoney(cheapest.monthlyPayment)} ` +
            `(превышение ${fmtMoney(cheapest.overBy)} в месяц).`
          : '',
        'Что расширит выбор — расчёт, а не обещание:',
      ].filter(Boolean),
      rows: [
        ...(shortest && Number.isFinite(shortest)
          ? [{ label: 'Увеличить срок до', value: `≈ ${Math.ceil(shortest)} мес.` }]
          : []),
        ...(biggerDown !== null
          ? [
              {
                label: 'Увеличить первоначальный взнос до',
                value: fmtMoney(biggerDown),
                accent: true,
              },
            ]
          : []),
        {
          label: 'Или снизить цену автомобиля до',
          value: fmtMoney(result.maxAffordablePrice),
        },
      ],
      links: [
        { label: 'Подобрать с другими параметрами', to: '/budget' },
        ...(cheapest ? [{ label: `Открыть ${cheapest.candidate.modelName}`, to: `/models/${cheapest.candidate.modelId}` }] : []),
      ],
      disclaimer:
        'Расчёт математический: реальная ставка и одобрение определяются банком, поэтому это ориентир, а не предложение.',
    }
  }

  const top = affordable.slice(0, 5)
  return {
    intent: 'budget',
    title: `Укладывается в платёж до ${fmtMoney(maxPayment)}: ${affordable.length} вариантов`,
    paragraphs: [
      `Условия расчёта: первоначальный взнос ${fmtMoney(request.downPaymentRub)}, срок ${term} мес., ` +
        `ставка ${request.annualRatePercent}% годовых, аннуитетная схема. ` +
        `Максимальная цена автомобиля при этих условиях — ${fmtMoney(result.maxAffordablePrice)}.`,
      'Пять наиболее доступных вариантов:',
    ],
    rows: top.map((m) => ({
      label: `${m.candidate.modelName} ${m.candidate.trimName}`,
      value: `${fmtMoney(m.price)} · платёж ${fmtMoney(m.monthlyPayment)} · переплата ${fmtMoney(m.interestOverpay)}`,
      accent: m === top[0],
    })),
    links: [
      { label: 'Полный подбор с фильтрами', to: '/budget' },
      ...(top[0] ? [{ label: `Открыть ${top[0].candidate.modelName}`, to: `/models/${top[0].candidate.modelId}` }] : []),
    ],
    disclaimer:
      'Цены — МЦП из официальных прайс-листов. Выгоды по трейд-ин и спецпрограммам в этот подсчёт не входят: ' +
      'они применяются отдельно и только при выполнении условий.',
  }
}

/** Ответ «в чём разница комплектаций» */
function answerTrimDiff(request: AdvisorRequest): AdvisorAnswer {
  const modelId = request.modelId ?? null
  const model = modelId ? getModel(modelId) : null
  if (!model) {
    return {
      intent: 'trim-diff',
      title: 'Выберите модель',
      paragraphs: [
        'Чтобы объяснить разницу комплектаций, нужна конкретная модель. Выберите её в каталоге — ' +
          'помощник сравнит комплектации по официальной матрице различий из прайс-листа и покажет, ' +
          'что именно добавляет каждый следующий уровень оснащения и сколько это стоит.',
      ],
      rows: [],
      links: [{ label: 'Открыть каталог', to: '/catalog' }],
    }
  }

  const trims = trimsForModel(model.id).filter((t) => t.basePrice !== null)
  if (trims.length < 2) {
    return {
      intent: 'trim-diff',
      title: `У ${model.name} одна комплектация с подтверждённой ценой`,
      paragraphs: [
        'Сравнивать нечего: официальный прайс-лист публикует для этой модели только одну комплектацию с ценой. ' +
          'Разницу можно посмотреть между моделями — для этого добавьте их в сравнение.',
      ],
      rows: [],
      links: [{ label: `Открыть ${model.name}`, to: `/models/${model.slug}` }],
    }
  }

  const sorted = [...trims].sort((a, b) => (a.basePrice ?? 0) - (b.basePrice ?? 0))
  const features = compareFeatures(sorted.map((t) => t.id))
  const rows: AdvisorAnswer['rows'] = []

  for (let i = 0; i < sorted.length; i++) {
    const trim = sorted[i]
    const price = trim.basePrice ?? 0
    const payment = paymentFor(price, request)
    const prev = i > 0 ? sorted[i - 1] : null
    const step = prev ? price - (prev.basePrice ?? 0) : 0
    rows.push({
      label: trim.name,
      value:
        `${fmtMoney(price)} · платёж ${fmtMoney(payment)}` +
        (prev ? ` · доплата к «${prev.name}» ${fmtMoney(step)}` : ''),
      accent: i === 0,
    })
  }

  const differing = features.filter((f) => new Set(sorted.map((t) => f.values[t.id])).size > 1)
  const paragraphs = [
    `У ${model.name} ${sorted.length} комплектаций с подтверждённой ценой. ` +
      `Диапазон цен: ${fmtMoney(sorted[0].basePrice ?? 0)} — ${fmtMoney(sorted[sorted.length - 1].basePrice ?? 0)}.`,
    differing.length > 0
      ? `По официальной матрице прайс-листа комплектации различаются по ${differing.length} позициям оснащения. ` +
        'Ниже — ключевые различия; полная таблица на странице модели.'
      : 'Официальный прайс-лист не публикует матрицу различий для этой модели.',
  ]

  for (const feature of differing.slice(0, 8)) {
    const value = sorted
      .map((t) => `${shortTrim(t)}: ${availabilityText(feature.values[t.id])}`)
      .join(' · ')
    rows.push({ label: feature.feature, value })
  }

  return {
    intent: 'trim-diff',
    title: `Комплектации ${model.name}`,
    paragraphs,
    rows,
    links: [
      { label: `Страница ${model.name}`, to: `/models/${model.slug}` },
      { label: 'Сравнить выбранные', to: `/compare?trims=${sorted.slice(0, 3).map((t) => t.id).join(',')}` },
    ],
    disclaimer:
      'Значение «не подтверждено» означает, что официальный документ не раскрывает эту позицию для комплектации — ' +
      'это не равно отсутствию функции.',
  }
}

/** Ответ «сравните два автомобиля» */
function answerCompare(request: AdvisorRequest): AdvisorAnswer {
  const ids = (request.trimIds ?? []).filter(Boolean).slice(0, 3)
  const details = ids.map((id) => trimDetails(id)).filter((d): d is NonNullable<ReturnType<typeof trimDetails>> => d !== null)

  if (details.length < 2) {
    return {
      intent: 'compare',
      title: 'Добавьте два автомобиля для сравнения',
      paragraphs: [
        'Выберите две или три комплектации — в каталоге, на странице модели или в разделе сравнения. ' +
          'Помощник покажет разницу в цене, мощности, приводе, расходе и ежемесячном платеже, ' +
          'посчитанном на одних и тех же условиях.',
      ],
      rows: [],
      links: [{ label: 'Открыть сравнение', to: '/compare' }],
    }
  }

  const rows: AdvisorAnswer['rows'] = []
  const priced = details.map((d) => ({
    d,
    price: d.trim.basePrice ?? 0,
    payment: paymentFor(d.trim.basePrice ?? 0, request),
  }))
  const base = priced[0]

  rows.push({
    label: 'Цена (МЦП)',
    value: priced.map((p) => `${p.d.model.name} ${p.d.trim.name}: ${fmtMoney(p.price)}`).join(' · '),
  })
  rows.push({
    label: `Платёж (взнос ${fmtMoney(request.downPaymentRub)}, ${request.termMonths} мес., ${request.annualRatePercent}%)`,
    value: priced.map((p) => `${p.d.trim.name}: ${fmtMoney(p.payment)}`).join(' · '),
    accent: true,
  })
  rows.push({
    label: 'Мощность',
    value: details.map((d) => `${d.trim.name}: ${d.trim.horsepower ?? 'нет данных'} л.с.`).join(' · '),
  })
  rows.push({
    label: 'Привод и коробка',
    value: details.map((d) => `${d.trim.name}: ${d.trim.drivetrain}, ${d.trim.transmission}`).join(' · '),
  })
  rows.push({
    label: 'Расход (смешанный)',
    value: details
      .map((d) => `${d.trim.name}: ${d.consumption?.combined !== null && d.consumption?.combined !== undefined ? `${d.consumption.combined} л/100 км` : 'нет данных'}`)
      .join(' · '),
  })

  for (let i = 1; i < priced.length; i++) {
    const priceDiff = priced[i].price - base.price
    const paymentDiff = priced[i].payment - base.payment
    rows.push({
      label: `Разница: ${base.d.trim.name} → ${priced[i].d.trim.name}`,
      value: `${priceDiff >= 0 ? '+' : '−'}${fmtMoney(Math.abs(priceDiff))} к цене · ` +
        `${paymentDiff >= 0 ? '+' : '−'}${fmtMoney(Math.abs(paymentDiff))} к платежу в месяц`,
    })
  }

  return {
    intent: 'compare',
    title: `Сравнение: ${details.map((d) => `${d.model.name} ${d.trim.name}`).join(' против ')}`,
    paragraphs: [
      'Все платежи посчитаны на одних условиях, поэтому разницу можно сравнивать напрямую. ' +
        'Данные — из официальных прайс-листов; выгоды по программам в расчёт не включены.',
    ],
    rows,
    links: [
      { label: 'Открыть подробное сравнение', to: `/compare?trims=${ids.join(',')}` },
      ...details.map((d) => ({ label: d.model.name, to: `/models/${d.model.slug}` })),
    ],
  }
}

/** Ответ «из чего состоит платёж» */
function answerPaymentStructure(request: AdvisorRequest): AdvisorAnswer {
  const modelId = request.modelId ?? null
  const model = modelId ? getModel(modelId) : null
  const trim = model ? (trimsForModel(model.id).find((t) => t.basePrice !== null) ?? null) : null
  const price = trim?.basePrice ?? null

  const paragraphs = [
    'Ежемесячный платёж по аннуитетной схеме одинаков весь срок, но состоит из двух разных частей: ' +
      'проценты за пользование кредитом и погашение тела долга. В начале срока почти весь платёж — проценты, ' +
      'к концу — почти всё тело.',
    'Формула: A = P · r · (1 + r)^n / ((1 + r)^n − 1), где P — сумма кредита, r — месячная ставка ' +
      '(годовая / 12 / 100), n — число платежей. При нулевой ставке A = P / n. Промежуточные значения ' +
      'не округляются — округляются только суммы при выводе.',
  ]

  const rows: AdvisorAnswer['rows'] = []
  if (price !== null && trim) {
    const down = Math.min(price, request.downPaymentRub)
    const creditAmount = Math.max(0, price - down)
    const payment = paymentFor(price, request)
    const totalPaid = payment * request.termMonths
    const interest = Math.max(0, totalPaid - creditAmount)
    rows.push({ label: 'Автомобиль', value: `${model?.name ?? ''} ${trim.name}` })
    rows.push({ label: 'Цена', value: fmtMoney(price) })
    rows.push({ label: 'Первоначальный взнос', value: fmtMoney(down) })
    rows.push({ label: 'Сумма кредита', value: fmtMoney(creditAmount) })
    rows.push({ label: 'Ежемесячный платёж', value: fmtMoney(payment), accent: true })
    rows.push({ label: 'Всего выплат', value: fmtMoney(totalPaid) })
    rows.push({ label: 'Проценты за весь срок', value: fmtMoney(interest), accent: true })
    rows.push({
      label: 'Доля процентов в выплатах',
      value: totalPaid > 0 ? `${((interest / totalPaid) * 100).toFixed(1)}%` : '—',
    })
  } else {
    rows.push({
      label: 'Пример расчёта',
      value: 'Выберите модель, и помощник покажет разбивку по конкретному автомобилю',
    })
  }

  return {
    intent: 'payment-structure',
    title: 'Из чего состоит ежемесячный платёж',
    paragraphs,
    rows,
    links: [
      { label: 'Кредитный калькулятор', to: '/calculator' },
      ...(model ? [{ label: `${model.name}`, to: `/models/${model.slug}` }] : []),
    ],
    disclaimer:
      'Реальный график конкретного банка может отличаться: правила округления, комиссии, страховки и даты ' +
      'платежей задаются договором. Здесь — математическая симуляция, а не оферта.',
  }
}

/** Ответ о компромиссе «цена — оснащение» */
function answerTradeoff(request: AdvisorRequest): AdvisorAnswer {
  const modelId = request.modelId ?? null
  const model = modelId ? getModel(modelId) : null
  if (!model) {
    return {
      intent: 'tradeoff',
      title: 'Выберите модель для оценки компромисса',
      paragraphs: [
        'Помощник может показать, сколько стоит каждый шаг вверх по комплектациям и что именно вы за эти деньги ' +
          'получаете. Выберите модель — расчет пойдёт по официальной матрице различий прайс-листа.',
      ],
      rows: [],
      links: [{ label: 'Каталог моделей', to: '/catalog' }],
    }
  }
  return answerTrimDiff(request)
}

function availabilityText(value: string | undefined): string {
  if (value === 'standard') return 'есть'
  if (value === 'optional') return 'опция'
  if (value === 'unavailable') return 'нет'
  return 'не подтверждено'
}

function shortTrim(trim: Trim): string {
  return trim.name.split(',')[0].trim()
}

/** Справочные сведения о модели (для шапки помощника) */
export function modelFacts(model: HavalModel): Array<{ label: string; value: string }> {
  const specs = getOfficialSpecs(model.id)
  const min = minCurrentPrice(model.id)
  const programs = programsForModel(model.id)
  return [
    { label: 'Комплектаций в каталоге', value: String(trimsForModel(model.id).length) },
    { label: 'Цена от', value: min?.basePrice !== null && min?.basePrice !== undefined ? fmtMoney(min.basePrice) : 'нет данных' },
    { label: 'Кузов', value: specs?.bodyType ?? model.bodyType },
    { label: 'Кредитных программ', value: String(programs.length) },
  ]
}

/** Список моделей для выбора */
export const advisorModels = (): HavalModel[] => MODELS

/** Единственная точка входа помощника: текст + параметры → детерминированный ответ */
export function askAdvisor(text: string, request: AdvisorRequest): AdvisorAnswer {
  const intent = detectIntent(text)
  switch (intent) {
    case 'budget':
      return answerBudget(request)
    case 'trim-diff':
      return answerTrimDiff(request)
    case 'compare':
      return answerCompare(request)
    case 'payment-structure':
      return answerPaymentStructure(request)
    case 'tradeoff': {
      // Ответ о компромиссе собирается как разница комплектаций, но намерение
      // пользователя в ответе сохраняется — по нему видно, что именно спросили.
      const answer = answerTradeoff(request)
      return { ...answer, intent: 'tradeoff' }
    }
    case 'unknown':
    default:
      return {
        intent: 'unknown',
        title: 'Что я умею',
        paragraphs: [
          'Я отвечаю только по подтверждённым данным каталога HavalGarage: ценам и комплектациям из официальных ' +
            'прайс-листов haval.ru. Все денежные расчёты выполняет обычный код — без догадок и без генерации текста.',
          'Спросите, например: «подберите автомобиль до 35 000 ₽ в месяц», «в чём разница комплектаций JOLION», ' +
            '«сравните H9 и H7», «из чего состоит платёж», «стоит ли переплачивать за Техно +».',
        ],
        rows: [
          { label: 'Подбор по бюджету', value: 'считает максимальную цену и показывает подходящие комплектации' },
          { label: 'Разница комплектаций', value: 'по официальной матрице различий прайс-листа' },
          { label: 'Сравнение', value: 'до трёх автомобилей на одних условиях кредита' },
          { label: 'Структура платежа', value: 'тело долга, проценты и переплата' },
        ],
        links: [
          { label: 'Подбор по бюджету', to: '/budget' },
          { label: 'Каталог комплектаций', to: '/trims' },
          { label: 'Кредитный калькулятор', to: '/calculator' },
        ],
        disclaimer:
          'Это детерминированный помощник на правилах, а не языковая модель: он не придумывает цены, ' +
          'ставки и характеристики, а если данных нет — говорит об этом.',
      }
  }
}

export type { BudgetMatch }
