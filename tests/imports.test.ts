import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, it } from 'node:test'

/**
 * Импорт структурированных данных из официальных прайс-листов.
 *
 * Проверяется поведение скрипта scripts/import-price-list.mjs:
 *  — валидный файл принимается и данные записываются;
 *  — невалидные значения (неизвестная модель, отрицательная цена, отсутствие
 *    источника, дубликаты комплектаций) отклоняют импорт целиком;
 *  — при отказе последняя подтверждённая запись НЕ затирается и не обнуляется;
 *  — успешный импорт добавляет запись в историю проверок.
 */

const ROOT = process.cwd()
const SCRIPT = path.join(ROOT, 'scripts', 'import-price-list.mjs')
const OUT = path.join(ROOT, 'src', 'data', 'haval', 'prices.generated.json')
const HISTORY = path.join(ROOT, 'src', 'data', 'haval', 'price-history.json')

const originalPrices = readFileSync(OUT, 'utf8')
const originalHistory = readFileSync(HISTORY, 'utf8')

function run(fixture: unknown): { code: number; stdout: string; stderr: string } {
  const dir = mkdtempSync(path.join(tmpdir(), 'haval-import-'))
  const file = path.join(dir, 'import.json')
  writeFileSync(file, JSON.stringify(fixture, null, 2))
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT, file], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return { code: 0, stdout, stderr: '' }
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string }
    return { code: err.status ?? 1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

const validFixture = {
  sourceUrl: 'https://haval.ru/purchase/catalogues/',
  priceUpdatedAt: '2026-10-09',
  trims: [
    {
      modelSlug: 'jolion',
      name: 'Комфорт, 1.5T MT 2WD',
      price: 2_099_000,
      modelYear: 2026,
      productionYear: 2026,
      engine: '1.5T',
      transmission: 'МКП',
      drivetrain: 'передний',
      validFrom: '2026-08-17',
    },
    {
      modelSlug: 'h3',
      name: 'Оптимум, 1.5T 4WD',
      price: 3_099_000,
      modelYear: 2026,
      validFrom: '2026-08-17',
    },
  ],
}

describe('импорт прайс-листов', () => {
  it('валидный файл принимается, данные записываются, история дополняется', () => {
    const res = run(validFixture)
    try {
      assert.equal(res.code, 0, `ожидался успешный импорт: ${res.stderr}`)
      const written = JSON.parse(readFileSync(OUT, 'utf8'))
      assert.equal(written.teasers.length, 2)
      assert.equal(written.source, validFixture.sourceUrl)
      assert.equal(written.priceUpdatedAt, '2026-10-09')
      assert.equal(written.teasers[0].slug, 'jolion')
      assert.equal(written.teasers[0].price, 2_099_000)

      const history = JSON.parse(readFileSync(HISTORY, 'utf8'))
      const last = history.entries[history.entries.length - 1]
      assert.equal(last.outcome, 'updated')
      assert.equal(last.checkedAt, '2026-10-09')
      assert.ok(last.models.includes('jolion'))
    } finally {
      writeFileSync(OUT, originalPrices)
      writeFileSync(HISTORY, originalHistory)
    }
  })

  it('неизвестная модель отклоняет импорт', () => {
    const res = run({
      ...validFixture,
      trims: [{ modelSlug: 'lada-granta', name: 'Люкс', price: 1_000_000 }],
    })
    try {
      assert.notEqual(res.code, 0)
      assert.match(res.stderr, /неизвестная модель/)
      assert.equal(readFileSync(OUT, 'utf8'), originalPrices, 'данные не должны измениться при отказе')
    } finally {
      writeFileSync(OUT, originalPrices)
    }
  })

  it('отрицательная и нулевая цена отклоняются', () => {
    for (const price of [-1, 0]) {
      const res = run({ ...validFixture, trims: [{ modelSlug: 'm6', name: 'Оптимум', price }] })
      assert.notEqual(res.code, 0, `цена ${price} должна отклоняться`)
      assert.match(res.stderr, /цена/)
    }
    assert.equal(readFileSync(OUT, 'utf8'), originalPrices, 'цены не обнуляются при ошибке импорта')
  })

  it('без источника и даты фиксации импорт отклоняется', () => {
    const noSource = run({ priceUpdatedAt: '2026-10-09', trims: validFixture.trims })
    assert.notEqual(noSource.code, 0)
    assert.match(noSource.stderr, /sourceUrl/)

    const noDate = run({ sourceUrl: validFixture.sourceUrl, trims: validFixture.trims })
    assert.notEqual(noDate.code, 0)
    assert.match(noDate.stderr, /priceUpdatedAt/)
  })

  it('дубликаты комплектаций отклоняются', () => {
    const res = run({
      ...validFixture,
      trims: [
        { modelSlug: 'm6', name: 'Оптимум, 1.5T MT 143', price: 2_099_000, modelYear: 2026 },
        { modelSlug: 'm6', name: 'Оптимум, 1.5T MT 143', price: 2_199_000, modelYear: 2026 },
      ],
    })
    try {
      assert.notEqual(res.code, 0)
      assert.match(res.stderr, /дубликат/i)
      assert.equal(readFileSync(OUT, 'utf8'), originalPrices)
    } finally {
      writeFileSync(OUT, originalPrices)
    }
  })

  it('пустой список комплектаций отклоняется', () => {
    const res = run({ ...validFixture, trims: [] })
    assert.notEqual(res.code, 0)
    assert.match(res.stderr, /пустой список/)
  })

  it('отсутствующий файл — понятная ошибка, данные не тронуты', () => {
    try {
      execFileSync(process.execPath, [SCRIPT, '/no/such/file.json'], {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      assert.fail('ожидалась ошибка')
    } catch (e) {
      const err = e as { status?: number; stderr?: string }
      assert.notEqual(err.status, 0)
      assert.match(err.stderr ?? '', /Не удалось прочитать/)
    }
    assert.equal(readFileSync(OUT, 'utf8'), originalPrices)
  })

  it('без аргумента скрипт показывает использование', () => {
    try {
      execFileSync(process.execPath, [SCRIPT], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
      assert.fail('ожидалась ошибка')
    } catch (e) {
      const err = e as { status?: number; stderr?: string }
      assert.equal(err.status, 2)
      assert.match(err.stderr ?? '', /Использование/)
    }
  })
})
