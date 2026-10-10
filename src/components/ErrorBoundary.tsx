import { Component, type ErrorInfo, type ReactNode } from 'react'
import { assetUrl } from '../utils/seo'

/**
 * Граница ошибок приложения.
 *
 * Зачем нужна именно здесь: страницы загружаются лениво (React.lazy), а после
 * передеплоя на GitHub Pages хеши chunk-файлов меняются — у человека с открытой
 * вкладкой динамический импорт падает («Failed to fetch dynamically imported
 * module»). Без границы это белый экран; с ней — понятное сообщение и кнопка
 * перезагрузки, которая подтянет свежую сборку.
 */

const CHUNK_ERROR = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS|Loading chunk [\w-]+ failed/i

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Ошибка не скрывается: пишем её в консоль вместе со стеком компонента
    console.error('HavalGarage: ошибка рендера раздела', error, info.componentStack)
  }

  render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children

    const chunkFailure = CHUNK_ERROR.test(error.message ?? '')
    return (
      <div
        role="alert"
        className="mx-auto flex min-h-[60dvh] w-full max-w-lg flex-col items-center justify-center gap-4 px-4 py-10 text-center"
      >
        <p className="font-display text-[26px] font-bold uppercase tracking-wide text-[#F3F4F4]">
          {chunkFailure ? 'Вышла новая версия сайта' : 'Раздел не открылся'}
        </p>
        <p className="text-[13px] leading-relaxed text-[#A9AFB7]">
          {chunkFailure
            ? 'Файлы предыдущей версии больше недоступны. Обновите страницу — загрузится актуальная сборка, сохранённые расчёты и избранное останутся на месте.'
            : 'Что-то пошло не так при отображении страницы. Данные каталога не повреждены: попробуйте вернуться в каталог или обновить страницу. Если ошибка повторяется — сообщите нам, мы исправим.'}
        </p>
        <pre className="max-h-28 w-full overflow-auto rounded-[10px] border border-[#363B43] bg-[#14171B] p-3 text-left font-mono text-[11px] leading-relaxed text-[#A9AFB7]">
          {error.name}: {error.message}
        </pre>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              this.setState({ error: null })
              window.location.reload()
            }}
            className="min-h-[42px] rounded-[8px] bg-[#E4002B] px-5 text-[13px] font-bold text-white transition-opacity hover:opacity-90"
          >
            Обновить страницу
          </button>
          <a
            href={assetUrl('/')}
            className="min-h-[42px] rounded-[8px] border border-[#363B43] px-5 py-2.5 text-[13px] font-bold text-[#F3F4F4] transition-colors hover:border-[#A9AFB7]"
          >
            В каталог моделей
          </a>
        </div>
      </div>
    )
  }
}
