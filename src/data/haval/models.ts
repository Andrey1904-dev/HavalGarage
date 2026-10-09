import type { HavalModel } from './types'

/**
 * Модели, представленные в каталоге официального дилера АГАТ (Екатеринбург):
 * https://agat-ekb-haval.ru/models/
 *
 * Цены и комплектации — по официальным прайс-листам со страницы каталогов
 * производителя: https://haval.ru/purchase/catalogues/ (PDF, поле priceListUrl).
 *
 * HAVAL CITY: M6, JOLION, DARGO, DARGO X, F7, F7X; пикапы GWM POER / POER KINGKONG.
 * HAVAL PRO: H3, H5, H9, H7 (подтверждены прайс-листами 2026 модельного года).
 *
 * Дата фиксации каталога: 2026-10-09.
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
    priceListUrl: 'https://cdn.perxis.ru/originals/da1hsh8beucc73999j3g/original',
    availability: 'on-sale',
  },
  {
    id: 'jolion',
    slug: 'jolion',
    name: 'HAVAL JOLION',
    description:
      '«Надёжная поддержка на любом пути» — обновлённый компактный кроссовер с турбомотором 1.5T, новым интерьером и голосовым помощником. Комплектации Комфорт, Оптимум, Премиум и Техно+ с передним или полным приводом.',
    image: '/images/models/jolion.jpg',
    family: 'CITY',
    bodyType: 'Кроссовер',
    sourceUrl: 'https://agat-ekb-haval.ru/models/haval-jolion/',
    priceListUrl: 'https://cdn.perxis.ru/originals/da1hsmobeucc73999j40/original',
    availability: 'on-sale',
  },
  {
    id: 'dargo',
    slug: 'dargo',
    name: 'HAVAL DARGO',
    description:
      '«Повод проявить характер»: свой на городских улицах, безупречен на трассе, уверен на бездорожье. Мотор 2.0T, роботизированная коробка, передний или полный привод. В продаже автомобили 2025 и 2026 модельных годов.',
    image: '/images/models/dargo.jpg',
    family: 'CITY',
    bodyType: 'Кроссовер',
    sourceUrl: 'https://agat-ekb-haval.ru/models/new-haval-dargo/',
    priceListUrl: 'https://cdn.perxis.ru/originals/d9karpgbeucc73ea48h0/original',
    availability: 'on-sale',
  },
  {
    id: 'dargo-x',
    slug: 'dargo-x',
    name: 'HAVAL DARGO X',
    description:
      'Специальная внедорожная версия на базе HAVAL DARGO: защитный обвес, чёрная решётка радиатора, расширители арок и подготовка к бездорожью. Полный привод в обеих комплектациях.',
    image: '/images/models/dargo-x.png',
    family: 'CITY',
    bodyType: 'Кроссовер',
    sourceUrl: 'https://agat-ekb-haval.ru/models/new-haval-dargo/',
    priceListUrl: 'https://cdn.perxis.ru/originals/d9karpgbeucc73ea48h0/original',
    availability: 'on-sale',
  },
  {
    id: 'f7',
    slug: 'f7',
    name: 'HAVAL F7',
    description:
      'Обновлённый интеллектуальный кроссовер второго поколения: строгий технологичный дизайн, моторы 1.5T (150 л.с.) и 2.0T, полный привод и продвинутые ассистенты водителя. В продаже автомобили 2024 и 2026 модельных годов.',
    image: '/images/models/f7.webp',
    family: 'CITY',
    bodyType: 'Кроссовер',
    sourceUrl: 'https://agat-ekb-haval.ru/models/haval-f7/',
    priceListUrl: 'https://cdn.perxis.ru/originals/d9tibrgbeucc73998fmg/original',
    availability: 'on-sale',
  },
  {
    id: 'f7x',
    slug: 'f7x',
    name: 'HAVAL F7X',
    description:
      'Купе-кроссовер на базе нового F7: динамика, стиль и технологии — скошенная линия крыши и спортивный характер. Мотор 2.0T и полный привод в обеих комплектациях.',
    image: '/images/models/f7x.jpg',
    family: 'CITY',
    bodyType: 'Купе-кроссовер',
    sourceUrl: 'https://agat-ekb-haval.ru/models/haval-f7x/',
    priceListUrl: 'https://cdn.perxis.ru/originals/d9tic0gbeucc73998fn0/original',
    availability: 'on-sale',
  },
  {
    id: 'poer',
    slug: 'poer',
    name: 'GWM POER',
    description:
      'Флагманский пикап концерна GWM: рамная конструкция, полный привод, бензиновые и дизельные турбомоторы. Комплектации Комфорт, Оптимум и Премиум с механической и автоматической трансмиссиями.',
    image: '/images/models/poer.webp',
    family: 'PICKUP',
    bodyType: 'Пикап',
    sourceUrl: 'https://agat-ekb-haval.ru/models/poer/',
    priceListUrl: 'https://cdn.perxis.ru/originals/d8sj6j0beucc73cetqe0/original',
    availability: 'on-sale',
  },
  {
    id: 'poer-kingkong',
    slug: 'poer-kingkong',
    name: 'GWM POER KINGKONG',
    description:
      'Утилитарный пикап для работы и бездорожья: усиленная рама, надёжные агрегаты и практичная грузовая платформа. Официальный прайс-лист на haval.ru не опубликован — цена по тизеру дилера.',
    image: '/images/models/poer-kingkong.webp',
    family: 'PICKUP',
    bodyType: 'Пикап',
    sourceUrl: 'https://agat-ekb-haval.ru/models/poer-king-kong/',
    priceListUrl: null,
    availability: 'on-sale',
  },
  {
    id: 'h3',
    slug: 'h3',
    name: 'HAVAL H3',
    description:
      'Самый доступный кроссовер линейки HAVAL PRO: брутальный дизайн, турбомотор 1.5T, полный привод в старших комплектациях. Цены — по официальному прайс-листу 2026 модельного года; заявлена выгода 200 000 ₽ по программе «Лояльный трейд-ин».',
    image: '/images/models/h3.jpg',
    family: 'PRO',
    bodyType: 'Кроссовер',
    sourceUrl: 'https://agat-ekb-haval.ru/purchase/catalogues/',
    priceListUrl: 'https://cdn.perxis.ru/originals/da1hstgbeucc73999j4g/original',
    availability: 'on-sale',
  },
  {
    id: 'h5',
    slug: 'h5',
    name: 'HAVAL H5',
    description:
      'Большой рамный внедорожник линейки HAVAL PRO: бензиновый турбомотор 2.0 (200 л.с.), 8-ступенчатый автомат, подключаемый полный привод, понижающая передача и блокировка заднего дифференциала. Цены — по официальному прайс-листу 2026 года производства.',
    image: '/images/models/h5.jpg',
    family: 'PRO',
    bodyType: 'Внедорожник',
    sourceUrl: 'https://agat-ekb-haval.ru/purchase/catalogues/',
    priceListUrl: 'https://cdn.perxis.ru/originals/d8t926obeucc73ceu05g/original',
    availability: 'on-sale',
  },
  {
    id: 'h9',
    slug: 'h9',
    name: 'HAVAL H9',
    description:
      'Флагманский рамный внедорожник второго поколения: семь мест, бензиновый турбомотор 2.0 (218 л.с.), 8-ступенчатый автомат, полный привод ToD, понижающая передача. Цены — по официальному прайс-листу 2026 модельного года.',
    image: '/images/models/h9.webp',
    family: 'PRO',
    bodyType: 'Внедорожник',
    sourceUrl: 'https://agat-ekb-haval.ru/models/haval-h9-new/',
    priceListUrl: 'https://cdn.perxis.ru/originals/d9opvr0beucc73ea6fug/original',
    availability: 'on-sale',
  },
  {
    id: 'h7',
    slug: 'h7',
    name: 'HAVAL H7',
    description:
      'Среднеразмерный кроссовер линейки HAVAL PRO: турбомотор 2.0 (231 л.с.), роботизированная коробка, подключаемый полный привод, богатое оснащение уже в базовой комплектации. Цены 2026 года производства подтверждены прайс-листом; заявлена выгода 200 000 ₽ по программе «Лояльный трейд-ин».',
    image: '/images/models/h7.jpg',
    family: 'PRO',
    bodyType: 'Кроссовер',
    sourceUrl: 'https://agat-ekb-haval.ru/purchase/catalogues/',
    priceListUrl: 'https://cdn.perxis.ru/originals/d9celk0beucc73e9v0g0/original',
    availability: 'on-sale',
  },
]

export const getModel = (id: string): HavalModel | undefined =>
  MODELS.find((m) => m.id === id || m.slug === id)
