import { useMemo, useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type TooltipItem,
} from 'chart.js'
import { Button, Callout, Select, TableCell, Tag } from './ui'
import { priceChangesForTrim, pricePointsForTrim, priceHistoryTypesForTrim, type PricePoint } from '../data/haval/price-changes'
import { fmtDate, fmtMoney } from '../utils/format'
import { downloadCsv } from '../utils/export-data'
import { track } from '../utils/analytics'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

const TYPE_LABELS: Record<string, string> = {
  msrp: 'МЦП (официальный прайс-лист)',
  'with-benefit': 'цена с подтверждённой выгодой',
  'trade-in': 'цена при трейд-ин',
  credit: 'цена по кредитной программе',
  stock: 'цена автомобиля в наличии',
  teaser: 'тизер (требует подтверждения)',
}

const ORIGIN_LABELS: Record<PricePoint['origin'], string> = {
  import: 'пайплайн импорта',
  manual: 'внесено вручную по документу',
  archive: 'архивная запись прошлых лет',
}

const COLORS = ['#E4002B', '#3B82F6', '#16B374', '#F5A623']

/**
 * История цены комплектации.
 *
 * Разные типы цен НИКОГДА не рисуются одной линией: МЦП и цена с выгодой —
 * это разные условия покупки, их смешение создало бы ложную картину.
 * Если история состоит из одной точки, график не строится — показывается
 * честное пояснение, что история собирается с первого подтверждённого импорта.
 */
export default function PriceHistoryChart({ trimId, trimName }: { trimId: string; trimName: string }) {
  const changes = useMemo(() => priceChangesForTrim(trimId), [trimId])
  const types = useMemo(() => priceHistoryTypesForTrim(trimId), [trimId])
  const [activeType, setActiveType] = useState<string>(types[0] ?? 'msrp')

  const points = useMemo(() => pricePointsForTrim(trimId, activeType as PricePoint['priceType']), [trimId, activeType])

  if (changes.length === 0) {
    return (
      <Callout tone="info" title="История цен пока не собрана">
        Для комплектации «{trimName}» нет ни одной подтверждённой точки истории. История собирается с момента
        первого подтверждённого импорта; фиктивные точки по предположениям не создаются.
      </Callout>
    )
  }

  const hasDynamics = points.length > 1
  const dates = points.map((p) => fmtDate(p.date))

  const exportCsv = () => {
    downloadCsv(
      `haval-price-history-${trimId}.csv`,
      ['Дата', 'Цена, ₽', 'Тип цены', 'Происхождение точки', 'Источник', 'Примечание'],
      changes.map((c) => [
        c.changedAt,
        c.newPrice,
        TYPE_LABELS[c.newPriceType] ?? c.newPriceType,
        ORIGIN_LABELS[c.origin] ?? c.origin,
        c.sourceUrl,
        c.note ?? '',
      ]),
    )
    track('export_csv', { section: 'price-history', trim: trimId })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {types.length > 1 && (
            <Select
              label="Тип цены"
              value={activeType}
              onChange={(e) => setActiveType(e.target.value)}
              className="min-w-[240px]"
            >
              {types.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t] ?? t}
                </option>
              ))}
            </Select>
          )}
          <Tag tone={hasDynamics ? 'success' : 'default'}>
            точек истории: {points.length}
          </Tag>
        </div>
        <Button type="button" variant="ghost" className="min-h-[34px]" onClick={exportCsv}>
          CSV
        </Button>
      </div>

      {hasDynamics ? (
        <div className="h-56 w-full">
          <Line
            data={{
              labels: dates,
              datasets: [
                {
                  label: TYPE_LABELS[activeType] ?? activeType,
                  data: points.map((p) => p.amount),
                  borderColor: COLORS[0],
                  backgroundColor: 'rgba(228, 0, 43, 0.12)',
                  borderWidth: 2,
                  fill: true,
                  tension: 0.25,
                  pointRadius: points.map((p) => (p.origin === 'archive' ? 5 : 4)),
                  pointBackgroundColor: points.map((p) => (p.origin === 'archive' ? '#F5A623' : COLORS[0])),
                  pointBorderColor: '#0E1013',
                  pointBorderWidth: 2,
                  spanGaps: true,
                },
              ],
            }}
            options={{
              maintainAspectRatio: false,
              interaction: { mode: 'index', intersect: false },
              scales: {
                x: {
                  grid: { display: false },
                  border: { color: '#363B43' },
                  ticks: { color: '#A9AFB7', font: { size: 10 }, maxRotation: 0, autoSkipPadding: 12 },
                },
                y: {
                  grid: { color: '#363B43' },
                  border: { display: false },
                  ticks: {
                    color: '#A9AFB7',
                    font: { size: 10 },
                    maxTicksLimit: 5,
                    callback: (value) => `${Math.round(Number(value) / 1000)} тыс. ₽`,
                  },
                },
              },
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: '#0E1013',
                  titleColor: '#A9AFB7',
                  bodyColor: '#F3F4F4',
                  borderColor: '#363B43',
                  borderWidth: 1,
                  padding: 10,
                  callbacks: {
                    label: (ctx: TooltipItem<'line'>) => ` ${fmtMoney(Number(ctx.parsed.y))}`,
                    afterBody: (items: TooltipItem<'line'>[]) => {
                      const point = points[items[0]?.dataIndex ?? 0]
                      return point ? [`Происхождение: ${ORIGIN_LABELS[point.origin]}`, point.note ?? ''].filter(Boolean) : []
                    },
                  },
                },
              },
            }}
          />
          <div className="mt-2 flex flex-wrap gap-4 text-[10.5px] text-[#A9AFB7]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#E4002B]" /> подтверждённая цена прайс-листа
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#F5A623]" /> архивная запись прошлых лет
            </span>
          </div>
        </div>
      ) : (
        <Callout tone="info" title="Динамика пока не накоплена">
          Для этой комплектации подтверждена одна точка цены ({fmtMoney(points[0]?.amount ?? 0)} от{' '}
          {fmtDate(points[0]?.date ?? '')}). График строится, когда появятся минимум две точки: новая версия
          официального прайс-листа или архивная запись с источником. История по предположениям не достраивается.
        </Callout>
      )}

      <div className="overflow-x-auto rounded-[10px] border border-[#363B43]/70">
        <table className="w-full min-w-[560px] border-collapse text-left text-[11.5px]">
          <thead>
            <tr className="bg-[#1A1D22] text-[10px] uppercase tracking-wider text-[#A9AFB7]">
              <th className="px-3 py-2 font-semibold">Дата</th>
              <th className="px-3 py-2 font-semibold">Цена</th>
              <th className="px-3 py-2 font-semibold">Тип</th>
              <th className="px-3 py-2 font-semibold">Происхождение</th>
              <th className="px-3 py-2 font-semibold">Источник</th>
            </tr>
          </thead>
          <tbody>
            {changes.map((c) => (
              <tr key={c.id} className="border-t border-[#363B43]/50">
                <TableCell>{fmtDate(c.changedAt)}</TableCell>
                <TableCell className="font-display-num font-bold">{fmtMoney(c.newPrice)}</TableCell>
                <TableCell>{TYPE_LABELS[c.newPriceType] ?? c.newPriceType}</TableCell>
                <TableCell>{ORIGIN_LABELS[c.origin] ?? c.origin}</TableCell>
                <TableCell>
                  <a
                    href={c.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] underline decoration-[#363B43] underline-offset-2 hover:text-[#F3F4F4]"
                  >
                    документ
                  </a>
                </TableCell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
