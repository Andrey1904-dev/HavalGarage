/**
 * Типы сравнения результата импорта с каталогом.
 *
 * Реализация — scripts/lib/diff.mjs (JavaScript, запускается Node напрямую).
 */

export interface TrimSignature {
  grade: string | null
  transmission: string | null
  drivetrain: string | null
  fuel: string | null
  engines: string[]
  horsepower: number | null
}

/** Подпись комплектации: уровень оснащения, коробка, привод, топливо, мотор */
export declare function trimSignature(name: string): TrimSignature

/** Комплектация каталога, соответствующая записи импорта; null — если неоднозначно */
export declare function matchTrim(row: Record<string, unknown>, trims: unknown[]): Record<string, unknown> | null

export interface PriceDiff {
  unchanged: Array<{ trimId: string; price: number }>
  changed: Array<{ trimId: string; previousPrice: number; newPrice: number; sourceUrl?: string }>
  added: Array<{ modelSlug: string; name: string; price: number; sourceUrl?: string }>
  missing: Array<{ trimId: string; price: number }>
  ambiguous: Array<{ row: Record<string, unknown>; reason: string }>
}

export declare function diffPrices(
  rows: unknown[],
  trims: unknown[],
  options?: { coveredModelIds?: string[] },
): PriceDiff

export interface DocumentDiff {
  newDocuments: Array<Record<string, unknown>>
  updatedDocuments: Array<Record<string, unknown> & { previousChecksum?: string | null }>
  missingDocuments: Array<Record<string, unknown>>
}

export declare function diffDocuments(discovered: unknown[], registry: unknown[]): DocumentDiff

export interface OfferDiff {
  expired: Array<Record<string, unknown>>
  active: Array<Record<string, unknown>>
}

export declare function diffOffers(offers: unknown[], todayIso: string): OfferDiff

export declare function buildChangeEvents(
  input: {
    priceDiff: PriceDiff
    documentDiff: DocumentDiff
    offerDiff: OfferDiff
    discoveredModels?: string[]
    knownModelIds?: string[]
  },
  todayIso: string,
): Array<{ id: string; detectedAt: string; summary: string; sourceUrl?: string | null; kind?: string }>
