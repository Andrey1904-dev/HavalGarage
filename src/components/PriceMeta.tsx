import type { Trim } from '../data/haval'
import { CATALOG_FIXED_AT } from '../data/haval'
import { fmtDate } from '../utils/format'

/**
 * Прозрачная мета-информация о цене: источник, дата действия, дата фиксации.
 * Если актуальность не подтверждена — предупреждаем, но не подменяем данные.
 */
export default function PriceMeta({ trim, compact = false }: { trim: Trim; compact?: boolean }) {
  const stale = trim.status === 'archive' || !trim.priceValidFrom
  const sourceLabel = trim.priceSourceUrl.includes('cdn.perxis.ru')
    ? 'официальный прайс-лист (каталоги haval.ru)'
    : trim.priceSourceUrl.includes('agat-ekb-haval.ru')
      ? 'agat-ekb-haval.ru'
      : 'каталог наличия ГК АГАТ'
  return (
    <p className={`text-[11px] leading-relaxed text-[#A2A7AF] ${compact ? 'line-clamp-2' : ''}`}>
      Источник:{' '}
      <a href={trim.priceSourceUrl} target="_blank" rel="noreferrer" className="underline decoration-[#2B3037] underline-offset-2 hover:text-[#F4F5F6]">
        {sourceLabel}
      </a>
      {trim.priceValidFrom ? ` · действует с ${fmtDate(trim.priceValidFrom)}` : ' · дата начала действия не опубликована'}
      {` · данные зафиксированы ${fmtDate(CATALOG_FIXED_AT)}`}
      {stale && <span className="text-[#F59E0B]"> · актуальность подтвердите у дилера</span>}
    </p>
  )
}
