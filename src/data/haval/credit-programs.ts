import type { CreditProgram } from './types'

/**
 * Официальные кредитные программы, опубликованные дилером АГАТ
 * (https://agat-ekb-haval.ru/purchase/credit/ и сноски на страницах моделей).
 *
 * ВАЖНО: это данные типа «официальная программа» — опубликованные условия,
 * а не обещание банка. Рекламная минимальная ставка (0,01%) достигается только
 * при указанных ограничениях (взнос 60–80%, срок 12 мес. и т. п.) —
 * ограничения отображаются в интерфейсе (требования программы).
 */
export const CREDIT_PROGRAMS: CreditProgram[] = [
  {
    id: 'haval-smart',
    name: 'HAVAL SMART',
    kind: 'official',
    modelIds: ['m6', 'dargo', 'dargo-x', 'jolion', 'f7'],
    termMonthsMin: 12,
    termMonthsMax: 84,
    downPaymentMinPct: 10,
    downPaymentMaxPct: 80,
    loanAmountMin: 100_000,
    loanAmountMax: 6_000_000,
    rateBands: [
      {
        fromPct: 60,
        toPct: 80,
        ratesByTerm: { 12: 0.01, 24: 8.5, 36: 10.9, 48: 16.4, 60: 16.4, 72: 17.9, 84: 17.9 },
      },
      {
        fromPct: 40,
        toPct: 59.99,
        ratesByTerm: { 12: 4.4, 24: 14.4, 36: 18.9, 48: 20.4, 60: 20.4, 72: 21.9, 84: 21.9 },
      },
      {
        fromPct: 10,
        toPct: 39.99,
        ratesByTerm: { 12: 13.4, 24: 18.9, 36: 20.9, 48: 22.4, 60: 22.4, 72: 22.9, 84: 22.9 },
      },
    ],
    baseRate: null,
    requirements: [
      'Ставка 0,01% достигается при первоначальном взносе 60–80%, сроке 12 мес. и сумме кредита 100 000 – 6 000 000 ₽',
      'Отсутствие обязательного подтверждения дохода',
      'Отсутствие обязательного страхования жизни и других дополнительных услуг',
    ],
    pskRange: '0,010% – 24,393% годовых',
    validFrom: null,
    validUntil: null,
    sourceUrl: 'https://agat-ekb-haval.ru/purchase/credit/haval-smart/',
  },
  {
    id: 'haval-standard',
    name: 'HAVAL STANDARD',
    kind: 'official',
    modelIds: ['f7', 'm6', 'dargo', 'dargo-x', 'jolion', 'poer', 'poer-kingkong'],
    termMonthsMin: 36,
    termMonthsMax: 84,
    downPaymentMinPct: 20,
    downPaymentMaxPct: 80,
    loanAmountMin: 100_000,
    loanAmountMax: null,
    rateBands: [
      {
        fromPct: 20,
        toPct: 80,
        ratesByTerm: { 12: null, 24: null, 36: 26.2, 48: 26.2, 60: 26.2, 72: 26.2, 84: 26.2 },
      },
    ],
    baseRate: 26.2,
    requirements: [
      'Процентная ставка 26,2% годовых при сроке 36–84 мес. и первоначальном взносе от 20%',
      'Обеспечение по кредиту — залог приобретаемого автомобиля',
      'Условия действуют при оформлении страхования по КАСКО HAVAL Insurance',
    ],
    pskRange: '26,197% – 26,198% годовых',
    validFrom: null,
    validUntil: null,
    sourceUrl: 'https://agat-ekb-haval.ru/purchase/credit/haval-standard/',
  },
  {
    id: 'haval-credit-jolion',
    name: 'HAVAL Кредит Jolion',
    kind: 'official',
    modelIds: ['jolion'],
    termMonthsMin: 12,
    termMonthsMax: 84,
    downPaymentMinPct: 10,
    downPaymentMaxPct: 80,
    loanAmountMin: 100_000,
    loanAmountMax: 10_000_000,
    baseRate: null,
    requirements: ['Валюта кредита — рубли РФ', 'Подробности в дилерских центрах HAVAL CITY'],
    pskRange: '0,015% – 12,807% годовых (тариф «Haval ОСОБЫЙ Экстра Haval City» для Jolion, F7 2025–2026 г.в.)',
    validFrom: null,
    validUntil: null,
    sourceUrl: 'https://agat-ekb-haval.ru/models/haval-jolion/',
  },
  {
    id: 'haval-credit-promo',
    name: 'HAVAL Кредит Промо',
    kind: 'official',
    modelIds: ['f7x', 'm6', 'dargo'],
    termMonthsMin: 12,
    termMonthsMax: 84,
    downPaymentMinPct: 10,
    downPaymentMaxPct: 80,
    loanAmountMin: 100_000,
    loanAmountMax: 10_000_000,
    baseRate: null,
    requirements: [
      'Распространяется на Haval F7x, M6, Dargo 2025–2026 года производства',
      'Действует в салонах официальных дилеров HAVAL CITY (по состоянию на 11.08.2026)',
    ],
    pskRange: null,
    validFrom: null,
    validUntil: null,
    sourceUrl: 'https://agat-ekb-haval.ru/',
  },
  {
    id: 'haval-special-city',
    name: 'Тариф «Haval ОСОБЫЙ Haval City»',
    kind: 'official',
    modelIds: ['jolion', 'f7', 'f7x', 'dargo', 'm6'],
    termMonthsMin: 12,
    termMonthsMax: 84,
    downPaymentMinPct: 10,
    downPaymentMaxPct: 80,
    loanAmountMin: 100_000,
    loanAmountMax: null,
    baseRate: 0.01,
    requirements: [
      'Новые автомобили HAVAL моделей JOLION, F7, F7X, DARGO, M6 2025 и 2026 года производства (всех комплектаций)',
      'Рекламная ставка «от 0,01%» — размер ставки зависит от первоначального взноса и срока кредита',
      'Условия действуют при оформлении страхования по КАСКО HAVAL Страхование',
    ],
    pskRange: null,
    validFrom: null,
    validUntil: null,
    sourceUrl: 'https://agat-ekb-haval.ru/purchase/special-offer/',
  },
  {
    id: 'haval-special-plus-city',
    name: 'Тариф «Haval ОСОБЫЙ Плюс Haval City»',
    kind: 'official',
    modelIds: ['f7', 'f7x', 'dargo', 'm6'],
    termMonthsMin: 12,
    termMonthsMax: 84,
    downPaymentMinPct: 10,
    downPaymentMaxPct: 80,
    loanAmountMin: 100_000,
    loanAmountMax: null,
    baseRate: 0.015,
    requirements: [
      'Новые автомобили HAVAL моделей F7, F7X, Dargo, M6 2025 и 2026 года производства (всех комплектаций)',
      'Условия действуют при оформлении страхования по КАСКО HAVAL Страхование',
    ],
    pskRange: '0,015% – 13,509% годовых',
    validFrom: null,
    validUntil: null,
    sourceUrl: 'https://agat-ekb-haval.ru/',
  },
  {
    id: 'haval-special',
    name: 'Тариф «Haval Специальный»',
    kind: 'official',
    modelIds: ['h5', 'jolion', 'dargo', 'm6', 'f7', 'f7x', 'h3', 'h7'],
    termMonthsMin: 12,
    termMonthsMax: 84,
    downPaymentMinPct: 10,
    downPaymentMaxPct: 80,
    loanAmountMin: 100_000,
    loanAmountMax: null,
    baseRate: null,
    requirements: [
      'Модель H5 2024, 2025 и 2026 года производства; модели JOLION, DARGO, M6, F7, F7X, H3, H7 2025 и 2026 года производства',
    ],
    pskRange: null,
    validFrom: null,
    validUntil: null,
    sourceUrl: 'https://agat-ekb-haval.ru/',
  },
]

export const getProgram = (id: string): CreditProgram | undefined =>
  CREDIT_PROGRAMS.find((p) => p.id === id)

/** Официальные программы, в которые входит модель */
export const programsForModel = (modelId: string): CreditProgram[] =>
  CREDIT_PROGRAMS.filter((p) => p.modelIds.includes(modelId))

/**
 * Ставка официальной программы для модели при заданных взносе (%) и сроке (мес).
 * Возвращает null, если модель не участвует или комбинация не покрыта таблицей.
 */
export function programRateFor(
  programId: string,
  modelId: string,
  downPaymentPct: number,
  termMonths: number,
): number | null {
  const p = getProgram(programId)
  if (!p || !p.modelIds.includes(modelId)) return null
  if (!p.rateBands) return p.baseRate
  const band = p.rateBands.find((b) => downPaymentPct >= b.fromPct && downPaymentPct <= b.toPct)
  if (!band) return null
  const terms = Object.keys(band.ratesByTerm)
    .map(Number)
    .sort((a, b) => a - b)
  const nearest = terms.reduce((best, t) => (Math.abs(t - termMonths) < Math.abs(best - termMonths) ? t : best), terms[0])
  return band.ratesByTerm[nearest] ?? null
}
