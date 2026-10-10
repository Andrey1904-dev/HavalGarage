import type {
  FeatureAvailability,
  FuelConsumption,
  HavalModel,
  ModelEquipment,
  OfficialSpecs,
  Trim,
  TrimTech,
} from './types'
import { MODELS, getModel } from './models'
import { TRIMS, getTrim, trimsForModel } from './trims'
import { getOfficialSpecs, getTrimTech } from './specs'
import { getModelEquipment } from './equipment'
import { pricesForTrim } from './prices'
import { offersForTrim } from './offers'
import { CATALOG_FIXED_AT } from './meta'

/**
 * Селекторы каталога: единственное место, где данные модели, комплектации,
 * официальных характеристик и оснащения соединяются в представление для
 * интерфейса. Логика не дублируется в компонентах.
 */

export interface TrimDetails {
  trim: Trim
  model: HavalModel
  specs: OfficialSpecs | null
  tech: TrimTech | null
  /** Крутящий момент, Нм (null — не подтверждено) */
  torqueNm: number | null
  displacementCc: number | null
  consumption: FuelConsumption | null
  clearanceMm: string | null
  dimensionsText: string | null
  wheelbaseMm: number | null
  trunkL: string | null
  fuelTankL: number | null
  wheels: string | null
  tires: string | null
  weightKg: string | null
  acceleration0to100: string | null
  maxSpeedKmh: string | null
  colorsExterior: string[]
  colorsInterior: string[]
  /** Все ценовые записи комплектации (МСP, выгоды, наличие) */
  prices: ReturnType<typeof pricesForTrim>
  /** Применимые предложения на дату проверки каталога */
  offers: ReturnType<typeof offersForTrim>
}

/** Полное представление комплектации (данные + официальные характеристики) */
export function trimDetails(trimId: string): TrimDetails | null {
  const trim = getTrim(trimId)
  if (!trim) return null
  const model = getModel(trim.modelId)
  if (!model) return null
  const specs = getOfficialSpecs(trim.modelId)
  const tech = getTrimTech(trim.id)

  const dims = specs?.dimensions
  const dimensionsText =
    dims && dims.lengthMm !== null && dims.widthMm !== null && dims.heightMm !== null
      ? `${dims.lengthMm} × ${dims.widthMm} × ${dims.heightMm} мм`
      : null

  return {
    trim,
    model,
    specs,
    tech,
    torqueNm: tech?.torqueNm ?? specs?.engines[0]?.torqueNm ?? null,
    displacementCc: tech?.displacementCc ?? specs?.engines[0]?.displacementCc ?? null,
    consumption: tech?.consumption ?? specs?.consumption ?? null,
    clearanceMm: specs?.clearanceMm ?? null,
    dimensionsText,
    wheelbaseMm: specs?.wheelbaseMm ?? null,
    trunkL: specs?.trunkL ?? null,
    fuelTankL: specs?.fuelTankL ?? null,
    wheels: tech?.wheels ?? specs?.wheels[0] ?? null,
    tires: tech?.tires ?? specs?.tires[0] ?? null,
    weightKg: tech?.weightKg ?? specs?.weightKg ?? null,
    acceleration0to100: tech?.acceleration0to100 ?? specs?.acceleration0to100 ?? null,
    maxSpeedKmh: tech?.maxSpeedKmh ?? specs?.maxSpeedKmh ?? null,
    colorsExterior: specs?.colorsExterior ?? [],
    colorsInterior: specs?.colorsInterior ?? [],
    prices: pricesForTrim(trim.id),
    offers: offersForTrim(trim.id, trim.modelId, trim.modelYear, CATALOG_FIXED_AT),
  }
}

/** Расход топлива (смешанный цикл) для расчёта стоимости владения */
export function trimCombinedConsumption(trimId: string): number | null {
  const d = trimDetails(trimId)
  return d?.consumption?.combined ?? null
}

/** Рекомендуемый тип топлива из официального документа */
export function trimFuelType(trimId: string): string | null {
  const d = trimDetails(trimId)
  if (!d) return null
  const specs = d.specs
  if (!specs) return null
  const engine = specs.engines.find((e) => e.appliesTo && d.trim.name.includes(e.code.split(' ')[0]))
  return (engine ?? specs.engines[0])?.fuel ?? null
}

export interface CompareFeature {
  feature: string
  group: string
  values: Record<string, FeatureAvailability>
}

