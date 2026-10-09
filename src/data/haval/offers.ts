import type { Offer } from './types'

/**
 * Подтверждённые скидки и специальные предложения дилера АГАТ.
 * Включены только предложения, опубликованные на agat-ekb-haval.ru
 * (или в каталоге наличия ГК АГАТ — помечено в conditions).
 * Сегодняшняя дата для проверки актуальности подставляется из каталога.
 */
export const OFFERS: Offer[] = [
  {
    id: 'gosprogramma-m6',
    modelIds: ['m6'],
    offerType: 'state-support',
    discountAmount: null,
    discountPercent: 20,
    finalPrice: null,
    conditions:
      'Госпрограмма льготного автокредитования для HAVAL M6: выгода 20% от стоимости (25% для жителей ДФО). ' +
      'Категории: семьи с детьми, медицинские работники, работники сферы образования, военнослужащие, лица с инвалидностью. ' +
      'Выгода предоставляется путём уменьшения суммы кредита. Категории и процент различаются — уточняйте у дилера.',
    validFrom: null,
    validUntil: null,
    sourceUrl: 'https://agat-ekb-haval.ru/purchase/special-offer/gosprogramma/',
  },
  {
    id: 'jolion-stock-mt-2026',
    modelIds: ['jolion'],
    trimIds: ['jolion-comfort-mt-2026'],
    offerType: 'stock-special',
    discountAmount: 260_000,
    discountPercent: null,
    finalPrice: 1_789_000,
    conditions:
      'Специальная цена на HAVAL JOLION Рестайлинг 2 «Комфорт» 1.5T МКП 2WD, 2026 г.в. / 2026 м.г. в наличии: ' +
      '1 789 000 ₽ вместо 2 049 000 ₽ (выгода до 260 000 ₽). Источник: каталог наличия ГК АГАТ.',
    validFrom: null,
    validUntil: null,
    sourceUrl: 'https://xn--80acgfbsl1azdqr.xn--80aai5d.xn--p1ai/catalog-cars-new/brand-haval/',
  },
  {
    id: 'jolion-stock-dct-2026',
    modelIds: ['jolion'],
    offerType: 'stock-special',
    discountAmount: 270_000,
    discountPercent: null,
    finalPrice: 2_079_000,
    conditions:
      'Специальная цена на HAVAL JOLION Рестайлинг 2 «Комфорт» 1.5T робот 2WD, 2026 г.в. / 2026 м.г. в наличии: ' +
      '2 079 000 ₽ вместо 2 349 000 ₽ (выгода до 270 000 ₽). Источник: каталог наличия ГК АГАТ.',
    validFrom: null,
    validUntil: null,
    sourceUrl: 'https://xn--80acgfbsl1azdqr.xn--80aai5d.xn--p1ai/catalog-cars-new/brand-haval/',
  },
  {
    id: 'kingkong-special-200k',
    modelIds: ['poer-kingkong'],
    offerType: 'direct-discount',
    discountAmount: 200_000,
    discountPercent: null,
    finalPrice: null,
    conditions:
      'Выгода 200 000 ₽ при приобретении GWM KINGKONG POER по специальному предложению; ' +
      'условия уточняйте в дилерских центрах HAVAL City.',
    validFrom: null,
    validUntil: null,
    sourceUrl: 'https://agat-ekb-haval.ru/purchase/catalogues/',
  },
  {
    id: 'poer-optimum-direct-100k',
    modelIds: ['poer'],
    offerType: 'direct-discount',
    discountAmount: 100_000,
    discountPercent: null,
    finalPrice: null,
    conditions:
      'Прямая выгода 100 000 ₽ при приобретении нового GWM POER «Оптимум» с бензиновым двигателем 2.0Т, 4WD, ' +
      '2025 года производства (действует с 01.07.2025).',
    validFrom: '2025-07-01',
    validUntil: null,
    sourceUrl: 'https://agat-ekb-haval.ru/models/haval-f7x/',
  },
]

/** Активные предложения для модели на указанную дату */
export function activeOffersForModel(modelId: string, todayIso: string): Offer[] {
  return OFFERS.filter((o) => {
    if (!o.modelIds.includes(modelId)) return false
    if (o.validFrom && todayIso < o.validFrom) return false
    if (o.validUntil && todayIso > o.validUntil) return false
    return true
  })
}
