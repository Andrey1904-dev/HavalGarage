/**
 * Регрессионные тесты типографики.
 *
 * Исходный баг: index.html запрашивал у Google Fonts Manrope с весом 900,
 * которого у семейства нет (диапазон 200–800). Google в таком случае молча
 * выкидывает семейство из ответа, и весь интерфейс рендерился системным
 * шрифтом. Теперь шрифты самостоятельно размещены (@fontsource-variable),
 * а тесты ниже не дают вернуть ошибки этого класса:
 *  — шрифты не грузятся с внешнего CDN, семейства в CSS совпадают с пакетами;
 *  — в интерфейсе нет начертаний вне диапазона осей вариативных шрифтов;
 *  — нет кегля меньше 11px и дробных px (шкала: 11, 12, 13, 14, 15, 16…);
 *  — графики (canvas) и печатная версия используют тот же шрифт;
 *  — окно печати действительно открывается (без noopener);
 *  — в PDF не попадают символы, которых нет во встроенном Roboto.
 */
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { buildReportHtml, openReport } from '../src/utils/export'
import { buildDocDefinition, pdfSafeText } from '../src/utils/pdf-export'

const root = process.cwd()
const read = (rel: string): string => fs.readFileSync(path.join(root, rel), 'utf8')

function walk(dir: string, exts: string[]): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(rel, exts))
    else if (exts.some((e) => entry.name.endsWith(e))) out.push(rel)
  }
  return out
}

const SOURCES = walk('src', ['.tsx', '.ts']).map((file) => ({ file, text: read(file) }))
const INDEX_CSS = read('src/index.css')

/** Первое семейство из CSS-стека: `"Manrope Variable", …` → `Manrope Variable` */
const firstFamily = (stack: string): string => stack.split(',')[0].trim().replace(/^["']|["']$/g, '')

function themeVar(name: string): string {
  const m = INDEX_CSS.match(new RegExp(`--${name}:\\s*([^;]+);`))
  assert.ok(m, `в src/index.css нет --${name}`)
  return m[1]
}

function fontsourceFace(pkg: string): { family: string; min: number; max: number } {
  const css = read(`node_modules/@fontsource-variable/${pkg}/index.css`)
  const family = css.match(/font-family:\s*'([^']+)'/)?.[1]
  const weight = css.match(/font-weight:\s*(\d+)\s+(\d+)/)
  assert.ok(family && weight, `не удалось разобрать @font-face пакета ${pkg}`)
  return { family, min: Number(weight[1]), max: Number(weight[2]) }
}

/** Удаляет блоки @media print { … } (печать живёт по своим правилам кегля) */
function stripPrintMedia(css: string): string {
  let out = css
  for (let i = out.indexOf('@media print'); i !== -1; i = out.indexOf('@media print')) {
    let depth = 0
    let j = out.indexOf('{', i)
    for (; j < out.length; j++) {
      if (out[j] === '{') depth++
      else if (out[j] === '}' && --depth === 0) break
    }
    out = out.slice(0, i) + out.slice(j + 1)
  }
  return out
}

const manrope = fontsourceFace('manrope')
const mono = fontsourceFace('jetbrains-mono')

describe('Типографика: подключение шрифтов', () => {
  test('шрифты не запрашиваются у Google Fonts', () => {
    const html = read('index.html')
    assert.doesNotMatch(html, /fonts\.googleapis\.com|fonts\.gstatic\.com/)
  })

  test('main.tsx подключает самостоятельно размещённые шрифты', () => {
    const main = read('src/main.tsx')
    assert.match(main, /import '@fontsource-variable\/manrope'/)
    assert.match(main, /import '@fontsource-variable\/jetbrains-mono'/)
  })

  test('семейства в теме совпадают с объявленными в пакетах', () => {
    assert.equal(firstFamily(themeVar('font-sans')), manrope.family)
    assert.equal(firstFamily(themeVar('font-display')), manrope.family)
    assert.equal(firstFamily(themeVar('font-mono')), mono.family)
  })

  test('графики и печатная версия используют фирменный шрифт', () => {
    const chart = read('src/components/chart-setup.ts').match(/CHART_FONT_FAMILY\s*=\s*"([^"]+)"/)
    assert.ok(chart, 'не найден CHART_FONT_FAMILY')
    assert.equal(firstFamily(chart[1]), manrope.family)
    const size = read('src/components/chart-setup.ts').match(/CHART_FONT_SIZE\s*=\s*(\d+)/)
    assert.ok(size && Number(size[1]) >= 11, 'подписи графиков не меньше 11px')

    const body = buildReportHtml({ title: 'Тест', sections: [] }).match(/body\s*\{[^}]*font-family:\s*([^;]+);/)
    assert.ok(body, 'в печатной версии не задан font-family')
    assert.equal(firstFamily(body[1]), manrope.family)
  })

  test('файлы для preload есть в пакете и упомянуты в vite.config.ts', () => {
    const files = fs.readdirSync(path.join(root, 'node_modules/@fontsource-variable/manrope/files'))
    const vite = read('vite.config.ts')
    for (const subset of ['cyrillic', 'latin']) {
      const base = `manrope-${subset}-wght-normal`
      assert.ok(files.includes(`${base}.woff2`), `в пакете нет ${base}.woff2`)
      assert.ok(vite.includes(base), `vite.config.ts не делает preload для ${base}`)
    }
  })
})

