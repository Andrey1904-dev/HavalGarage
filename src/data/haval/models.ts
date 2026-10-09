import type { HavalModel } from './types'

/**
 * Модели, представленные в каталоге официального дилера АГАТ (Екатеринбург):
 * https://agat-ekb-haval.ru/models/ и https://agat-ekb-haval.ru/purchase/catalogues/
 *
 * HAVAL CITY: M6, JOLION, DARGO, DARGO X, F7, F7X; пикапы GWM POER / POER KINGKONG.
 * HAVAL PRO: H3, H5, H9, H7 («скоро в продаже» по данным страницы каталогов).
 *
 * Дата фиксации каталога: 2026-10-09 (по опубликованным страницам дилера).
 */
export const MODELS: HavalModel[] = [
  {
    id: 'm6',
    slug: 'm6',
    name: 'HAVAL M6',
    description:
      'Обновлённый городской кроссовер, «создан из преимуществ»: просторный салон, энергоемкая подвеска и доступные комплектации. Локализованное производство полного цикла в России. Участник государственной программы льготного автокредитования.',
    image: '/images/models/m6.webp',
    family: 'CITY',
    bodyType: 'Кроссовер',
    sourceUrl: 'https://agat-ekb-haval.ru/models/haval-m6/',
    availability: 'on-sale',
  },
  {
    id: 'jolion',
    slug: 'jolion',
    name: 'HAVAL JOLION',
    description:
      '«Надёжная поддержка на любом пути» — обновлённый компактный кроссовер с турбомотором 1.5T, новым интерьером и голосовым помощником. Четыре комплектации: Comfort, Elite, Premium, Tech Plus.',
    image: '/images/models/jolion.jpg',
    family: 'CITY',
    bodyType: 'Кроссовер',
    sourceUrl: 'https://agat-ekb-haval.ru/models/haval-jolion/',
    availability: 'on-sale',
  },
  {
    id: 'dargo',
    slug: 'dargo',
    name: 'HAVAL DARGO',
    description:
      '«Повод проявить характер»: свой на городских улицах, безупречен на трассе, уверен на бездорожье. Мотор 2.0T (192 л.с.), роботизированная коробка, передний или полный привод.',
    image: '/images/models/dargo.jpg',
    family: 'CITY',
    bodyType: 'Кроссовер',
    sourceUrl: 'https://agat-ekb-haval.ru/models/new-haval-dargo/',
    availability: 'on-sale',
  },
  {
    id: 'dargo-x',
    slug: 'dargo-x',
    name: 'HAVAL DARGO X',
    description:
      'Специальная внедорожная версия на базе HAVAL DARGO: защитный обвес, чёрная решётка радиатора, расширители арок и подготовка к бездорожью.',
    image: '/images/models/dargo-x.png',
    family: 'CITY',
    bodyType: 'Кроссовер',
    sourceUrl: 'https://agat-ekb-haval.ru/models/new-haval-dargo/',
    availability: 'on-sale',
  },
  {
    id: 'f7',
    slug: 'f7',
    name: 'HAVAL F7',
    description:
      'Обновлённый интеллектуальный кроссовер второго поколения: строгий технологичный дизайн, моторы 1.5T (150 л.с.) и 2.0T (192 л.с.), полный привод и продвинутые ассистенты водителя.',
    image: '/images/models/f7.webp',
    family: 'CITY',
    bodyType: 'Кроссовер',
    sourceUrl: 'https://agat-ekb-haval.ru/models/haval-f7/',
    availability: 'on-sale',
  },
  {
    id: 'f7x',
    slug: 'f7x',
    name: 'HAVAL F7X',
    description:
      'Купе-кроссовер на базе нового F7: динамика, стиль и технологии — скошенная линия крыши и спортивный характер. Версия Премиум с мотором 2.0 и полным приводом.',
    image: '/images/models/f7x.jpg',
    family: 'CITY',
    bodyType: 'Купе-кроссовер',
    sourceUrl: 'https://agat-ekb-haval.ru/models/haval-f7x/',
    availability: 'on-sale',
  },
  {
    id: 'poer',
    slug: 'poer',
    name: 'GWM POER',
    description:
      'Флагманский пикап концерна GWM: рамная конструкция, полный привод, бензиновые турбомоторы. Версии Комфорт и Оптимум с механической и автоматической трансмиссиями.',
    image: '/images/models/poer.webp',
    family: 'PICKUP',
    bodyType: 'Пикап',
    sourceUrl: 'https://agat-ekb-haval.ru/models/poer/',
    availability: 'on-sale',
  },
  {
    id: 'poer-kingkong',
    slug: 'poer-kingkong',
    name: 'GWM POER KINGKONG',
    description:
      'Утилитарный пикап для работы и бездорожья: усиленная рама, надёжные агрегаты и практичная грузовая платформа.',
    image: '/images/models/poer-kingkong.webp',
    family: 'PICKUP',
    bodyType: 'Пикап',
    sourceUrl: 'https://agat-ekb-haval.ru/models/poer-king-kong/',
    availability: 'on-sale',
  },
  {
    id: 'h3',
    slug: 'h3',
    name: 'HAVAL H3',
    description:
      'Самый доступный кроссовер линейки HAVAL PRO: брутальный дизайн, полный привод в старших комплектациях. Цены — по прайс-листам 2024–2025 г.в. на странице каталогов дилера.',
    image: '/images/models/h3.jpg',
    family: 'PRO',
    bodyType: 'Кроссовер',
    sourceUrl: 'https://agat-ekb-haval.ru/purchase/catalogues/',
    availability: 'on-sale',
  },
  {
    id: 'h5',
    slug: 'h5',
    name: 'HAVAL H5',
    description:
      'Новый рамный внедорожник HAVAL PRO, доступен для заказа. Цена — по прайс-листу 2024 г.в. на странице каталогов дилера.',
    image: '/images/models/h5.jpg',
    family: 'PRO',
    bodyType: 'Внедорожник',
    sourceUrl: 'https://agat-ekb-haval.ru/purchase/catalogues/',
    availability: 'on-sale',
  },
  {
    id: 'h9',
    slug: 'h9',
    name: 'HAVAL H9',
    description:
      'Флагманский рамный внедорожник второго поколения: три ряда сидений, дизель и бензин, серьёзная внедорожная подготовка. Цена — по прайс-листу 2024 г.в. на странице каталогов дилера.',
    image: '/images/models/h9.webp',
    family: 'PRO',
    bodyType: 'Внедорожник',
    sourceUrl: 'https://agat-ekb-haval.ru/models/haval-h9-new/',
    availability: 'on-sale',
  },
  {
    id: 'h7',
    slug: 'h7',
    name: 'HAVAL H7',
    description:
      'Новый среднеразмерный кроссовер HAVAL PRO. По данным страницы «Каталоги и прайс-листы» дилера — «скоро в продаже», цена не опубликована.',
    image: '/images/models/h7.jpg',
    family: 'PRO',
    bodyType: 'Кроссовер',
    sourceUrl: 'https://agat-ekb-haval.ru/purchase/catalogues/',
    availability: 'coming-soon',
  },
]

export const getModel = (id: string): HavalModel | undefined =>
  MODELS.find((m) => m.id === id || m.slug === id)
