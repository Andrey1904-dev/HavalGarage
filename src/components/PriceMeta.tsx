import type { Trim } from '../data/haval'
import { CATALOG_FIXED_AT } from '../data/haval'
import { fmtDate } from '../utils/format'

/**
 * Прозрачная мета-информация о цене: источник, дата действия, дата фиксации.
 * Если актуальность не подтверждена — предупреждаем, но не подменяем данные.
 */
export default function PriceMeta({ trim, compact = false }: { trim: Trim; compact?: boolean }) {
  const stale = trim.status === 'archive' || !trim.priceValidFrom
  return (
    <p className={`text-[10.5px] leading-relaxed text-[#A9AFB7] ${compact ? 'line-clamp-2' : ''}`}>
      Источник:{' '}
      <a href={trim.priceSourceUrl} target="_blank" rel="noreferrer" className="underline decoration-[#363B43] underline-offset-2 hover:text-[#F3F4F4]">
        agat-ekb-haval.ru
      </a>
      {trim.priceValidFrom ? ` · действует с ${fmtDate(trim.priceValidFrom)}` : ' · дата начала действия не опубликована'}
      {` · данные зафиксированы ${fmtDate(CATALOG_FIXED_AT)}`}
      {stale && <span className="text-[#F5A623]"> · актуальность подтвердите у дилера</span>}
    </p>
  )
}