describe('Типографика: начертания и кегль', () => {
  const WEIGHTS: Record<string, number> = {
    thin: 100,
    extralight: 200,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  }
  // общий диапазон обоих вариативных шрифтов: вне его браузер синтезирует или подменяет начертание
  const minWeight = Math.max(manrope.min, mono.min)
  const maxWeight = Math.min(manrope.max, mono.max)

  test(`начертания в пределах осей шрифтов (${minWeight}–${maxWeight})`, () => {
    const bad: string[] = []
    for (const { file, text } of SOURCES) {
      for (const m of text.matchAll(/\bfont-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)\b/g)) {
        const w = WEIGHTS[m[1]]
        if (w < minWeight || w > maxWeight) bad.push(`${file}: font-${m[1]} (${w})`)
      }
      for (const m of text.matchAll(/\bfont-\[(\d+)\]|fontWeight:\s*(\d+)/g)) {
        const w = Number(m[1] ?? m[2])
        if (w < minWeight || w > maxWeight) bad.push(`${file}: ${m[0]}`)
      }
    }
    for (const m of INDEX_CSS.matchAll(/font-weight:\s*(\d+)/g)) {
      const w = Number(m[1])
      if (w < minWeight || w > maxWeight) bad.push(`src/index.css: ${m[0]}`)
    }
    assert.deepEqual(bad, [])
  })

  test('кегль интерфейса — целые px не меньше 11', () => {
    const bad: string[] = []
    for (const { file, text } of SOURCES) {
      for (const m of text.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)) {
        const px = Number(m[1])
        if (px < 11 || !Number.isInteger(px)) bad.push(`${file}: ${m[0]}`)
      }
      for (const m of text.matchAll(/text-\[length:clamp\((\d+(?:\.\d+)?)px/g)) {
        if (Number(m[1]) < 11) bad.push(`${file}: ${m[0]}`)
      }
      for (const m of text.matchAll(/font:\s*\{[^}]*size:\s*(\d+(?:\.\d+)?)/g)) {
        if (Number(m[1]) < 11) bad.push(`${file}: ${m[0]}`)
      }
    }
    for (const m of stripPrintMedia(INDEX_CSS).matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)) {
      if (Number(m[1]) < 11) bad.push(`src/index.css: ${m[0]}`)
    }
    assert.deepEqual(bad, [])
  })

  test('печатная версия: кегль не меньше 11px и встраивает @font-face', () => {
    const face = "@font-face { font-family: 'Manrope Variable'; src: url(\"https://example.test/m.woff2\"); }"
    const html = buildReportHtml(
      { title: 'Расчёт', subtitle: 'H9', sections: [{ title: 'Итог', rows: [{ label: 'Платёж', value: '1 ₽' }] }] },
      face,
    )
    assert.ok(html.includes(face), '@font-face не попал в документ')
    const sizes = [...html.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]))
    assert.ok(sizes.length > 0)
    for (const px of sizes) assert.ok(px >= 11 && Number.isInteger(px), `кегль ${px}px`)
  })
})

