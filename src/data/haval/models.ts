import type { HavalModel } from './types'

/**
 * Модельный ряд HAVAL по официальному каталогу производителя:
 * https://haval.ru/purchase/catalogues/ (проверено 2026-10-09).
 *
 * В официальном каталоге на дату проверки представлены 11 моделей:
 *  — городские кроссоверы и пикапы: M6, JOLION, DARGO, DARGO X, F7, F7x, GWM POER;
 *  — внедорожники линейки HAVAL PRO: H3, H5, H7, H9.
 *
 * GWM POER KINGKONG в официальном каталоге haval.ru отсутствует: цена модели
 * известна только из тизера дилера, поэтому комплектация помечена как
 * неподтверждённая (priceType 'teaser'), а модель — как вне официального каталога.
 *
 * officialImages — фотографии с официального CDN производителя (img.perxis.ru);
 * image — локальная копия в public/ как резервный вариант при недоступности CDN.
 */

const MODELS_PAGE = 'https://haval.ru/models/'
const CATALOGUES_PAGE = 'https://haval.ru/purchase/catalogues/'

export const MODELS: HavalModel[] = [
  {
    id: 'm6',
    slug: 'm6',
    name: 'HAVAL M6',
    description:
      'Обновлённый городской кроссовер, «создан из преимуществ»: просторный салон, вместительный багажник 808 л, энергоемкая подвеска и доступные комплектации. Локализованное производство полного цикла в России, адаптация к российским условиям и участие в государственной программе льготного автокредитования.',
    image: '/images/models/m6.webp',
    officialImages: [
      'https://img.perxis.ru/unsafe/prxs/originals/d71ul2gbeucc73ceec60/original',
      'https://img.perxis.ru/unsafe/prxs/originals/dakh250beucc7399giu0/original',
    ],
    family: 'CITY',
    bodyType: 'Кроссовер',
    officialUrl: 'https://haval.ru/models/haval-m6/',
    catalogueUrl: 'https://cdn.perxis.ru/originals/d8g3hg8beucc73ceqrg0/original',
    sourceUrl: 'https://agat-ekb-haval.ru/models/haval-m6/',
    priceListUrl: 'https://cdn.perxis.ru/originals/da1hsh8beucc73999j3g/original',
    availability: 'on-sale',
    highlights: [
      'Багажник 808 л (до 1700 л при сложенных сиденьях)',
      'Турбомотор 1.5T, 143 л.с., 202 Нм',
      'Расширенный пакет зимних опций',
      'Телематика GWM Connection и T-Box',
      'Участник госпрограммы льготного автокредитования',
    ],
  },
  {
    id: 'jolion',
    slug: 'jolion',
    name: 'HAVAL JOLION',
    description:
      '«Надёжная поддержка на любом пути» — обновлённый компактный кроссовер с турбомотором 1.5T (143 л.с. для 2WD и 150 л.с. для 4WD), новым интерьером и голосовым помощником. Комплектации Комфорт, Оптимум, Премиум и Техно + с передним или полным приводом.',
    image: '/images/models/jolion.jpg',
    officialImages: ['https://img.perxis.ru/unsafe/prxs/originals/d6tuvq0beucc73cedb9g/original'],
    family: 'CITY',
    bodyType: 'Кроссовер',
    officialUrl: MODELS_PAGE,
    catalogueUrl: 'https://cdn.perxis.ru/originals/d8fu078beucc73ceqpf0/original',
    sourceUrl: 'https://agat-ekb-haval.ru/models/haval-jolion/',
    priceListUrl: 'https://cdn.perxis.ru/originals/da1hsmobeucc73999j40/original',
    availability: 'on-sale',
    highlights: [
      'Шесть комплектаций: 2WD и 4WD',
      'Полный привод — независимая многорычажная подвеска и 270 Нм',
      'Багажник 337 л (до 1133 л)',
      'Панорамная крыша в комплектации Техно +',
      'Беспроводные Android Auto / Apple CarPlay',
    ],
  },
  {
    id: 'dargo',
    slug: 'dargo',
    name: 'HAVAL DARGO',
    description:
      '«Повод проявить характер»: свой на городских улицах, уверен на бездорожье. Мотор 2.0T (192 л.с. для 2025 м.г. и 200 л.с. для 2026 м.г.), роботизированная коробка, передний или подключаемый полный привод, клиренс 200 мм.',
    image: '/images/models/dargo.jpg',
    officialImages: ['https://img.perxis.ru/unsafe/prxs/originals/d7cdr78beucc73cegncg/original'],
    family: 'CITY',
    bodyType: 'Кроссовер',
    officialUrl: MODELS_PAGE,
    catalogueUrl: 'https://cdn.perxis.ru/originals/d915nm0beucc739q9mm0/original',
    sourceUrl: 'https://agat-ekb-haval.ru/models/new-haval-dargo/',
    priceListUrl: 'https://cdn.perxis.ru/originals/d9f0urobeucc73e9vlo0/original',
    availability: 'on-sale',
    highlights: [
      'Клиренс 200 мм, подключаемый полный привод',
      'Мультимедиа 14,6" с Яндекс Авто и GWM Connection',
      'Система кругового обзора 540°',
      'Внедорожные режимы движения',
      'Два модельных года в продаже: 2025 и 2026',
    ],
  },
  {
    id: 'dargo-x',
    slug: 'dargo-x',
    name: 'HAVAL DARGO X',
    description:
      'Специальная внедорожная версия на базе HAVAL DARGO: защитный обвес, чёрная решётка радиатора, расширители колёсных арок, рейлинги и зеркала в сером цвете. Полный привод в обеих комплектациях, двигатель 2.0T 192 л.с.',
    image: '/images/models/dargo-x.png',
    officialImages: ['https://img.perxis.ru/unsafe/prxs/originals/cuj0p18beucc7390q7lg/original'],
    family: 'CITY',
    bodyType: 'Кроссовер',
    officialUrl: MODELS_PAGE,
    catalogueUrl: 'https://cdn.perxis.ru/originals/d915nm0beucc739q9mm0/original',
    sourceUrl: 'https://agat-ekb-haval.ru/models/new-haval-dargo/',
    priceListUrl: 'https://cdn.perxis.ru/originals/d9karpgbeucc73ea48h0/original',
    availability: 'on-sale',
    highlights: [
      'Внедорожный обвес и расширители арок',
      'Полный привод в обеих комплектациях',
      'Клиренс 200 мм',
      'Цены опубликованы в общем прайс-листе DARGO 2025 м.г.',
    ],
  },
  {
    id: 'f7',
    slug: 'f7',
    name: 'HAVAL F7',
    description:
      'Обновлённый интеллектуальный кроссовер: строгий технологичный дизайн, выдвижные ручки дверей, моторы 1.5T (150 л.с.) и 2.0T (200 л.с.), полный привод и пакет ассистентов водителя в комплектации Техно +.',
    image: '/images/models/f7.webp',
    officialImages: ['https://img.perxis.ru/unsafe/prxs/originals/d7tkc60beucc73celt7g/original'],
    family: 'CITY',
    bodyType: 'Кроссовер',
    officialUrl: MODELS_PAGE,
    catalogueUrl: 'https://cdn.perxis.ru/originals/daf78bgbeucc7399fc50/original',
    sourceUrl: 'https://agat-ekb-haval.ru/models/haval-f7/',
    priceListUrl: 'https://cdn.perxis.ru/originals/d9tibrgbeucc73998fmg/original',
    availability: 'on-sale',
    highlights: [
      'Камера кругового обзора 540° во всех комплектациях',
      'Разгон 0–100 км/ч: 9,3 с (1.5T) / 8,7 с (2.0T)',
      'Багажник 376 л (до 1328 л)',
      'Полный пакет ассистентов в Техно +',
      'В продаже автомобили 2024 и 2026 модельных годов',
    ],
  },
  {
    id: 'f7x',
    slug: 'f7x',
    name: 'HAVAL F7X',
    description:
      'Купе-кроссовер на базе нового F7: скошенная линия крыши, пакет «Антихром», красные тормозные суппорты и два сдвоенных патрубка выхлопной системы. Мотор 2.0T (231 л.с. для 2026 м.г.) и полный привод в обеих комплектациях.',
    image: '/images/models/f7x.jpg',
    officialImages: ['https://img.perxis.ru/unsafe/prxs/originals/d7edkhgbeucc73cegv00/original'],
    family: 'CITY',
    bodyType: 'Купе-кроссовер',
    officialUrl: MODELS_PAGE,
    catalogueUrl: 'https://cdn.perxis.ru/originals/dackejobeucc7399cuv0/original',
    sourceUrl: 'https://agat-ekb-haval.ru/models/haval-f7x/',
    priceListUrl: 'https://cdn.perxis.ru/originals/d9tic0gbeucc73998fn0/original',
    availability: 'on-sale',
    highlights: [
      'Разгон 0–100 км/ч за 7,8 с (2026 м.г.)',
      'Пакет «Антихром» и красные суппорты',
      '19" диски, шины 235/55 R19',
      'Полный привод в обеих комплектациях',
    ],
  },
  {
    id: 'poer',
    slug: 'poer',
    name: 'GWM POER',
    description:
      'Флагманский рамный пикап концерна GWM: полный привод, понижающая передача, блокировка заднего дифференциала, бензиновые (218 л.с.) и дизельные (163 и 184 л.с.) турбомоторы, полезная нагрузка 975 кг.',
    image: '/images/models/poer.webp',
    officialImages: ['https://img.perxis.ru/unsafe/prxs/originals/d6tuku0beucc73cedb10/original'],
    family: 'PICKUP',
    bodyType: 'Пикап',
    officialUrl: MODELS_PAGE,
    catalogueUrl: 'https://cdn.perxis.ru/originals/d8sj2n0beucc73cetqag/original',
    sourceUrl: 'https://agat-ekb-haval.ru/models/poer/',
    priceListUrl: 'https://cdn.perxis.ru/originals/d8sj6j0beucc73cetqe0/original',
    availability: 'on-sale',
    highlights: [
      'Грузовая платформа 1520 × 1520 × 540 мм',
      'Полезная нагрузка 975 кг, прицеп до 2500 кг',
      'Дорожный просвет 227–232 мм, брод 500 мм',
      'Бензин и дизель, МКП и АКП',
    ],
  },
  {
    id: 'poer-kingkong',
    slug: 'poer-kingkong',
    name: 'GWM POER KINGKONG',
    description:
      'Утилитарный пикап для работы и бездорожья. В официальном каталоге haval.ru модель не представлена и прайс-лист не опубликован — цена известна только из тизера дилера, комплектация не раскрыта.',
    image: '/images/models/poer-kingkong.webp',
    officialImages: [],
    family: 'PICKUP',
    bodyType: 'Пикап',
    officialUrl: null,
    catalogueUrl: null,
    sourceUrl: 'https://agat-ekb-haval.ru/models/poer-king-kong/',
    priceListUrl: null,
    availability: 'on-sale',
    highlights: ['Официальный прайс-лист не опубликован — цена требует подтверждения у дилера'],
  },
  {
    id: 'h3',
    slug: 'h3',
    name: 'HAVAL H3',
    description:
      'Доступный кроссовер линейки HAVAL PRO: брутальный дизайн с внедорожным пакетом, турбомотор 1.5T (143 л.с. для 2WD и 177 л.с. для 4WD), панорамная крыша и цифровая панель приборов уже в базовой комплектации.',
    image: '/images/models/h3.jpg',
    officialImages: ['https://img.perxis.ru/unsafe/prxs/originals/d6tuupobeucc73cedb8g/original'],
    family: 'PRO',
    bodyType: 'Кроссовер',
    officialUrl: MODELS_PAGE,
    catalogueUrl: 'https://cdn.perxis.ru/originals/d8j90d8beucc73cerhgg/original',
    sourceUrl: 'https://haval.ru/purchase/catalogues/',
    priceListUrl: 'https://cdn.perxis.ru/originals/da1hstgbeucc73999j4g/original',
    availability: 'on-sale',
    highlights: [
      'Панорамная крыша и 18" диски во всех комплектациях',
      'Багажник 493 л (до 1298 л)',
      'Две версии мотора: 143 л.с. (2WD) и 177 л.с. (4WD)',
      'Заявлена выгода 200 000 ₽ по программе «Лояльный Трейд-ин»',
    ],
  },
  {
    id: 'h5',
    slug: 'h5',
    name: 'HAVAL H5',
    description:
      'Большой рамный внедорожник линейки HAVAL PRO: бензиновый турбомотор 2.0 (200 л.с., 380 Нм), 8-ступенчатый автомат, подключаемый полный привод Part-time, понижающая передача и блокировка заднего дифференциала.',
    image: '/images/models/h5.jpg',
    officialImages: ['https://img.perxis.ru/unsafe/prxs/originals/cuj0ns0beucc7390q7dg/original'],
    family: 'PRO',
    bodyType: 'Внедорожник',
    officialUrl: MODELS_PAGE,
    catalogueUrl: 'https://cdn.perxis.ru/originals/cs7oo8gbeucc73900030/original',
    sourceUrl: 'https://haval.ru/purchase/catalogues/',
    priceListUrl: 'https://cdn.perxis.ru/originals/d8t926obeucc73ceu05g/original',
    availability: 'on-sale',
    highlights: [
      'Колёсная база 3140 мм, длина 5190 мм',
      'Багажник до 2116 л в 2-местной конфигурации',
      'Прицеп до 2500 кг',
      'Камера кругового обзора 360°',
      'Понижающая передача и блокировка заднего дифференциала',
    ],
  },
  {
    id: 'h7',
    slug: 'h7',
    name: 'HAVAL H7',
    description:
      'Среднеразмерный кроссовер линейки HAVAL PRO: турбомотор 2.0 (231 л.с., 380 Нм), роботизированная коробка, подключаемый полный привод и полный пакет ассистентов водителя уже в базовой комплектации.',
    image: '/images/models/h7.jpg',
    officialImages: ['https://img.perxis.ru/unsafe/prxs/originals/d6tuu88beucc73cedb80/original'],
    family: 'PRO',
    bodyType: 'Кроссовер',
    officialUrl: MODELS_PAGE,
    catalogueUrl: 'https://cdn.perxis.ru/originals/d6bcsf0beucc73ce8i40/original',
    sourceUrl: 'https://haval.ru/purchase/catalogues/',
    priceListUrl: 'https://cdn.perxis.ru/originals/d9celk0beucc73e9v0g0/original',
    availability: 'on-sale',
    highlights: [
      'ACC, AEB, BSM, LDW+LKA+LCK, TSR — в базовой комплектации',
      'Мультимедиа 14,6" и цифровая панель 12,3"',
      'Вентиляция сидений и память сиденья водителя',
      'Внедорожные режимы и блокировка заднего дифференциала',
      'Заявлена выгода 200 000 ₽ по программе «Лояльный трейд-ин»',
    ],
  },
  {
    id: 'h9',
    slug: 'h9',
    name: 'HAVAL H9',
    description:
      'Флагманский рамный внедорожник второго поколения: семь мест, бензиновый турбомотор 2.0 (218 л.с., 380 Нм), 8-ступенчатый автомат, полный привод ToD, понижающая передача и блокировки дифференциалов.',
    image: '/images/models/h9.webp',
    officialImages: ['https://img.perxis.ru/unsafe/prxs/originals/d6tuv7gbeucc73cedb90/original'],
    family: 'PRO',
    bodyType: 'Внедорожник',
    officialUrl: MODELS_PAGE,
    catalogueUrl: 'https://cdn.perxis.ru/originals/d6t66cgbeucc73cectjg/original',
    sourceUrl: 'https://agat-ekb-haval.ru/models/haval-h9-new/',
    priceListUrl: 'https://cdn.perxis.ru/originals/d9opvr0beucc73ea6fug/original',
    availability: 'on-sale',
    highlights: [
      '7 мест, багажник до 1598 л',
      'Клиренс 224 мм, полный привод ToD',
      'Трёхзонный климат-контроль',
      'Камера 360° с функцией «прозрачного капота»',
      'Блокировка переднего дифференциала в Техно +',
    ],
  },
]

export const getModel = (idOrSlug: string): HavalModel | undefined =>
  MODELS.find((m) => m.id === idOrSlug || m.slug === idOrSlug)

/** Модели, представленные в официальном каталоге haval.ru (без дилерских тизеров) */
export const OFFICIAL_CATALOGUE_MODELS = MODELS.filter((m) => m.priceListUrl !== null)

export const HAVAL_MODELS_PAGE = MODELS_PAGE
export const HAVAL_CATALOGUES_PAGE = CATALOGUES_PAGE