/**
 * Матрица оснащения для набора комплектаций.
 *
 * Значения:
 *  standard    — есть;
 *  optional    — доступно опционально;
 *  unavailable — нет;
 *  unknown     — не подтверждено официальными данными.
 *
 * Отсутствие сведений не трактуется как отсутствие функции.
 */
export function compareFeatures(trimIds: string[]): CompareFeature[] {
  const trims = trimIds.map((id) => getTrim(id)).filter((t): t is Trim => Boolean(t))
  if (trims.length === 0) return []

  const features: CompareFeature[] = []
  const seen = new Set<string>()

  const push = (feature: string, group: string, values: Record<string, FeatureAvailability>) => {
    const key = `${group}::${feature.toLowerCase()}`
    if (seen.has(key)) return
    seen.add(key)
    features.push({ feature, group, values })
  }

  // 1) Матрицы различий из официальных прайс-листов
  const modelIds = [...new Set(trims.map((t) => t.modelId))]
  for (const modelId of modelIds) {
    const eq: ModelEquipment | null = getModelEquipment(modelId)
    if (!eq) continue
    for (const row of eq.matrix) {
      const values: Record<string, FeatureAvailability> = {}
      for (const t of trims) {
        values[t.id] = t.modelId === modelId ? (row.values[t.id] ?? 'unknown') : 'unknown'
      }
      push(row.feature, row.group, values)
    }
  }

  // 2) Позиции оснащения из описания комплектаций (trim.equipment)
  for (const t of trims) {
    for (const item of t.equipment) {
      const group = classifyFeature(item)
      const values: Record<string, FeatureAvailability> = {}
      for (const other of trims) {
        if (other.id === t.id) values[other.id] = 'standard'
        else if (other.equipment.some((e) => sameFeature(e, item))) values[other.id] = 'standard'
        else values[other.id] = 'unknown'
      }
      push(item, group, values)
    }
  }

  // 3) Базовое оснащение модели (общее для всех комплектаций)
  for (const modelId of modelIds) {
    const eq = getModelEquipment(modelId)
    if (!eq) continue
    for (const group of eq.standard) {
      for (const item of group.items) {
        const values: Record<string, FeatureAvailability> = {}
        for (const t of trims) values[t.id] = t.modelId === modelId ? 'standard' : 'unknown'
        push(item, groupLabel(group.group), values)
      }
    }
  }

  return features.sort((a, b) => a.group.localeCompare(b.group, 'ru') || a.feature.localeCompare(b.feature, 'ru'))
}

/** Соответствие группы прайс-листа единому словарю групп сравнения */
function groupLabel(rawGroup: string): string {
  const g = rawGroup.toLowerCase()
  if (g.includes('безопас') || g.includes('противоугон')) return 'Безопасность'
  if (g.includes('аудио') || g.includes('мультимедиа') || g.includes('электрон')) return 'Мультимедиа'
  if (g.includes('свет')) return 'Светодиодная оптика'
  if (g.includes('колес') || g.includes('колёс') || g.includes('шины')) return 'Колёса и шины'
  if (g.includes('сиден') || g.includes('сидень')) return 'Сиденья и отделка'
  if (g.includes('экстер') || g.includes('интер') || g.includes('багаж') || g.includes('груз')) return 'Экстерьер и интерьер'
  if (g.includes('внедорож') || g.includes('off-road') || g.includes('механика')) return 'Внедорожные функции'
  if (g.includes('комфорт') || g.includes('оборуд')) return 'Комфорт и оборудование'
  if (g.includes('адаптац')) return 'Адаптация к России'
  return rawGroup
}

