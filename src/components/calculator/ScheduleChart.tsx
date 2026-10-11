import { Bar } from 'react-chartjs-2'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
  type TooltipItem,
} from 'chart.js'
import { useMemo } from 'react'
import { aggregateByYear, buildSchedule } from '../../utils/credit'
import { fmtMoney } from '../../utils/format'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip)

/**
 * Структура платежей по годам: проценты и тело долга (stacked bar).
 */
export default function ScheduleChart({
  creditAmount,
  annualRate,
  termMonths,
}: {
  creditAmount: number
  annualRate: number
  termMonths: number
}) {
  const points = useMemo(() => {
    const raw = buildSchedule(creditAmount, annualRate, termMonths)
    return termMonths > 24 ? aggregateByYear(raw) : raw
  }, [creditAmount, annualRate, termMonths])

  if (points.length === 0) return null
  const isYear = termMonths > 24

  return (
    <div className="h-52 w-full">
      <Bar
        data={{
          labels: points.map((p) => p.label),
          datasets: [
            {
              label: isYear ? 'Проценты за год' : 'Проценты',
              data: points.map((p) => p.interestPart),
              backgroundColor: '#FF334B',
              borderRadius: 3,
              borderSkipped: false,
              stack: 'total',
              maxBarThickness: 28,
            },
            {
              label: isYear ? 'Тело долга за год' : 'Тело долга',
              data: points.map((p) => p.principalPart),
              backgroundColor: '#3B424C',
              borderRadius: 3,
              borderSkipped: false,
              stack: 'total',
              maxBarThickness: 28,
            },
          ],
        }}
        options={{
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: {
              stacked: true,
              grid: { display: false },
              border: { color: '#2B3037' },
              ticks: { color: '#A2A7AF', font: { size: 10 } },
            },
            y: {
              stacked: true,
              grid: { color: '#2B3037' },
              border: { display: false },
              ticks: {
                color: '#A2A7AF',
                font: { size: 10 },
                maxTicksLimit: 4,
                callback: (value) =>
                  Number(value) >= 1000 ? `${Math.round(Number(value) / 1000)} тыс.` : String(value),
              },
            },
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#0B0C0E',
              titleColor: '#A2A7AF',
              bodyColor: '#F4F5F6',
              borderColor: '#2B3037',
              borderWidth: 1,
              padding: 10,
              callbacks: {
                label: (ctx: TooltipItem<'bar'>) => ` ${ctx.dataset.label}: ${fmtMoney(Number(ctx.parsed.y))}`,
                footer: (items: TooltipItem<'bar'>[]) =>
                  `Платёж за период: ${fmtMoney(items.reduce((s, i) => s + Number(i.parsed.y), 0))}`,
              },
            },
          },
        }}
      />
      <div className="mt-2 flex gap-4 text-[10.5px] text-[#A2A7AF]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-[2px] bg-[#FF334B]" /> Проценты
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-[2px] bg-[#3B424C]" /> Тело долга
        </span>
      </div>
    </div>
  )
}
