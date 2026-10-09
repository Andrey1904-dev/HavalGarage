import type { Offer } from './types'

/**
 * Подтверждённые скидки и специальные предложения.
 *
 * Источники — официальный сайт производителя (haval.ru, прайс-листы) и
 * страницы официального дилера АГАТ (вторичный источник, помечен в conditions).
 *
 * Важные правила:
 *  — выгода НЕ вычитается из базовой цены автоматически: она доступна только
 *    при выполнении условий (трейд-ин, категория госпрограммы, наличие);
 *  — у предложения хранятся условия получения, период действия и источник;
 *  — status 'unverified' означает, что период действия не опубликован и
 *    актуальность нужно подтверждать у дилера.
 */
export const OFFERS: Offer[] = [
  {
    id: 'gosprogramma-m6',
    name: 'Госпрограмма льготного автокредитования',
    modelIds: ['m6'],
    offerType: 'state-support',
    discountAmount: null,
    discountPercent: 20,
    finalPrice: null,
    eligibilityConditions:
      'Категории: семьи с детьми, медицинские работники, работники сферы образования, военнослужащие, лица с инвалидностью. Выгода предоставляется путём уменьшения суммы кредита.',
    conditions:
      'Госпрограмма льготного автокредитования для HAVAL M6: выгода 20% от стоимости (25% для жителей ДФО). ' +
      'Категории и процент различаются — уточняйте у дилера. Не является офертой и не гарантирует одобрение.',
    validFrom: null,
    validUntil: null,
    sourceUrl: 'https://agat-ekb-haval.ru/purchase/special-offer/gosprogramma/',
    status: 'unverified',
  },
  {
    id: 'h3-trade-in-loyal-200k',
    name: 'Лояльный Трейд-ин (HAVAL H3)',
    modelIds: ['h3'],
    modelYears: [2026],
    offerType: 'trade-in',
    discountAmount: 200_000,
    discountPercent: null,
    finalPrice: null,
    eligibilityConditions:
      'Сдача дилеру автомобиля марки HAVAL или Great Wall с пробегом, находящегося минимум 3 последних месяца ' +
      'в собственности и эксплуатации (поставлены на учёт в ГИБДД) сдающего лица или его супруга/супруги. ' +
      'Подтверждение — копия ПТС или СТС, либо карточка учёта ТС из ГИБДД с печатью и подписью; ' +
      'копия свидетельства о браке, если автомобиль принадлежал супругу/супруге.',
    conditions:
      'Выгода 200 000 ₽ по программе «Лояльный Трейд-ин» на все комплектации HAVAL H3 2026 м.г. / 2026 г.в. ' +
      'Итоговые цены «с учётом максимальной выгоды»: Оптимум 2WD — 2 549 000 ₽, Премиум 2WD — 2 749 000 ₽, ' +
      'Оптимум 4WD — 2 899 000 ₽, Премиум 4WD — 3 049 000 ₽, Техно + 4WD — 3 349 000 ₽. Не является публичной офертой.',
    validFrom: '2026-08-17',
    validUntil: null,
    sourceUrl: 'https://cdn.perxis.ru/originals/da1hstgbeucc73999j4g/original',
    status: 'active',
  },
  {
    id: 'h7-trade-in-loyal-200k',
    name: 'Лояльный трейд-ин (HAVAL H7)',
    modelIds: ['h7'],
    offerType: 'trade-in',
    discountAmount: 200_000,
    discountPercent: null,
    finalPrice: null,
    eligibilityConditions:
      'Сдача дилеру автомобиля марки HAVAL или Great Wall с пробегом, находящегося минимум 3 последних месяца ' +
      'в собственности и эксплуатации сдающего лица или его супруга/супруги (подтверждение — копия ПТС/СТС ' +
      'или карточка учёта ТС из ГИБДД).',
    conditions:
      'Выгода 200 000 ₽ по программе «Лояльный трейд-ин» на HAVAL H7 2026 г.в. ' +
      'Сноска прайс-листа описывает период предзаказа 12.02.2026–28.02.2026; карточка каталога производителя ' +
      'показывает цену с учётом выгоды как действующую с 01.05.2026. Итог: Премиум — 3 799 000 ₽, Техно + — 3 999 000 ₽. ' +
      'Не является публичной офертой.',
    validFrom: '2026-05-01',
    validUntil: null,
    sourceUrl: 'https://cdn.perxis.ru/originals/d9celk0beucc73e9v0g0/original',
    status: 'unverified',
  },
  {
    id: 'jolion-stock-mt-2026',
    name: 'Специальная цена на JOLION Комфорт MT в наличии',
    modelIds: ['jolion'],
    trimIds: ['jolion-comfort-mt-2026'],
    modelYears: [2026],
    offerType: 'stock-special',
    discountAmount: 260_000,
    discountPercent: null,
    finalPrice: 1_789_000,
    eligibilityConditions: 'Покупка конкретного автомобиля из наличия дилера; количество ограничено.',
    conditions:
      'Специальная цена на HAVAL JOLION Рестайлинг 2 «Комфорт» 1.5T МКП 2WD, 2026 г.в. / 2026 м.г. в наличии: ' +
      '1 789 000 ₽ вместо 2 049 000 ₽ (выгода до 260 000 ₽). Источник — каталог наличия ГК АГАТ (вторичный).',
    validFrom: null,
    validUntil: null,
    sourceUrl: 'https://xn--80acgfbsl1azdqr.xn--80aai5d.xn--p1ai/catalog-cars-new/brand-haval/',
    status: 'unverified',
  },
  {
    id: 'jolion-stock-dct-2026',
    name: 'Специальная цена на JOLION Комфорт робот в наличии',
    modelIds: ['jolion'],
    modelYears: [2026],
    // Конфигурация «Комфорт робот 2WD» отсутствует в официальном прайс-листе
    // JOLION 2026 (там Комфорт — только МКП), поэтому предложение не
    // привязывается ни к одной комплектации каталога и не создаёт запись цены:
    // иначе спеццена робота «прилипла» бы к механической версии.
    trimIds: [],
    offerType: 'stock-special',
    discountAmount: 270_000,
    discountPercent: null,
    finalPrice: 2_079_000,
    eligibilityConditions: 'Покупка конкретного автомобиля из наличия дилера; количество ограничено.',
    conditions:
      'Специальная цена на HAVAL JOLION Рестайлинг 2 «Комфорт» 1.5T робот 2WD, 2026 г.в. / 2026 м.г. в наличии: ' +
      '2 079 000 ₽ вместо 2 349 000 ₽ (выгода до 270 000 ₽). Источник — каталог наличия ГК АГАТ (вторичный).',
    validFrom: null,
    validUntil: null,
    sourceUrl: 'https://xn--80acgfbsl1azdqr.xn--80aai5d.xn--p1ai/catalog-cars-new/brand-haval/',
    status: 'unverified',
  },
  {
    id: 'kingkong-special-200k',
    name: 'Специальное предложение на GWM POER KINGKONG',
    modelIds: ['poer-kingkong'],
    offerType: 'direct-discount',
    discountAmount: 200_000,
    discountPercent: null,
    finalPrice: null,
    eligibilityConditions: 'Условия уточняйте в дилерских центрах HAVAL City.',
    conditions:
      'Выгода 200 000 ₽ при приобретении GWM KINGKONG POER по специальному предложению. ' +
      'Официальный прайс-лист модели на haval.ru не опубликован, поэтому и выгода, и базовая цена ' +
      'требуют подтверждения у дилера.',
    validFrom: null,
    validUntil: null,
    sourceUrl: 'https://agat-ekb-haval.ru/purchase/catalogues/',
    status: 'unverified',
  },
  {
    id: 'poer-optimum-direct-100k',
    name: 'Прямая выгода на GWM POER Оптимум',
    modelIds: ['poer'],
    offerType: 'direct-discount',
    discountAmount: 100_000,
    discountPercent: null,
    finalPrice: null,
    eligibilityConditions:
      'Новый GWM POER «Оптимум» с бензиновым двигателем 2.0T, 4WD, 2025 года производства.',
    conditions:
      'Прямая выгода 100 000 ₽ при приобретении нового GWM POER «Оптимум» 2.0T 4WD 2025 года производства ' +
      '(действует с 01.07.2025). Источник — сноски на страницах дилера.',
    validFrom: '2025-07-01',
    validUntil: null,
    sourceUrl: 'https://agat-ekb-haval.ru/models/poer/',
    status: 'unverified',
  },
]

/** Предложения, действующие для модели на указанную дату */
export function activeOffersForModel(modelId: string, todayIso: string): Offer[] {
  return OFFERS.filter((o) => {
    if (!o.modelIds.includes(modelId)) return false
    if (o.validFrom && todayIso < o.validFrom) return false
    if (o.validUntil && todayIso > o.validUntil) return false
    return true
  })
}

/** Предложения, применимые к конкретной комплектации (с учётом модельного года) */
export function offersForTrim(trimId: string, modelId: string, modelYear: number | null, todayIso: string): Offer[] {
  return activeOffersForModel(modelId, todayIso).filter((o) => {
    if (o.trimIds && !o.trimIds.includes(trimId)) return false
    if (o.modelYears && modelYear !== null && !o.modelYears.includes(modelYear)) return false
    return true
  })
}

export const getOffer = (id: string): Offer | undefined => OFFERS.find((o) => o.id === id)
