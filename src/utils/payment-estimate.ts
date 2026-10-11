/**
 * Оценка ежемесячного платежа для карточек («в кредит от …»).
 *
 * ВАЖНО: это не самостоятельная финансовая модель — расчёт выполняется
 * существующими функциями приложения (аннуитет из utils/loan) по ставкам
 * официальных кредитных программ из data/haval/credit-programs.
 * Если ни одна подтверждённая программа не покрывает комбинацию
 * «30% взнос / 60 мес.» — оценка не показывается (честное состояние).
 */
import { annuityPayment } from './loan'
import { programsForModel, programRateFor } from '../data/haval'

export interface PaymentEstimate {
  monthly: number
  ratePercent: number
  programName: string
}

const ESTIMATE_DOWN_PCT = 30
const ESTIMATE_TERM_MONTHS = 60

export function estimateMonthlyPayment(modelId: string, price: number): PaymentEstimate | null {
  if (!(price > 0)) return null
  const candidates: { rate: number; programName: string }[] = []
  for (const program of programsForModel(modelId)) {
    const rate = programRateFor(program.id, modelId, ESTIMATE_DOWN_PCT, ESTIMATE_TERM_MONTHS)
    if (rate !== null && rate > 0) candidates.push({ rate, programName: program.name })
  }
  if (candidates.length === 0) return null
  const best = candidates.reduce((a, b) => (a.rate <= b.rate ? a : b))
  const loanAmount = price * (1 - ESTIMATE_DOWN_PCT / 100)
  return {
    monthly: Math.round(annuityPayment(loanAmount, best.rate, ESTIMATE_TERM_MONTHS)),
    ratePercent: best.rate,
    programName: best.programName,
  }
}
