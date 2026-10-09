import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ModelCard from '../components/ModelCard'
import { Button, Callout, EmptyState, Field, SectionTitle, Select, Tag } from '../components/ui'
import { CarIcon, SearchIcon } from '../components/icons'
import {
  CATALOG_FIXED_AT,
  GENERATED_PRICES,
  HAVAL_PRICE_LISTS_URL,
  MODELS,
  getModel,
  hasGeneratedData,
  minCurrentPrice,
  trimsForModel,
  type ModelFamily,
} from '../data/haval'
import { fmtDate, fmtMoney } from '../utils/format'
import { useSeo } from '../utils/seo'
import { track } from '../utils/analytics'

type SortMode = 'price-asc' | 'price-desc' | 'name' | 'trims'

const FAMILY_LABELS: Record<ModelFamily | 'ALL', string> = {
  ALL: 'Все семейства',
  CITY: 'HAVAL CITY',
  PRO: 'HAVAL PRO',
  PICKUP: 'Пикапы GWM',
}

const BODY_TYPES = ['Все кузова', 'Кроссовер', 'Купе-кроссовер', 'Внедорожник', 'Пикап']
const DRIVETRAINS = [
  { value: 'any', label: 'Любой привод' },
  { value: 'fwd', label: 'Передний (2WD)' },
  { value: 'awd', label: 'Полный (4WD)' },
]

/**
 * Каталог всех моделей официального каталога haval.ru с фильтрами и сортировкой.
 * Фильтры живут в query-параметрах (ими можно поделиться), но отдельные
 * индексируемые страницы для каждой комбинации не создаются: canonical ведёт на /catalog.
 */
