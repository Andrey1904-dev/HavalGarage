import { useMemo, useState } from 'react'
import { Button, Callout, Card, TableCell, Tag } from './ui'
import {
  CATALOG_CHANGES,
  CHANGE_KIND_LABELS,
  documentsNeedingReview,
  getModel,
  parsedDocuments,
  PARSING_STATUS_LABELS,
  priceHistoryStart,
  PRICE_HISTORY_POINTS,
  recentCatalogChanges,
  trimsWithPriceDynamics,
  type CatalogChangeKind,
} from '../data/haval'
import { fmtDate } from '../utils/format'
import { downloadCsv, downloadJson } from '../utils/export-data'
import { track } from '../utils/analytics'

/**
 * Мониторинг изменений официального каталога.
 *
 * Показывает то, что зафиксировал пайплайн: новые модели и комплектации,
 * изменение цен, новые версии прайс-листов, завершившиеся предложения.
 * Журнал — констатация факта со ссылкой на документ; подтверждённые цены
 * каталога автоматически не перезаписываются.
 */
export default function ChangesPanel() {
  const [filter, setFilter] = useState<CatalogChangeKind | 'all'>('all')
  const changes = useMemo(() => recentCatalogChanges(), [])
  const shown = useMemo(
    () => (filter === 'all' ? changes : changes.filter((c) => c.kind === filter)),
    [changes, filter],
  )
  const kinds = useMemo(() => [...new Set(changes.map((c) => c.kind))], [changes])
  const reviewDocs = documentsNeedingReview()
  const parsed = parsedDocuments()
  const dynamics = trimsWithPriceDynamics()

  const exportJson = () => {
    downloadJson('haval-catalog-changes.json', {
      exportedAt: new Date().toISOString(),
      events: changes,
      documentsNeedingReview: reviewDocs,
      priceHistoryPoints: PRICE_HISTORY_POINTS,
      historyStart: priceHistoryStart(),
    })
    track('export_csv', { section: 'changes', format: 'json' })
  }

  const exportCsv = () => {
    downloadCsv(
      'haval-catalog-changes.csv',
      ['Дата', 'Тип', 'Модель', 'Комплектация', 'Описание', 'Было', 'Стало', 'Источник'],
      changes.map((c) => [
        c.detectedAt,
        CHANGE_KIND_LABELS[c.kind] ?? c.kind,
        c.modelId ? (getModel(c.modelId)?.name ?? c.modelId) : '',
        c.trimId ?? '',
        c.summary,
        c.previousValue ?? '',
        c.newValue ?? '',
        c.sourceUrl ?? '',
      ]),
    )
    track('export_csv', { section: 'changes', format: 'csv' })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Card className="p-3">
          <p className="text-[10px] uppercase tracking-wider text-[#A9AFB7]">Событий в журнале</p>
          <p className="font-display-num mt-0.5 text-[19px] font-bold text-[#F3F4F4]">{CATALOG_CHANGES.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase tracking-wider text-[#A9AFB7]">Документов требует проверки</p>
          <p className="font-display-num mt-0.5 text-[19px] font-bold text-[#F5A623]">{reviewDocs.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase tracking-wider text-[#A9AFB7]">Разобрано автоматически</p>
          <p className="font-display-num mt-0.5 text-[19px] font-bold text-[#16B374]">{parsed.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase tracking-wider text-[#A9AFB7]">Комплектаций с динамикой цен</p>
          <p className="font-display-num mt-0.5 text-[19px] font-bold text-[#F3F4F4]">{dynamics.length}</p>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          aria-pressed={filter === 'all'}
          className={`min-h-[34px] rounded-[8px] border px-2.5 text-[11.5px] font-bold transition-colors ${
            filter === 'all'
              ? 'border-[#E4002B] bg-[#E4002B]/12 text-[#F3F4F4]'
              : 'border-[#363B43] bg-[#23272D] text-[#A9AFB7] hover:text-[#F3F4F4]'
          }`}
        >
          все ({changes.length})
        </button>
        {kinds.map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => setFilter(kind)}
            aria-pressed={filter === kind}
            className={`min-h-[34px] rounded-[8px] border px-2.5 text-[11.5px] font-bold transition-colors ${
              filter === kind
                ? 'border-[#E4002B] bg-[#E4002B]/12 text-[#F3F4F4]'
                : 'border-[#363B43] bg-[#23272D] text-[#A9AFB7] hover:text-[#F3F4F4]'
            }`}
          >
            {CHANGE_KIND_LABELS[kind] ?? kind} ({changes.filter((c) => c.kind === kind).length})
          </button>
        ))}
        <span className="ml-auto flex items-center gap-2">
          <Button type="button" variant="ghost" className="min-h-[34px]" onClick={exportCsv} disabled={changes.length === 0}>
            CSV
          </Button>
          <Button type="button" variant="ghost" className="min-h-[34px]" onClick={exportJson} disabled={changes.length === 0}>
            JSON
          </Button>
        </span>
      </div>

      {shown.length === 0 ? (
        <Callout tone="info" title="Изменений не зафиксировано">
          С момента предыдущей проверки официальный каталог не изменился: ни новых моделей и комплектаций, ни
          изменений цен, ни новых версий прайс-листов. Проверка выполняется командой{' '}
          <code className="text-[#F3F4F4]">npm run catalog -- full</code> и еженедельно в GitHub Actions.
        </Callout>
      ) : (
        <div className="overflow-x-auto rounded-[10px] border border-[#363B43]/70">
          <table className="w-full min-w-[620px] border-collapse text-left text-[11.5px]">
            <thead>
              <tr className="bg-[#1A1D22] text-[10px] uppercase tracking-wider text-[#A9AFB7]">
                <th className="px-3 py-2 font-semibold">Дата</th>
                <th className="px-3 py-2 font-semibold">Тип</th>
                <th className="px-3 py-2 font-semibold">Описание</th>
                <th className="px-3 py-2 font-semibold">Было → стало</th>
                <th className="px-3 py-2 font-semibold">Источник</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.id} className="border-t border-[#363B43]/50">
                  <TableCell>{fmtDate(c.detectedAt)}</TableCell>
                  <TableCell>
                    <Tag tone={c.kind === 'price-changed' ? 'warn' : c.kind === 'new-model' ? 'success' : 'default'}>
                      {CHANGE_KIND_LABELS[c.kind] ?? c.kind}
                    </Tag>
                  </TableCell>
                  <TableCell>{c.summary}</TableCell>
                  <TableCell>
                    {c.previousValue || c.newValue ? (
                      <span className="font-display-num">
                        {c.previousValue ?? '—'} → {c.newValue ?? '—'}
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    {c.sourceUrl ? (
                      <a
                        href={c.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline decoration-[#363B43] underline-offset-2 hover:text-[#F3F4F4]"
                      >
                        документ
                      </a>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {reviewDocs.length > 0 && (
        <Card className="flex flex-col gap-2 p-3.5">
          <p className="text-[12.5px] font-bold text-[#F3F4F4]">Документы, требующие ручной проверки</p>
          <p className="text-[11.5px] leading-relaxed text-[#A9AFB7]">
            Пайплайн не смог разобрать эти документы полностью — данные из них в каталог не попадали, чтобы не
            подменять подтверждённые цены неполным результатом.
          </p>
          <ul className="flex flex-col gap-1.5">
            {reviewDocs.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2 text-[11.5px]">
                <Tag tone="warn">{PARSING_STATUS_LABELS[d.parsingStatus]}</Tag>
                <span className="font-bold text-[#F3F4F4]">{d.modelId ? (getModel(d.modelId)?.name ?? d.modelId) : '—'}</span>
                <span className="text-[#A9AFB7]">{d.label ?? d.documentType}</span>
                {d.notes && <span className="text-[#A9AFB7]">· {d.notes}</span>}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
