import { useState } from 'react'
import type { HavalModel } from '../data/haval'
import { track } from '../utils/analytics'
import { assetUrl } from '../utils/seo'

/**
 * Фотография модели: сначала официальный снимок производителя (CDN haval.ru),
 * при недоступности — локальная копия из public/. Случайные и не соответствующие
 * модели изображения не используются.
 */
export function ModelImage({
  model,
  className = '',
  alt,
  eager = false,
}: {
  model: HavalModel
  className?: string
  alt?: string
  eager?: boolean
}) {
  const official = model.officialImages[0] ?? null
  const [failed, setFailed] = useState(false)
  const local = model.image ? assetUrl(model.image) : null
  const src = !failed && official ? official : local
  const label = alt ?? model.name

  if (!src) {
    return (
      <div
        className={`flex items-center justify-center bg-[#0E1013] font-display-num text-[26px] font-bold uppercase tracking-widest text-[#363B43] ${className}`}
        role="img"
        aria-label={label}
      >
        {model.name}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={label}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      referrerPolicy="no-referrer"
      fetchPriority={eager ? 'high' : undefined}
      onError={() => setFailed(true)}
      className={className}
    />
  )
}

/**
 * Галерея модели: официальные фотографии + локальная копия.
 * Переключение — кликом или с клавиатуры (стрелки).
 */
export function ModelGallery({ model }: { model: HavalModel }) {
  // локальная копия добавляется с base-путём (assetUrl): без него в сборке
  // для GitHub Pages (/HavalGarage/) фото отдавало бы 404
  const images = [...new Set([...model.officialImages, ...(model.image ? [assetUrl(model.image)] : [])])].filter(Boolean)
  const [index, setIndex] = useState(0)
  const [broken, setBroken] = useState<Record<string, boolean>>({})

  const visible = images.filter((src) => !broken[src])
  if (visible.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-[10px] border border-[#363B43] bg-[#0E1013] text-[12px] text-[#A9AFB7] sm:h-72">
        Фотография модели недоступны — проверьте соединение или откройте официальный источник
      </div>
    )
  }

  const current = visible[Math.min(index, visible.length - 1)]

  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-56 overflow-hidden rounded-[10px] border border-[#363B43] bg-[#0E1013] sm:h-72">
        <img
          key={current}
          src={current}
          alt={`${model.name} — фото ${Math.min(index, visible.length - 1) + 1} из ${visible.length}`}
          className="animate-car-in h-full w-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setBroken((b) => ({ ...b, [current]: true }))}
        />
        {visible.length > 1 && (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-[#0E1013] to-transparent px-3 pb-2.5 pt-6">
            <button
              type="button"
              onClick={() => setIndex((i) => (i - 1 + visible.length) % visible.length)}
              className="min-h-[36px] rounded-[8px] border border-[#363B43] bg-[#1A1D22]/90 px-3 text-[12px] font-bold text-[#F3F4F4]"
              aria-label="Предыдущее фото"
            >
              ←
            </button>
            <span className="text-[11px] font-semibold text-[#A9AFB7]">
              {Math.min(index, visible.length - 1) + 1} / {visible.length}
              <span className="ml-2 hidden sm:inline">официальные фото haval.ru</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setIndex((i) => (i + 1) % visible.length)
                track('trim_view', { model: model.id, action: 'gallery-next' })
              }}
              className="min-h-[36px] rounded-[8px] border border-[#363B43] bg-[#1A1D22]/90 px-3 text-[12px] font-bold text-[#F3F4F4]"
              aria-label="Следующее фото"
            >
              →
            </button>
          </div>
        )}
      </div>

      {visible.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {visible.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Показать фото ${i + 1}`}
              aria-current={i === index}
              className={`h-14 w-20 shrink-0 overflow-hidden rounded-[8px] border transition-colors ${
                i === index ? 'border-[#E4002B]' : 'border-[#363B43] hover:border-[#A9AFB7]'
              }`}
            >
              <img
                src={src}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
                onError={() => setBroken((b) => ({ ...b, [src]: true }))}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
