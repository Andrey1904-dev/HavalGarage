import { Link } from 'react-router-dom'
import { useSaved } from '../context/SavedContext'
import { useCompare, MAX_COMPARE } from '../context/CompareContext'
import { HeartIcon, CompareIcon, CheckIcon } from './icons'

/**
 * Кнопка «в избранное» (модель или комплектация). Хранение — localStorage,
 * без регистрации и без отправки данных на сервер.
 */
export function FavoriteButton({
  modelId,
  trimId = null,
  className = '',
}: {
  modelId: string
  trimId?: string | null
  className?: string
}) {
  const { isFavorite, toggleFavorite } = useSaved()
  const active = isFavorite(modelId, trimId)
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggleFavorite({ kind: trimId ? 'trim' : 'model', modelId, trimId })
      }}
      aria-pressed={active}
      aria-label={active ? 'Убрать из избранного' : 'Добавить в избранное'}
      title={active ? 'В избранном — нажмите, чтобы убрать' : 'Добавить в избранное'}
      className={`flex min-h-[38px] min-w-[38px] items-center justify-center gap-1.5 rounded-[8px] border px-2.5 text-[11.5px] font-bold transition-colors ${
        active
          ? 'border-[#E4002B] bg-[#E4002B]/15 text-[#E4002B]'
          : 'border-[#363B43] bg-[#23272D] text-[#A9AFB7] hover:text-[#F3F4F4]'
      } ${className}`}
    >
      <HeartIcon className="h-4 w-4" />
      {active && <span className="hidden sm:inline">В избранном</span>}
    </button>
  )
}

/**
 * Кнопка добавления комплектации в сравнение (не более трёх).
 * Если комплектация уже добавлена — ведёт на страницу сравнения.
 */
export function CompareToggle({ trimId, label = 'Сравнить' }: { trimId: string; label?: string }) {
  const { has, toggle, isFull, trimIds } = useCompare()
  const active = has(trimId)

  if (active) {
    return (
      <Link
        to={`/compare?trims=${trimIds.join(',')}`}
        className="flex min-h-[38px] items-center justify-center gap-1.5 rounded-[8px] border border-[#16B374]/50 bg-[#16B374]/12 px-2.5 text-[11.5px] font-bold text-[#16B374] transition-colors hover:bg-[#16B374]/20"
      >
        <CheckIcon className="h-4 w-4" /> В сравнении ({trimIds.length}/{MAX_COMPARE})
      </Link>
    )
  }

  return (
    <button
      type="button"
      disabled={isFull}
      onClick={() => toggle(trimId)}
      title={isFull ? `Уже выбрано ${MAX_COMPARE} комплектации — уберите одну` : 'Добавить к сравнению'}
      className={`flex min-h-[38px] items-center justify-center gap-1.5 rounded-[8px] border px-2.5 text-[11.5px] font-bold transition-colors ${
        isFull
          ? 'cursor-not-allowed border-[#363B43] bg-[#23272D] text-[#A9AFB7]/50'
          : 'border-[#363B43] bg-[#23272D] text-[#A9AFB7] hover:border-[#E4002B]/60 hover:text-[#F3F4F4]'
      }`}
    >
      <CompareIcon className="h-4 w-4" /> {label}
    </button>
  )
}