export default function CatalogPage() {
  const [params, setParams] = useSearchParams()
  const family = (params.get('family') ?? 'ALL') as ModelFamily | 'ALL'
  const body = params.get('body') ?? BODY_TYPES[0]
  const drivetrain = params.get('drive') ?? 'any'
  const query = params.get('q') ?? ''
  const sort = (params.get('sort') ?? 'price-asc') as SortMode
  const [showArchive, setShowArchive] = useState(false)

  useSeo({
    title: 'Каталог моделей HAVAL — цены и комплектации по официальным прайс-листам',
    description:
      'Все модели из официального каталога haval.ru: M6, JOLION, DARGO, DARGO X, F7, F7x, GWM POER, H3, H5, H7, H9. ' +
      'Цены и комплектации по прайс-листам производителя, характеристики и оснащение из тех же документов.',
    path: '/catalog',
    image: '/images/models/f7.webp',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Каталог моделей HAVAL',
      itemListElement: MODELS.filter((m) => m.priceListUrl !== null).map((m, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: m.name,
        url: `/models/${m.slug}`,
      })),
    },
  })

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value === null || value === '') next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = MODELS.filter((m) => {
      if (family !== 'ALL' && m.family !== family) return false
      if (body !== BODY_TYPES[0]) {
        const b = m.bodyType.toLowerCase()
        const want = body.toLowerCase()
        if (!b.includes(want) && !want.includes(b)) {
          if (!(want === 'кроссовер' && (b.includes('универсал') || b.includes('купе')))) return false
        }
      }
      if (drivetrain !== 'any') {
        const trims = trimsForModel(m.id)
        const has = trims.some((t) =>
          drivetrain === 'awd' ? /полн|4wd/i.test(t.drivetrain) : /передн|2wd/i.test(t.drivetrain),
        )
        if (!has) return false
      }
      if (q && !`${m.name} ${m.description} ${m.bodyType}`.toLowerCase().includes(q)) return false
      return true
    })

    const price = (id: string) => minCurrentPrice(id)?.basePrice ?? Number.POSITIVE_INFINITY
    switch (sort) {
      case 'price-desc':
        return [...list].sort((a, b) => price(b.id) - price(a.id))
      case 'name':
        return [...list].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
      case 'trims':
        return [...list].sort((a, b) => trimsForModel(b.id).length - trimsForModel(a.id).length)
      case 'price-asc':
      default:
        return [...list].sort((a, b) => price(a.id) - price(b.id))
    }
  }, [family, body, drivetrain, query, sort])

  const archiveCount = useMemo(
    () => MODELS.reduce((sum, m) => sum + trimsForModel(m.id, true).filter((t) => t.status === 'archive').length, 0),
    [],
  )

  return (
    <div className="animate-page-enter flex flex-col gap-2">
      <header className="flex flex-col gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#E4002B]">
          Официальный каталог haval.ru · проверка {fmtDate(CATALOG_FIXED_AT)}
        </p>
        <h1 className="font-display-num text-[26px] font-bold uppercase tracking-wide text-[#F3F4F4] sm:text-[32px]">
          Каталог моделей HAVAL
        </h1>
        <p className="max-w-2xl text-[12.5px] leading-relaxed text-[#A9AFB7]">
          Цены, комплектации, характеристики и оснащение — из официальных прайс-листов производителя
          (PDF «Максимальная цена перепродажи»). Выгода по трейд-ин и специальным программам хранится отдельно
          и не вычитается из базовой цены автоматически.
        </p>
      </header>

      {/* ---------------- Фильтры ---------------- */}
      <div className="rounded-[10px] border border-[#363B43]/85 bg-[#1A1D22] p-3.5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            label="Поиск по названию"
            placeholder="JOLION, H9, пикап…"
            value={query}
            onChange={(e) => setParam('q', e.target.value)}
          />
          <Select label="Семейство" value={family} onChange={(e) => setParam('family', e.target.value)}>
            {(Object.keys(FAMILY_LABELS) as Array<ModelFamily | 'ALL'>).map((key) => (
              <option key={key} value={key}>
                {FAMILY_LABELS[key]}
              </option>
            ))}
          </Select>
          <Select label="Тип кузова" value={body} onChange={(e) => setParam('body', e.target.value)}>
            {BODY_TYPES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
          <Select label="Привод" value={drivetrain} onChange={(e) => setParam('drive', e.target.value)}>
            {DRIVETRAINS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11.5px] font-semibold text-[#A9AFB7]">Сортировка:</span>
            {(
              [
                ['price-asc', 'по цене ↑'],
                ['price-desc', 'по цене ↓'],
                ['trims', 'по числу комплектаций'],
                ['name', 'по названию'],
              ] as Array<[SortMode, string]>
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setParam('sort', value === 'price-asc' ? null : value)
                  track('budget_sort', { section: 'catalog', sort: value })
                }}
                className={`min-h-[34px] rounded-[8px] border px-2.5 text-[11.5px] font-bold transition-colors ${
                  sort === value
                    ? 'border-[#E4002B] bg-[#E4002B]/12 text-[#F3F4F4]'
                    : 'border-[#363B43] bg-[#23272D] text-[#A9AFB7] hover:text-[#F3F4F4]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-[11.5px] text-[#A9AFB7]">
            Найдено моделей: <strong className="text-[#F3F4F4]">{filtered.length}</strong> из {MODELS.length}
          </p>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<CarIcon className="h-6 w-6" />}
          title="Ничего не найдено"
          text="По заданным фильтрам моделей нет. Сбросьте фильтры или измените запрос — в официальном каталоге 11 моделей."
          action={
            <Button type="button" variant="secondary" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
              Сбросить фильтры
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <ModelCard key={m.id} model={m} />
          ))}
        </div>
      )}

      {/* ---------------- Вне официального каталога ---------------- */}
      {MODELS.some((m) => m.priceListUrl === null) && (
        <>
          <SectionTitle tip="Модель отсутствует в официальном каталоге haval.ru: прайс-лист не опубликован, цена известна только из тизера дилера и требует подтверждения.">
            Требуют подтверждения
          </SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {MODELS.filter((m) => m.priceListUrl === null).map((m) => (
              <Callout key={m.id} tone="warn" title={m.name}>
                Официальный прайс-лист на haval.ru не опубликован. {m.description}{' '}
                <Link to={`/models/${m.slug}`} className="font-bold underline underline-offset-2">
                  Подробнее →
                </Link>
              </Callout>
            ))}
          </div>
        </>
      )}

      {/* ---------------- Архивные цены ---------------- */}
      {archiveCount > 0 && (
        <div className="mt-2 flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-[#363B43] bg-[#1A1D22] px-3.5 py-3">
            <p className="text-[12px] leading-relaxed text-[#A9AFB7]">
              Архивные цены прошлых лет производства ({archiveCount} позиций) скрыты по умолчанию, чтобы не смешивать
              модельные годы. Они видны на страницах моделей.
            </p>
            <Button type="button" variant="ghost" className="min-h-[38px]" onClick={() => setShowArchive((v) => !v)}>
              {showArchive ? 'Скрыть подсказку' : 'Как посмотреть'}
            </Button>
          </div>
          {showArchive && (
            <Callout tone="info">
              Откройте страницу модели — в блоке «Комплектации и цены» есть переключатель «Показать архивные цены».
              Архивные позиции помечены бейджем «архив» и не участвуют в подборе по бюджету.
            </Callout>
          )}
        </div>
      )}

      {/* ---------------- Автоматически собранные данные ---------------- */}
      {hasGeneratedData && (
        <>
          <SectionTitle tip="Данные собраны скриптом обновления (npm run update:prices) или импортом прайс-листа. Они не подменяют подтверждённые цены каталога и показываются отдельно.">
            Собрано автоматически
          </SectionTitle>
          <div className="rounded-[10px] border border-[#363B43] bg-[#1A1D22] p-4">
            <p className="mb-2 text-[11px] text-[#A9AFB7]">
              Источник: {GENERATED_PRICES.source} · сбор {GENERATED_PRICES.fetchedAt}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {GENERATED_PRICES.teasers.map((t) => (
                <div key={`${t.slug}-${t.trimName ?? ''}`} className="rounded-[8px] border border-[#363B43] bg-[#0E1013]/70 px-2.5 py-2">
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#A9AFB7]">
                    {getModel(t.slug)?.name ?? t.slug}
                  </p>
                  <p className="font-display-num mt-0.5 text-[15px] font-bold text-[#F3F4F4]">{fmtMoney(t.price)}</p>
                  {t.trimName && <p className="text-[10px] text-[#A9AFB7]">{t.trimName}</p>}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Tag tone="success">
          <SearchIcon className="h-3 w-3" /> источник цен — прайс-листы производителя
        </Tag>
        <a
          href={HAVAL_PRICE_LISTS_URL}
          target="_blank"
          rel="noreferrer"
          className="text-[11.5px] text-[#A9AFB7] underline decoration-[#363B43] underline-offset-2 transition-colors hover:text-[#F3F4F4]"
          onClick={() => track('official_source_click', { source: 'catalog', url: HAVAL_PRICE_LISTS_URL })}
        >
          Открыть каталоги и прайс-листы haval.ru
        </a>
      </div>
    </div>
  )
}
