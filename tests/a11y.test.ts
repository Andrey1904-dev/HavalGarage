/**
 * Статические регрессионные тесты доступности (WCAG 2.2 AA).
 *
 * Аудит axe-core по всем разделам нашёл и исправил ошибки, которые легко
 * вернуть случайной правкой. Тесты ниже проверяют исходники, а не сборку:
 *  — контраст: цвета-токены проходят 4.5:1 на всех поверхностях интерфейса,
 *    старый «бледный» #747B85 не вернулся, белый текст не стоит на #FF334B;
 *  — иконкам из icons.tsx не передают aria-* (обёртки их молча отбрасывают
 *    и всегда ставят aria-hidden — ячейки матрицы оснащения были «пустыми»);
 *  — aria-label не ставится на элементы без роли (ARIA 1.2 запрещает
 *    именовать generic-элементы, скринридеры такие подписи игнорируют);
 *  — липкая шапка не закрывает элемент в фокусе (scroll-padding-top).
 */
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

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

const SOURCES = walk('src', ['.ts', '.tsx', '.css'])
const TSX = SOURCES.filter((f) => f.endsWith('.tsx'))

/* ----------------------------- контраст ----------------------------- */

function luminance(hex: string): number {
  const v = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255)
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** Поверхности, на которых встречается мелкий текст (фон → карточки → поля) */
const SURFACES = ['#0B0C0E', '#0E1013', '#111316', '#181B1F', '#20242A']

function cssToken(name: string): string {
  const match = read('src/index.css').match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))
  assert.ok(match, `токен --${name} объявлен в index.css`)
  return match[1]
}

describe('доступность: контраст цветов', () => {
  test('вторичный (faint) и основной текст проходят 4.5:1 на всех поверхностях', () => {
    for (const token of ['color-faint', 'color-ink']) {
      const color = cssToken(token)
      for (const surface of SURFACES) {
        const ratio = contrast(color, surface)
        assert.ok(ratio >= 4.5, `--${token} ${color} на ${surface}: ${ratio.toFixed(2)} < 4.5`)
      }
    }
  })

  test('белый текст на кнопках и бейджах: #E11D38 и hover #C8172F проходят 4.5:1', () => {
    for (const token of ['color-sport-strong', 'color-sport-strong-hover']) {
      const color = cssToken(token)
      const ratio = contrast('#FFFFFF', color)
      assert.ok(ratio >= 4.5, `белый на --${token} ${color}: ${ratio.toFixed(2)}`)
    }
    // и те же значения реально используются основной кнопкой
    const ui = read('src/components/ui.tsx')
    assert.match(ui, /bg-\[#E11D38\] hover:bg-\[#C8172F\] text-white/)
  })

  test('старый бледный цвет #747B85 (3.1–4.6:1) не вернулся в исходники', () => {
    const offenders = SOURCES.filter((f) => /#747b85/i.test(read(f)))
    assert.deepEqual(offenders, [], `найден #747B85: ${offenders.join(', ')}`)
  })

  test('нет белого текста на сплошном #FF334B (3.60:1)', () => {
    const offenders: string[] = []
    for (const file of TSX) {
      // строковые литералы с классами: '…', "…", `…`
      for (const literal of read(file).match(/(['"`])[^'"`\n]*\1/g) ?? []) {
        if (/bg-\[#FF334B\](?!\/)/i.test(literal) && /\btext-white\b/.test(literal)) {
          offenders.push(`${file}: ${literal.slice(0, 80)}`)
        }
      }
    }
    assert.deepEqual(offenders, [])
  })
})

/* ------------------------------ ARIA в JSX ------------------------------ */

interface JsxHit {
  file: string
  line: number
  tag: string
  attrs: string[]
}

function jsxElements(): JsxHit[] {
  const hits: JsxHit[] = []
  for (const file of TSX) {
    const sf = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const visit = (node: ts.Node) => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const attrs = node.attributes.properties.filter(ts.isJsxAttribute).map((a) => a.name.getText(sf))
        hits.push({
          file,
          line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
          tag: node.tagName.getText(sf),
          attrs,
        })
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
  }
  return hits
}

const ELEMENTS = jsxElements()

function exportedIcons(): Set<string> {
  const names = new Set<string>()
  for (const match of read('src/components/icons.tsx').matchAll(/export const (\w+Icon)\b/g)) names.add(match[1])
  return names
}

describe('доступность: ARIA-атрибуты', () => {
  test('иконкам из icons.tsx не передают aria-label/role/title — обёртки их отбрасывают', () => {
    const icons = exportedIcons()
    assert.ok(icons.size > 10, 'иконки найдены')
    const offenders = ELEMENTS.filter(
      (el) => icons.has(el.tag) && el.attrs.some((a) => /^aria-(label|labelledby|describedby)$|^role$|^title$/.test(a)),
    ).map((el) => `${el.file}:${el.line} <${el.tag} ${el.attrs.join(' ')}>`)
    assert.deepEqual(offenders, [], 'смысл иконки передавайте текстом (sr-only) рядом с ней')
  })

  test('aria-label не ставится на span/div/p без роли (generic-элементы)', () => {
    const generic = new Set(['span', 'div', 'p', 'li', 'strong', 'em', 'small', 'b', 'i'])
    const offenders = ELEMENTS.filter(
      (el) =>
        generic.has(el.tag) &&
        el.attrs.some((a) => a === 'aria-label' || a === 'aria-labelledby') &&
        !el.attrs.includes('role'),
    ).map((el) => `${el.file}:${el.line} <${el.tag}>`)
    assert.deepEqual(offenders, [], 'используйте видимый или sr-only текст вместо aria-label')
  })

  test('у каждого Select из ui.tsx есть подпись: label, aria-label или aria-labelledby', () => {
    const offenders = ELEMENTS.filter(
      (el) => el.tag === 'Select' && !el.attrs.some((a) => a === 'label' || a === 'aria-label' || a === 'aria-labelledby'),
    ).map((el) => `${el.file}:${el.line}`)
    assert.deepEqual(offenders, [])
  })
})

/* ------------------------------ фокус ------------------------------ */

describe('доступность: фокус', () => {
  test('липкая шапка не закрывает элемент в фокусе: у html есть scroll-padding-top', () => {
    const css = read('src/index.css')
    const html = css.match(/@layer base\s*{\s*html\s*{([^}]*)}/)
    assert.ok(html, 'правило html в @layer base найдено')
    const padding = html[1].match(/scroll-padding-top:\s*([\d.]+)rem/)
    assert.ok(padding, 'scroll-padding-top задан в rem')
    // шапка — 65px; отступ должен быть не меньше
    assert.ok(Number(padding[1]) * 16 >= 65, `scroll-padding-top ${padding[1]}rem меньше высоты шапки`)
  })

  test('глобальная обводка :focus-visible не отключена', () => {
    const css = read('src/index.css')
    assert.match(css, /:focus-visible\s*{\s*outline:\s*2px solid/)
  })
})
