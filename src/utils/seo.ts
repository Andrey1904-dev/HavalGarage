/**
 * SEO-слой одностраничного приложения: уникальные заголовки и описания
 * страниц, канонические URL, Open Graph и структурированные данные (JSON-LD).
 *
 * Приложение не выдаёт себя за официальный сайт HAVAL: в описание каждой
 * страницы добавляется пометка о независимом характере сервиса.
 */
import { useEffect } from 'react'

/** Базовый путь приложения ('/' в dev, '/HavalGarage/' в сборке для GitHub Pages) */
export function appBase(): string {
  const env = (import.meta as unknown as { env?: { BASE_URL?: string } }).env
  const base = env?.BASE_URL ?? '/'
  return base.endsWith('/') ? base.slice(0, -1) : base
}

/** Публичный адрес сайта (для канонических ссылок и sitemap) */
export function siteOrigin(): string {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env
  const configured = env?.VITE_SITE_URL
  if (configured) return configured.replace(/\/$/, '')
  return 'https://andrey1904-dev.github.io'
}

/**
 * URL статического ресурса с учётом base-пути ('/' в dev, '/HavalGarage/' в сборке).
 * Без него глубокие маршруты (/models/m6) ломали бы относительные пути.
 */
export function assetUrl(path: string): string {
  if (!path) return path
  if (/^(https?:|data:|blob:)/.test(path)) return path
  const base = appBase()
  const clean = path.startsWith('/') ? path : `/${path}`
  return `${base}${clean}`
}

/** Абсолютный URL страницы приложения */
export function absoluteUrl(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`
  return `${siteOrigin()}${appBase()}${clean}`
}

export interface SeoMeta {
  title: string
  description: string
  /** Относительный путь страницы (например, /models/m6) */
  path: string
  image?: string | null
  /** Не индексировать страницу (фильтры, служебные экраны) */
  noindex?: boolean
  /** Структурированные данные schema.org */
  jsonLd?: Record<string, unknown> | null
}

const INDEPENDENT_NOTE = 'Независимый информационный сервис, не официальный сайт HAVAL.'

function ensureMeta(selector: string, create: () => HTMLElement): HTMLElement {
  if (typeof document === 'undefined') return create()
  let el = document.head.querySelector(selector) as HTMLElement | null
  if (!el) {
    el = create()
    document.head.appendChild(el)
  }
  return el
}

function setMeta(attr: 'name' | 'property', key: string, content: string): void {
  const el = ensureMeta(`meta[${attr}="${key}"]`, () => {
    const m = document.createElement('meta')
    m.setAttribute(attr, key)
    return m
  })
  el.setAttribute('content', content)
}

function setLink(rel: string, href: string): void {
  const el = ensureMeta(`link[rel="${rel}"]`, () => {
    const l = document.createElement('link')
    l.setAttribute('rel', rel)
    return l
  })
  el.setAttribute('href', href)
}

/** Применить метаданные страницы (безопасно при SSR и в smoke-тестах) */
export function applySeo(meta: SeoMeta): void {
  if (typeof document === 'undefined') return

  const description = meta.description.includes('Независим')
    ? meta.description
    : `${meta.description} ${INDEPENDENT_NOTE}`
  const url = absoluteUrl(meta.path)

  document.title = meta.title
  setMeta('name', 'description', description)
  setMeta('name', 'robots', meta.noindex ? 'noindex, nofollow' : 'index, follow')
  setLink('canonical', url)

  setMeta('property', 'og:type', 'website')
  setMeta('property', 'og:site_name', 'HAVAL Гараж')
  setMeta('property', 'og:locale', 'ru_RU')
  setMeta('property', 'og:title', meta.title)
  setMeta('property', 'og:description', description)
  setMeta('property', 'og:url', url)
  if (meta.image) {
    const image = meta.image.startsWith('http') ? meta.image : absoluteUrl(meta.image)
    setMeta('property', 'og:image', image)
    setMeta('name', 'twitter:card', 'summary_large_image')
    setMeta('name', 'twitter:image', image)
  }
  setMeta('name', 'twitter:title', meta.title)
  setMeta('name', 'twitter:description', description)

  const id = 'seo-jsonld'
  const existing = document.getElementById(id)
  if (existing) existing.remove()
  if (meta.jsonLd) {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = id
    script.textContent = JSON.stringify(meta.jsonLd)
    document.head.appendChild(script)
  }
}

/**
 * Хук: применить метаданные при смене страницы.
 *
 * Зависимости — отдельные поля, а не объект meta: страницы передают новый
 * объект на каждый рендер, и зависимость от него вызывала бы лишние записи
 * в DOM на каждое обновление состояния.
 */
export function useSeo(meta: SeoMeta): void {
  const { title, description, path, image, noindex, jsonLd } = meta
  const jsonLdKey = JSON.stringify(jsonLd ?? null)
  useEffect(() => {
    applySeo({ title, description, path, image, noindex, jsonLd: jsonLd ? JSON.parse(jsonLdKey) : null })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- jsonLdKey — стабильное представление jsonLd
  }, [title, description, path, image, noindex, jsonLdKey])
}

/** Структурированные данные CarModel + Offer для страницы модели */
export function carJsonLd(params: {
  name: string
  description: string
  image: string | null
  url: string
  priceFrom: number | null
  priceCurrency?: string
  bodyType?: string
  brand?: string
}): Record<string, unknown> {
  const node: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Car',
    name: params.name,
    description: params.description,
    url: params.url,
    brand: { '@type': 'Brand', name: params.brand ?? 'HAVAL' },
  }
  if (params.image) node.image = params.image
  if (params.bodyType) node.bodyType = params.bodyType
  if (params.priceFrom !== null) {
    node.offers = {
      '@type': 'AggregateOffer',
      priceCurrency: params.priceCurrency ?? 'RUB',
      lowPrice: params.priceFrom,
      availability: 'https://schema.org/InStock',
      url: params.url,
      description:
        'Максимальная цена перепродажи по официальному прайс-листу. Не является публичной офертой.',
    }
  }
  return node
}
