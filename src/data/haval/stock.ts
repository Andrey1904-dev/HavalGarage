import type { StockItem, StockSourceStatus } from './types'
import { HAVAL_ONLINE_STOCK_URL } from './meta'

/**
 * Автомобили в наличии.
 *
 * Официальный раздел haval.ru/online-stock/ — клиентское одностраничное
 * приложение: список автомобилей отдаётся только после выбора модели и
 * загружается скриптами браузера, поэтому надёжно получить остатки
 * (VIN, цвета, дилеров) из него нельзя. Фиктивные позиции не создаются.
 *
 * Ниже — только те предложения, которые подтверждены публикуемым источником
 * (каталог наличия официального дилера). Каждая позиция помечена статусом:
 * 'confirmed' — данные опубликованы источником, 'unverified' — период
 * действия и остатки не раскрыты, требуется подтверждение у дилера.
 */

export const STOCK_SOURCE: StockSourceStatus = {
  available: false,
  reason:
    'Официальный раздел haval.ru/online-stock/ отдаёт данные только через клиентское приложение браузера: ' +
    'список автомобилей, VIN и остатки недоступны для надёжной проверки. Раздел работает в условном режиме — ' +
    'показываются только позиции, подтверждённые публикуемым каталогом наличия официального дилера.',
  officialUrl: HAVAL_ONLINE_STOCK_URL,
  checkedAt: '2026-10-09',
}

export const STOCK_ITEMS: StockItem[] = [
  {
    id: 'agat-jolion-comfort-mt-2026',
    modelId: 'jolion',
    trimId: 'jolion-comfort-mt-2026',
    trimName: 'JOLION Рестайлинг 2 «Комфорт» 1.5T МКП 2WD',
    price: 1_789_000,
    priceType: 'stock',
    productionYear: 2026,
    color: null,
    vehicleId: null,
    region: 'Екатеринбург',
    dealer: 'АГАТ (ГК АГАТ)',
    conditions:
      'Специальная цена на автомобиль из наличия: 1 789 000 ₽ вместо 2 049 000 ₽ (выгода до 260 000 ₽). ' +
      'Количество автомобилей ограничено, цена не является публичной офертой.',
    sourceUrl: 'https://xn--80acgfbsl1azdqr.xn--80aai5d.xn--p1ai/catalog-cars-new/brand-haval/',
    verifiedAt: '2026-10-09',
    status: 'unverified',
  },
  {
    id: 'agat-jolion-comfort-dct-2026',
    modelId: 'jolion',
    trimId: null,
    trimName: 'JOLION Рестайлинг 2 «Комфорт» 1.5T робот 2WD',
    price: 2_079_000,
    priceType: 'stock',
    productionYear: 2026,
    color: null,
    vehicleId: null,
    region: 'Екатеринбург',
    dealer: 'АГАТ (ГК АГАТ)',
    conditions:
      'Специальная цена на автомобиль из наличия: 2 079 000 ₽ вместо 2 349 000 ₽ (выгода до 270 000 ₽). ' +
      'Количество автомобилей ограничено, цена не является публичной офертой.',
    sourceUrl: 'https://xn--80acgfbsl1azdqr.xn--80aai5d.xn--p1ai/catalog-cars-new/brand-haval/',
    verifiedAt: '2026-10-09',
    status: 'unverified',
  },
]
