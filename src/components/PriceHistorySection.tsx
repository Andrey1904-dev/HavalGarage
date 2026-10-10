import { useEffect, useMemo, useState } from 'react'
import { Callout, SectionTitle, Select } from './ui'
import PriceHistoryChart from './PriceHistoryChart'
import { trimsWithPriceDynamics } from '../data/haval/price-changes'
import type { HavalModel, Trim } from '../data/haval'

/**
 * Блок «История цен» на странице модели.
 *
 * Комплектации, по которым накоплена реальная динамика, идут первыми: у них
 * есть что показать. Остальные доступны в списке, но для них честно
 * говорится, что подтверждена только одна точка.
 */
export default function PriceHistorySection({ model, trims }: { model: HavalModel; trims: Trim[] }) {
  const withDynamics = useMemo(() => new Set(trimsWithPriceDynamics()), [])
  const priced = useMemo(() => trims.filter((t) => t.basePrice !== null), [trims])

  const sorted = useMemo(
    () =>
      [...priced].sort((a, b) => {
        const da = withDynamics.has(a.id) ? 0 : 1
        const db = withDynamics.has(b.id) ? 0 : 1
        return da - db || a.name.localeCompare(b.name, 'ru')
      }),
    [priced, withDynamics],
  )

  const [selected, setSelected] = useState<string>(sorted[0]?.id ?? '')
  useEffect(() => {
    if (sorted.length > 0 && !sorted.some((t) => t.id === selected)) setSelected(sorted[0].id)
  }, [sorted, selected])

  if (priced.length === 0) return null

  const active = priced.find((t) => t.id === selected) ?? priced[0]
  const dynamicsCount = sorted.filter((t) => withDynamics.has(t.id)).length

  return (
    <>
      <SectionTitle
        tip="История собирается с первого подтверждённого импорта: точка добавляется только при наличии документа-источника. Разные типы цен (МЦП, цена с выгодой, трейд-ин) на графике не смешиваются."
      >
        История цен
      </SectionTitle>

      <div className="flex flex-col gap-3 rounded-[10px] border border-[#363B43]/85 bg-[#1A1D22] p-3.5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select label="Комплектация" value={active.id} onChange={(e) => setSelected(e.target.value)}>
            {sorted.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {withDynamics.has(t.id) ? ' — есть динамика' : ''}
              </option>
            ))}
          </Select>
          <div className="flex items-end">
            <p className="text-[11.5px] leading-relaxed text-[#A9AFB7]">
              У {model.name} накоплена динамика цен по {dynamicsCount} из {priced.length} комплектаций с
              подтверждённой ценой. По остальным подтверждена одна точка — снимок официального прайс-листа.
            </p>
          </div>
        </div>

        <PriceHistoryChart trimId={active.id} trimName={active.name} />

        {dynamicsCount === 0 && (
          <Callout tone="info">
            По этой модели пока нет серии из двух и более подтверждённых точек: официальные прайс-листы прошлых
            лет для неё не сохранились. История начнёт накапливаться со следующего подтверждённого импорта —
            ретроспектива по предположениям не строится.
          </Callout>
        )}
      </div>
    </>
  )
}
