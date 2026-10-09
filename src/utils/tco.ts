/**
 * Полная стоимость владения (TCO) за выбранный период.
 *
 * Принципы:
 *  — подтверждённые значения (расход топлива из официального прайс-листа,
 *    мощность) отделены от пользовательских оценок (цена топлива, ТО, страховка);
 *  — тарифы, которые неизвестны, не заполняются выдуманными цифрами:
 *    поле остаётся пустым, и расчёт этой статьи пропускается с пометкой;
 *  — кредитные платежи показываются отдельной статьёй и не дублируются
 *    в эксплуатационных расходах (страховка, включённая в тело кредита,
 *    исключается из операционных затрат);
 *  — стоимость автомобиля, переплата по кредиту и эксплуатация не смешиваются
 *    в один неразличимый показатель.
 */

export type ValueSource = 'official' | 'user' | 'missing'

export interface TcoInput {
  /** Годовой пробег, км */
  annualMileageKm: number
  /** Расход топлива, л/100 км (null — пользователь не задал) */
  fuelConsumptionL100: number | null
  /** Источник расхода: официальный прайс-лист или пользовательская оценка */
  consumptionSource?: ValueSource
  /** Цена топлива, ₽/л (null — неизвестна) */
  fuelPricePerL: number | null
  /** Стоимость ТО в год, ₽ (null — неизвестна) */
  maintenancePerYear: number | null
  /** Страхование в год (ОСАГО + КАСКО), ₽ (null — неизвестно) */
  insurancePerYear: number | null
  /** Транспортный налог в год, ₽ (null — неизвестен) */
  transportTaxPerYear: number | null
  /** Мощность, л.с. — для справочной оценки налога (не подменяет ставку региона) */
  horsepower?: number | null
  /** Ставка транспортного налога, ₽/л.с. (null — пользователь не указал) */
  taxRatePerHp?: number | null
  /** Сезонные шины, разовые расходы, ₽ */
  seasonalTires: number
  /** Шиномонтаж в год, ₽ */
  tireServicePerYear: number
  /** Прочие расходы в год (мойка, платные дороги, парковка), ₽ */
  otherPerYear: number
  /** Срок владения, лет */
  ownershipYears: number
  /** Ежемесячный кредитный платёж (0 — покупка без кредита) */
  monthlyLoanPayment: number
  /** Срок кредита, месяцев */
  loanTermMonths: number
  /** Страховка уже включена в тело кредита — не считать её повторно */
  loanIncludesInsurance?: boolean
}

export interface TcoCategory {
  key: string
  label: string
  /** Сумма за весь период владения, ₽ */
  total: number
  /** В год, ₽ */
  perYear: number
  /** В месяц, ₽ */
  perMonth: number
  /** Источник значения */
  source: ValueSource
  /** Пояснение, если значение пропущено или является оценкой */
  note: string | null
}

export interface TcoResult {
  categories: TcoCategory[]
  /** Эксплуатационные расходы (без кредитных платежей) */
  operatingTotal: number
  /** Кредитные платежи за период владения */
  loanPaymentsTotal: number
  /** Сколько месяцев кредита попадает в период владения */
  loanMonthsInPeriod: number
  /** Все расходы за период (эксплуатация + кредитные платежи) */
  grandTotal: number
  /** Средняя стоимость владения в месяц */
  monthlyAverage: number
  /** Приблизительная стоимость одного километра */
  costPerKm: number
  /** Суммарный пробег за период */
  totalMileageKm: number
  /** Предупреждения: пропущенные значения, риск двойного счёта */
  warnings: string[]
  /** Что подтверждено официальными данными */
  confirmed: string[]
  /** Что является пользовательской оценкой */
  estimates: string[]
}

export type TcoComputeResult = { ok: true; result: TcoResult } | { ok: false; errors: string[] }

const positive = (n: number | null): number => (n !== null && Number.isFinite(n) && n > 0 ? n : 0)

