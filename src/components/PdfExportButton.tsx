import { useState } from 'react'
import { Button } from './ui'
import { exportReportPdf, pdfFileName } from '../utils/pdf-export'
import type { ReportOptions } from '../utils/export'
import { track } from '../utils/analytics'

/**
 * Кнопка выгрузки расчёта в PDF.
 *
 * Генератор PDF загружается лениво при нажатии: основной бандл не тяжелеет.
 * Если сформировать файл не удалось (например, браузер запретил загрузку),
 * пользователь видит честное сообщение и может воспользоваться печатью —
 * молчаливо «ничего не происходит» кнопка не делает.
 */
export default function PdfExportButton({
  getOptions,
  filename,
  label = 'PDF',
}: {
  /** Отчёт строится в момент нажатия — те же данные, что уходят в печать */
  getOptions: () => ReportOptions | null
  /** Префикс имени файла (без даты и расширения) */
  filename: string
  label?: string
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')

  const onClick = async () => {
    const options = getOptions()
    if (!options) return
    setState('loading')
    const ok = await exportReportPdf(options, pdfFileName(filename))
    setState(ok ? 'idle' : 'error')
    track('export_print', { section: 'pdf', ok })
  }

  return (
    <span className="inline-flex flex-col">
      <Button
        type="button"
        variant="ghost"
        className="min-h-[38px]"
        onClick={onClick}
        disabled={state === 'loading'}
        aria-busy={state === 'loading'}
      >
        {state === 'loading' ? 'Готовим PDF…' : label}
      </Button>
      {state === 'error' && (
        <span role="alert" className="mt-1 text-[10.5px] text-[#F5A623]">
          Не удалось сформировать файл — воспользуйтесь печатью
        </span>
      )}
    </span>
  )
}
