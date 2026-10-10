import type { Generation } from './types'

/**
 * Поколения и модельные годы.
 *
 * Поколения разделены намеренно: объединение разных модификаций под похожими
 * названиями приводило бы к смешению цен и характеристик. Яркий пример —
 * DARGO 2025 м.г. (192 л.с.) и DARGO 2026 м.г. (200 л.с.): это разные
 * генерации одного семейства, и у каждой своя цена и свой прайс-лист.
 *
 * Поля productionStart / productionEnd заполняются только тогда, когда год
 * прямо указан в официальном документе. Код поколения (generationCode)
 * производителем не публикуется — в этих случаях стоит null, а не догадка.
 */
export const GENERATIONS: Generation[] = [
  {
    id: 'm6-2026',
    modelId: 'm6',
    name: 'HAVAL M6, 2026 модельный год',
    generationCode: null,
    productionStart: 2026,
    productionEnd: null,
    description: 'Обновлённый M6: бензиновый 1.5T 143 л.с., МКП-6 или робот 7DCT, передний привод.',
    sourceUrl: 'https://cdn.perxis.ru/originals/da1hsh8beucc73999j3g/original',
  },
  {
    id: 'jolion-2026',
    modelId: 'jolion',
    name: 'HAVAL JOLION, 2026 модельный год',
    generationCode: null,
    productionStart: 2026,
    productionEnd: null,
    description: 'JOLION 2026: 1.5T 143 л.с. (2WD) и 150 л.с. (4WD), МКП-6 или робот 7DCT.',
    sourceUrl: 'https://cdn.perxis.ru/originals/da1hsmobeucc73999j40/original',
  },
  {
    id: 'dargo-2025my',
    modelId: 'dargo',
    name: 'HAVAL DARGO, 2025 модельный год (2026 г.в.)',
    generationCode: null,
    productionStart: 2026,
    productionEnd: null,
    description: 'DARGO 2025 м.г.: бензиновый 2.0T 192 л.с., робот 7DCT, передний или полный привод.',
    sourceUrl: 'https://cdn.perxis.ru/originals/d9karpgbeucc73ea48h0/original',
  },
  {
    id: 'dargo-2026my',
    modelId: 'dargo',
    name: 'HAVAL DARGO, 2026 модельный год',
    generationCode: null,
    productionStart: 2026,
    productionEnd: null,
    description: 'Обновлённый DARGO 2026 м.г.: бензиновый 2.0T 200 л.с., робот 7DCT, полный привод.',
    sourceUrl: 'https://cdn.perxis.ru/originals/d9f0urobeucc73e9vlo0/original',
  },
  {
    id: 'dargo-x-2025my',
    modelId: 'dargo-x',
    name: 'HAVAL DARGO X, 2025 модельный год (2026 г.в.)',
    generationCode: null,
    productionStart: 2026,
    productionEnd: null,
    description:
      'DARGO X — внедорожная версия DARGO: 2.0T 192 л.с., полный привод. Отдельного прайс-листа нет — комплектации published в документе DARGO.',
    sourceUrl: 'https://cdn.perxis.ru/originals/d9karpgbeucc73ea48h0/original',
  },
  {
    id: 'f7-2024my',
    modelId: 'f7',
    name: 'HAVAL F7, 2024 модельный год (2026 г.в.)',
    generationCode: null,
    productionStart: 2026,
    productionEnd: null,
    description: 'F7 2024 м.г.: 1.5T 150 л.с. (2WD) и 2.0T 192 л.с. (4WD), робот 7DCT.',
    sourceUrl: 'https://cdn.perxis.ru/originals/d9g8c90beucc73ea0im0/original',
  },
  {
    id: 'f7-2026my',
    modelId: 'f7',
    name: 'HAVAL F7, 2026 модельный год',
    generationCode: null,
    productionStart: 2026,
    productionEnd: null,
    description: 'Обновлённый F7 2026 м.г.: 1.5T 150 л.с. (2WD) и 2.0T 200 л.с. (4WD), робот 7DCT.',
    sourceUrl: 'https://cdn.perxis.ru/originals/d9tibrgbeucc73998fmg/original',
  },
  {
    id: 'f7x-2025my',
    modelId: 'f7x',
    name: 'HAVAL F7x, 2025 модельный год (2026 г.в.)',
    generationCode: null,
    productionStart: 2026,
    productionEnd: null,
    description: 'F7x 2025 м.г.: 2.0T 192 л.с., робот 7DCT, полный привод.',
    sourceUrl: 'https://cdn.perxis.ru/originals/d9gagr0beucc73ea0oj0/original',
  },
  {
    id: 'f7x-2026my',
    modelId: 'f7x',
    name: 'HAVAL F7x, 2026 модельный год',
    generationCode: null,
    productionStart: 2026,
    productionEnd: null,
    description: 'Обновлённый F7x 2026 м.г.: 2.0T 231 л.с., робот 7DCT, полный привод.',
    sourceUrl: 'https://cdn.perxis.ru/originals/d9tic0gbeucc73998fn0/original',
  },
  {
    id: 'poer-2026',
    modelId: 'poer',
    name: 'GWM POER, 2026 год производства',
    generationCode: null,
    productionStart: 2026,
    productionEnd: null,
    description: 'Пикап GWM POER: бензиновый 2.0T 218 л.с., дизели 2.0 (163 л.с.) и 2.4 (184 л.с.), полный привод.',
    sourceUrl: 'https://cdn.perxis.ru/originals/d8sj6j0beucc73cetqe0/original',
  },
  {
    id: 'h3-2026',
    modelId: 'h3',
    name: 'HAVAL H3, 2026 модельный год',
    generationCode: null,
    productionStart: 2026,
    productionEnd: null,
    description: 'H3 (семейство HAVAL PRO): 1.5T 143 л.с. (2WD) и 177 л.с. (4WD), робот 7DCT.',
    sourceUrl: 'https://cdn.perxis.ru/originals/da1hstgbeucc73999j4g/original',
  },
  {
    id: 'h5-2026',
    modelId: 'h5',
    name: 'HAVAL H5, 2026 год производства',
    generationCode: null,
    productionStart: 2026,
    productionEnd: null,
    description: 'Рамный внедорожник H5: бензиновый 2.0T 200 л.с., АКП-8, полный привод.',
    sourceUrl: 'https://cdn.perxis.ru/originals/d8t926obeucc73ceu05g/original',
  },
  {
    id: 'h7-2026',
    modelId: 'h7',
    name: 'HAVAL H7, 2026 год производства',
    generationCode: null,
    productionStart: 2026,
    productionEnd: null,
    description: 'H7 (HAVAL PRO): 2.0T 231 л.с., робот 7DCT, полный привод. Старт продаж — 2026 год.',
    sourceUrl: 'https://cdn.perxis.ru/originals/d9celk0beucc73e9v0g0/original',
  },
  {
    id: 'h9-2026',
    modelId: 'h9',
    name: 'HAVAL H9, 2026 модельный год',
    generationCode: null,
    productionStart: 2026,
    productionEnd: null,
    description: 'Флагман H9: бензиновый 2.0T 218 л.с., АКП-8, полный привод, 7 мест.',
    sourceUrl: 'https://cdn.perxis.ru/originals/d9opvr0beucc73ea6fug/original',
  },
  {
    id: 'poer-kingkong-unknown',
    modelId: 'poer-kingkong',
    name: 'GWM POER KINGKONG — официальные данные не published',
    generationCode: null,
    productionStart: null,
    productionEnd: null,
    description:
      'Модель отсутствует в официальном каталоге haval.ru: прайс-лист и каталог не published. Модельный год и год производства официально не подтверждены.',
    sourceUrl: null,
  },
]

export const getGenerations = (modelId: string): Generation[] =>
  GENERATIONS.filter((g) => g.modelId === modelId)

export const getGeneration = (id: string): Generation | undefined =>
  GENERATIONS.find((g) => g.id === id)
