import { Link } from 'react-router-dom'
import type { HavalModel } from '../data/haval'
import { minCurrentPrice } from '../data/haval'
import { fmtMoney } from '../utils/format'
import { Tag } from './ui'
import { ChevronRightIcon } from './icons'
import { ModelImage } from './ModelImage'
import { FavoriteButton } from './ActionButtons'

/**
 * Карточка модели в каталоге: фото из официального источника, название,
 * краткое описание, цена «от» и переход к комплектациям.
 * Подробные характеристики раскрываются на странице модели — карточка не перегружается.
 */
export default function ModelCard({ model }: { model: HavalModel }) {
  const minTrim = minCurrentPrice(model.id)
  const comingSoon = model.availability === 'coming-soon'
  const unconfirmed = model.priceListUrl === null

  return (
    <article className="hover-lift group relative flex flex-col overflow-hidden rounded-[10px] border border-[#363B43]/85 bg-[#1A1D22] text-[#F3F4F4]">
      <Link to={`/models/${model.slug}`} className="flex flex-1 flex-col" aria-label={`${model.name} — подробнее`}>
        <div className="relative h-44 w-full overflow-hidden bg-[#0E1013] sm:h-48">
          <ModelImage
            model={model}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1A1D22] via-transparent to-transparent"
            aria-hidden="true"
          />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            <Tag>{model.family === 'PRO' ? 'HAVAL PRO' : model.family === 'PICKUP' ? 'Пикап' : 'HAVAL CITY'}</Tag>
            {comingSoon && <Tag tone="warn">скоро в продаже</Tag>}
            {unconfirmed && <Tag tone="warn">вне официального каталога</Tag>}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-display-num text-[18px] font-bold uppercase tracking-wide">{model.name}</h3>
            <ChevronRightIcon className="h-4 w-4 shrink-0 text-[#A9AFB7] transition-colors group-hover:text-[#E4002B]" />
          </div>
          <p className="text-[11.5px] text-[#A9AFB7]">
            {model.bodyType}
            {model.highlights && model.highlights.length > 0 ? ` · ${model.highlights[0]}` : ''}
          </p>
          <p className="line-clamp-2 text-[12px] leading-relaxed text-[#A9AFB7]">{model.description}</p>
          <div className="mt-auto flex items-baseline justify-between gap-2 pt-2">
            {comingSoon || !minTrim?.basePrice ? (
              <span className="text-[13px] font-semibold text-[#A9AFB7]">Цена: нет данных</span>
            ) : (
              <>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A9AFB7]">Цена от</span>
                <span className="font-display-num text-[20px] font-bold text-[#F3F4F4]">{fmtMoney(minTrim.basePrice)}</span>
              </>
            )}
          </div>
        </div>
      </Link>

      <div className="absolute right-2.5 top-2.5">
        <FavoriteButton modelId={model.id} />
      </div>
    </article>
  )
}