export function computeTco(input: TcoInput): TcoComputeResult {
  const errors: string[] = []
  const years = input.ownershipYears
  if (!Number.isFinite(years) || years <= 0 || years > 30) {
    errors.push('Срок владения должен быть от 1 до 30 лет.')
  }
  if (!Number.isFinite(input.annualMileageKm) || input.annualMileageKm < 0) {
    errors.push('Годовой пробег не может быть отрицательным.')
  }
  if (errors.length > 0) return { ok: false, errors }

  const warnings: string[] = []
  const confirmed: string[] = []
  const estimates: string[] = []
  const months = years * 12

  /* ---------------- Топливо ---------------- */
  const consumption = input.fuelConsumptionL100
  const fuelPrice = input.fuelPricePerL
  const annualKm = input.annualMileageKm
  let fuelPerYear = 0
  let fuelSource: ValueSource = 'missing'
  let fuelNote: string | null = null
  if (consumption === null || !(consumption > 0)) {
    fuelNote = 'Расход топлива не указан — статья не рассчитана. Возьмите значение из официального прайс-листа модели.'
    warnings.push('Расход топлива не задан: расходы на топливо не учтены.')
  } else if (fuelPrice === null || !(fuelPrice > 0)) {
    fuelNote = 'Цена топлива не указана — статья не рассчитана. Тариф не подставляется автоматически.'
    warnings.push('Цена топлива не задана: расходы на топливо не учтены.')
  } else {
    fuelPerYear = (annualKm * consumption * fuelPrice) / 100
    fuelSource = input.consumptionSource === 'official' ? 'official' : 'user'
    if (fuelSource === 'official') {
      confirmed.push(`Расход топлива ${consumption} л/100 км — из официального прайс-листа`)
    } else {
      estimates.push(`Расход топлива ${consumption} л/100 км — пользовательская оценка`)
    }
    estimates.push(`Цена топлива ${fuelPrice} ₽/л — пользовательская оценка`)
  }

  /* ---------------- ТО ---------------- */
  const maintenancePerYear = positive(input.maintenancePerYear)
  const maintenanceSource: ValueSource = input.maintenancePerYear === null ? 'missing' : 'user'
  if (maintenanceSource === 'missing') {
    warnings.push('Стоимость ТО не указана — статья не учтена. Тарифы дилера не подставляются автоматически.')
  } else {
    estimates.push(`Стоимость ТО ${Math.round(maintenancePerYear).toLocaleString('ru-RU')} ₽/год — пользовательская оценка`)
  }

  /* ---------------- Страхование ---------------- */
  const loanIncludesInsurance = Boolean(input.loanIncludesInsurance)
  const insurancePerYear = loanIncludesInsurance ? 0 : positive(input.insurancePerYear)
  const insuranceSource: ValueSource =
    input.insurancePerYear === null ? 'missing' : loanIncludesInsurance ? 'user' : 'user'
  if (loanIncludesInsurance && positive(input.insurancePerYear) > 0) {
    warnings.push(
      'Страхование включено в тело кредита и исключено из эксплуатационных расходов, ' +
        'чтобы один и тот же расход не учитывался дважды.',
    )
  } else if (insuranceSource === 'missing') {
    warnings.push('Стоимость страхования не указана — статья не учтена (КАСКО и ОСАГО не рассчитываются по выдуманным тарифам).')
  } else {
    estimates.push('Стоимость страхования — пользовательская оценка')
  }

  /* ---------------- Транспортный налог ---------------- */
  let taxPerYear = positive(input.transportTaxPerYear)
  let taxSource: ValueSource = input.transportTaxPerYear === null ? 'missing' : 'user'
  let taxNote: string | null = null
  if (taxPerYear === 0 && input.horsepower && input.taxRatePerHp && input.taxRatePerHp > 0) {
    taxPerYear = input.horsepower * input.taxRatePerHp
    taxSource = 'user'
    taxNote = `Оценка по мощности ${input.horsepower} л.с. × ${input.taxRatePerHp} ₽/л.с. Ставка зависит от региона — проверьте её.`
    estimates.push('Транспортный налог рассчитан по указанной пользователем ставке')
  } else if (taxSource === 'missing') {
    taxNote = 'Налог не указан. Ставка региона неизвестна — укажите сумму или ставку ₽/л.с.'
    warnings.push('Транспортный налог не учтён: ставка региона не подставляется автоматически.')
  } else {
    estimates.push('Транспортный налог — пользовательская оценка')
  }

  /* ---------------- Шины и шиномонтаж ---------------- */
  const tiresTotal = positive(input.seasonalTires)
  const tireServicePerYear = positive(input.tireServicePerYear)
  if (tiresTotal === 0 && tireServicePerYear === 0) {
    estimates.push('Сезонные шины и шиномонтаж не заданы — статьи не учтены')
  } else {
    estimates.push('Сезонные шины и шиномонтаж — пользовательская оценка')
  }

  /* ---------------- Прочие ---------------- */
  const otherPerYear = positive(input.otherPerYear)

  /* ---------------- Кредит ---------------- */
  const loanMonthsInPeriod = Math.max(0, Math.min(months, Math.round(input.loanTermMonths || 0)))
  const loanPaymentsTotal = loanMonthsInPeriod * positive(input.monthlyLoanPayment)
  if (positive(input.monthlyLoanPayment) > 0 && loanMonthsInPeriod === 0) {
    warnings.push('Срок кредита не указан — кредитные платежи не учтены в периоде владения.')
  }
  if (loanMonthsInPeriod < months && positive(input.monthlyLoanPayment) > 0) {
    warnings.push(
      `В период владения (${years} г.) попадает ${loanMonthsInPeriod} из ${months} месяцев кредита — ` +
        'учтены только платежи этого периода.',
    )
  }

  const categories: TcoCategory[] = [
    {
      key: 'fuel',
      label: 'Топливо',
      total: fuelPerYear * years,
      perYear: fuelPerYear,
      perMonth: fuelPerYear / 12,
      source: fuelSource,
      note: fuelNote,
    },
    {
      key: 'maintenance',
      label: 'Обслуживание (ТО)',
      total: maintenancePerYear * years,
      perYear: maintenancePerYear,
      perMonth: maintenancePerYear / 12,
      source: maintenanceSource,
      note: maintenanceSource === 'missing' ? 'Не указано пользователем' : null,
    },
    {
      key: 'insurance',
      label: 'Страхование',
      total: insurancePerYear * years,
      perYear: insurancePerYear,
      perMonth: insurancePerYear / 12,
      source: insuranceSource,
      note: loanIncludesInsurance
        ? 'Учтено в теле кредита — не дублируется в эксплуатации'
        : insuranceSource === 'missing'
          ? 'Не указано пользователем'
          : null,
    },
    {
      key: 'tax',
      label: 'Транспортный налог',
      total: taxPerYear * years,
      perYear: taxPerYear,
      perMonth: taxPerYear / 12,
      source: taxSource,
      note: taxNote,
    },
    {
      key: 'tires',
      label: 'Сезонные шины',
      total: tiresTotal,
      perYear: tiresTotal / years,
      perMonth: tiresTotal / months,
      source: tiresTotal > 0 ? 'user' : 'missing',
      note: tiresTotal > 0 ? null : 'Разовые расходы не указаны',
    },
    {
      key: 'tireService',
      label: 'Шиномонтаж',
      total: tireServicePerYear * years,
      perYear: tireServicePerYear,
      perMonth: tireServicePerYear / 12,
      source: tireServicePerYear > 0 ? 'user' : 'missing',
      note: tireServicePerYear > 0 ? null : 'Не указано',
    },
    {
      key: 'other',
      label: 'Прочие расходы',
      total: otherPerYear * years,
      perYear: otherPerYear,
      perMonth: otherPerYear / 12,
      source: otherPerYear > 0 ? 'user' : 'missing',
      note: otherPerYear > 0 ? null : 'Не указано',
    },
  ]

  const operatingTotal = categories.reduce((sum, c) => sum + c.total, 0)
  const grandTotal = operatingTotal + loanPaymentsTotal
  const totalMileageKm = annualKm * years

  return {
    ok: true,
    result: {
      categories,
      operatingTotal,
      loanPaymentsTotal,
      loanMonthsInPeriod,
      grandTotal,
      monthlyAverage: months > 0 ? grandTotal / months : 0,
      costPerKm: totalMileageKm > 0 ? grandTotal / totalMileageKm : 0,
      totalMileageKm,
      warnings,
      confirmed,
      estimates,
    },
  }
}

/** Стоимость километра только по эксплуатации (без кредитных платежей) */
export function operatingCostPerKm(result: TcoResult): number {
  return result.totalMileageKm > 0 ? result.operatingTotal / result.totalMileageKm : 0
}