describe('Печатная версия: открытие окна', () => {
  test('window.open вызывается без noopener, документ записывается, opener обрывается', () => {
    const written: string[] = []
    let features = ''
    const fakeWin = {
      opener: {} as unknown,
      document: {
        open: () => undefined,
        write: (html: string) => written.push(html),
        close: () => undefined,
      },
      setTimeout: () => 0,
      focus: () => undefined,
      print: () => undefined,
    }
    const g = globalThis as unknown as Record<string, unknown>
    const prevWindow = g.window
    const prevDocument = g.document
    g.window = {
      open: (_url: string, _target: string, f: string) => {
        features = f
        return fakeWin
      },
    }
    g.document = { styleSheets: [], baseURI: 'http://localhost/HavalGarage/' }
    try {
      const ok = openReport({ title: 'Расчёт кредита', sections: [] }, false)
      assert.equal(ok, true)
      // с noopener window.open() по спецификации возвращает null — печать не работала
      assert.doesNotMatch(features, /noopener|noreferrer/)
      assert.equal(fakeWin.opener, null)
      assert.equal(written.length, 1)
      assert.match(written[0], /<title>Расчёт кредита<\/title>/)
    } finally {
      g.window = prevWindow
      g.document = prevDocument
    }
  })

  test('заблокированное окно → false', () => {
    const g = globalThis as unknown as Record<string, unknown>
    const prevWindow = g.window
    const prevDocument = g.document
    g.window = { open: () => null }
    g.document = { styleSheets: [], baseURI: 'http://localhost/' }
    try {
      assert.equal(openReport({ title: 'x', sections: [] }, false), false)
    } finally {
      g.window = prevWindow
      g.document = prevDocument
    }
  })
})

describe('PDF: символы вне шрифта Roboto', () => {
  test('стрелки, галочка и узкий пробел заменяются, кириллица и ₽ — нет', () => {
    assert.equal(pdfSafeText('20 % → 30 %'), '20 % -> 30 %')
    assert.equal(pdfSafeText('← назад'), '<- назад')
    assert.equal(pdfSafeText('✓ есть'), '+ есть')
    assert.equal(pdfSafeText('1\u202F000\u00A0₽'), '1\u00A0000\u00A0₽')
    const plain = 'Бензин ≥ АИ-92, 2 099 000 ₽ · «Оптимум» — 1,5 л × 4'
    assert.equal(pdfSafeText(plain), plain)
  })

  test('buildDocDefinition прогоняет через замену все строки отчёта', () => {
    const doc = buildDocDefinition({
      title: 'План → покупка',
      subtitle: 'взнос ↑',
      sections: [{ title: 'Итог ✓', note: 'ставка ↓', rows: [{ label: 'Срок → 60', value: '1\u202F000 ₽' }] }],
      disclaimers: ['не оферта →'],
      sourceNote: '← источник',
    })
    const json = JSON.stringify(doc)
    assert.doesNotMatch(json, /[\u2190-\u2193\u2713\u25BE\u202F]/)
    assert.match(json, /План -> покупка/)
  })
})

describe('типографика текста: даты', () => {
  test('после fmtDate() не ставится точка — дата уже оканчивается на «г.»', () => {
    // Intl.DateTimeFormat('ru-RU', { year: 'numeric', month: 'long' }) → «9 октября 2026 г.»
    const offenders: string[] = []
    for (const file of walk('src', ['.ts', '.tsx'])) {
      const source = read(file)
      // JSX {fmtDate(...)}. и шаблонные строки ${fmtDate(...)}. — один шаблон на оба случая
      for (const m of source.matchAll(/\{fmtDate\([^}]*\)\}\./g)) {
        offenders.push(`${file}:${source.slice(0, m.index).split('\n').length}`)
      }
    }
    assert.deepEqual(offenders, [], 'получится «г..»')
  })
})