/** Классификатор позиций оснащения для сравнения по группам */
export function classifyFeature(item: string): string {
  const s = item.toLowerCase()
  if (/подушк|isofix|abs|esp|esc|ebd|tcs|rmi|ремн|иммобилайзер|сигнализ|эра-глонасс|глонасс/.test(s)) return 'Безопасность'
  if (/камер|кругового обзора|540|360|прозрачн/.test(s)) return 'Камеры'
  if (/датчик[и]? парковк|парктроник/.test(s)) return 'Парковочные датчики'
  if (/адаптивный круиз|acc|ica|tja/.test(s)) return 'Адаптивный круиз-контроль'
  if (/aeb|fcw|ldw|lka|lck|elk|bsm|lca|rcta|rctb|tsr|iaeb|ассистент|мониторинг слепых|удержан|распознаван/.test(s))
    return 'Системы помощи водителю'
  if (/светодиод|led|фар|фонар|дхо/.test(s)) return 'Светодиодная оптика'
  if (/подогрев|обогрев|тепл/.test(s)) return 'Обогревы'
  if (/вентиляц|массаж/.test(s)) return 'Вентиляция и массаж сидений'
  if (/электропривод|электрорегулир|электрообогрев|электроскладыв|джойстик|epb|электроусилит/.test(s)) return 'Электроприводы'
  if (/память/.test(s)) return 'Память сидений'
  if (/климат/.test(s)) return 'Климат-контроль'
  if (/мультимедиа|дисплей|панель приборов|яндекс|vk видео|виджет|голосов|проекцион|ota/.test(s)) return 'Мультимедиа'
  if (/carplay|android auto|bluetooth|беспроводн|usb|зарядк/.test(s)) return 'Беспроводные интерфейсы'
  if (/динамик|аудиосистем|сабвуфер/.test(s)) return 'Аудиосистема'
  if (/панорамн|люк/.test(s)) return 'Панорамная крыша'
  if (/привод|4wd|2wd|коробк|кпп|робот|механи|автомат|понижающ|блокировк|дифференциал/.test(s)) return 'Привод и трансмиссия'
  if (/диск|шин|колес|колёс|tpms/.test(s)) return 'Колёса и шины'
  if (/сиден|сидень|обивк|экокож|кож|ткан|алькантар/.test(s)) return 'Сиденья и отделка'
  if (/внедорожн|режим движени|режимы/.test(s)) return 'Внедорожные функции'
  return 'Комфорт и оборудование'
}

/** Грубая нормализация названия функции для сопоставления между комплектациями */
function sameFeature(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^а-яa-z0-9]+/gi, ' ').trim()
  const na = norm(a)
  const nb = norm(b)
  if (na === nb) return true
  return na.includes(nb) || nb.includes(na)
}

/** Сводка по модели для карточек и списков */
export interface ModelSummary {
  model: HavalModel
  trims: Trim[]
  priceFrom: number | null
  priceTo: number | null
  powerRange: string | null
  specs: OfficialSpecs | null
  equipment: ModelEquipment | null
}

export function modelSummary(modelId: string): ModelSummary | null {
  const model = getModel(modelId)
  if (!model) return null
  const trims = trimsForModel(modelId).filter((t) => t.basePrice !== null)
  const prices = trims.map((t) => t.basePrice as number)
  const powers = trims.map((t) => t.horsepower).filter((p): p is number => p !== null)
  return {
    model,
    trims,
    priceFrom: prices.length > 0 ? Math.min(...prices) : null,
    priceTo: prices.length > 0 ? Math.max(...prices) : null,
    powerRange:
      powers.length > 0
        ? Math.min(...powers) === Math.max(...powers)
          ? `${Math.min(...powers)} л.с.`
          : `${Math.min(...powers)}–${Math.max(...powers)} л.с.`
        : null,
    specs: getOfficialSpecs(modelId),
    equipment: getModelEquipment(modelId),
  }
}

export const allModelSummaries = (): ModelSummary[] =>
  MODELS.map((m) => modelSummary(m.id)).filter((s): s is ModelSummary => s !== null)

/** Все текущие комплектации с подтверждённой ценой (для подбора по бюджету) */
export const pricedCurrentTrims = (): Trim[] => TRIMS.filter((t) => t.status === 'current' && t.basePrice !== null)

/**
 * Текстовый «отпечаток» подтверждённого оснащения комплектации:
 * оснащение из описания + базовое оснащение модели + позиции матрицы
 * со значением «есть»/«опционально». Используется для проверки
 * минимально необходимых функций в подборе по бюджету.
 */
export function trimFeatureIndex(trimId: string): string {
  const trim = getTrim(trimId)
  if (!trim) return ''
  const parts: string[] = [...trim.equipment]
  const eq = getModelEquipment(trim.modelId)
  if (eq) {
    for (const group of eq.standard) parts.push(...group.items)
    for (const row of eq.matrix) {
      const value = row.values[trimId]
      if (value === 'standard' || value === 'optional') parts.push(row.feature)
    }
  }
  const specs = getOfficialSpecs(trim.modelId)
  if (specs) parts.push(...specs.offroad, ...specs.wheels, ...specs.tires)
  parts.push(trim.engine, trim.transmission, trim.drivetrain)
  return parts.join(' \n ').toLowerCase()
}

/** Есть ли у комплектации функция, названная пользователем (по ключевым словам) */
export function trimHasFeature(trimId: string, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const index = trimFeatureIndex(trimId)
  return q.split(/\s+/).every((word) => word.length < 3 || index.includes(word))
}
