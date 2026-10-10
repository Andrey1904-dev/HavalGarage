/**
 * Тесты интерфейса в jsdom.
 *
 * Проверяется то, что нельзя проверить модульными тестами: состояние, которое
 * живёт в URL и localStorage, мобильное меню и работа помощника.
 *
 * Порядок важен: jsdom поднимается до первого импорта React, поэтому модули
 * загружаются динамически (esbuild превращает dynamic import в require, порядок
 * сохраняется).
 */
import { test, describe, before, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/HavalGarage/',
  pretendToBeVisual: true,
})

const g = globalThis as unknown as Record<string, unknown>
g.window = dom.window
g.document = dom.window.document
// navigator в Node — геттер, поэтому переопределяем его через defineProperty
Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
  writable: true,
})
g.HTMLElement = dom.window.HTMLElement
g.HTMLInputElement = dom.window.HTMLInputElement
g.Element = dom.window.Element
g.Node = dom.window.Node
g.Event = dom.window.Event
g.MouseEvent = dom.window.MouseEvent
g.KeyboardEvent = dom.window.KeyboardEvent
g.getComputedStyle = dom.window.getComputedStyle
g.requestAnimationFrame = dom.window.requestAnimationFrame
g.cancelAnimationFrame = dom.window.cancelAnimationFrame
g.localStorage = dom.window.localStorage
g.IS_REACT_ACT_ENVIRONMENT = true

const React = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const { act, cleanup, fireEvent } = await import('@testing-library/react')
const { SavedProvider, useSaved } = await import('../src/context/SavedContext')
const { CompareProvider, useCompare } = await import('../src/context/CompareContext')
const { CalculatorProvider } = await import('../src/context/CalculatorContext')
const Layout = (await import('../src/components/Layout')).default
const ComparePage = (await import('../src/pages/ComparePage')).default
const AdvisorPage = (await import('../src/pages/AdvisorPage')).default
const { TRIMS, getModel } = await import('../src/data/haval')

type Root = ReturnType<typeof createRoot>

interface Mounted {
  container: HTMLElement
  root: Root
  unmount: () => void
}

const mounted: Mounted[] = []

function mount(ui: React.ReactElement, path = '/'): Mounted {
  const container = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(
      React.createElement(
        MemoryRouter,
        { initialEntries: [path] },
        React.createElement(
          SavedProvider,
          null,
          React.createElement(
            CompareProvider,
            null,
            React.createElement(CalculatorProvider, null, ui),
          ),
        ),
      ),
    )
  })
  const handle: Mounted = {
    container,
    root,
    unmount: () => {
      act(() => root.unmount())
      container.remove()
    },
  }
  mounted.push(handle)
  return handle
}

const text = (el: HTMLElement) => (el.textContent ?? '').replace(/\s+/g, ' ').trim()

const click = (el: HTMLElement) => {
  act(() => {
    fireEvent.click(el)
  })
}

const type = (el: HTMLTextAreaElement, value: string) => {
  act(() => {
    fireEvent.change(el, { target: { value } })
  })
}

const buttonByText = (root: HTMLElement, label: string): HTMLElement => {
  const found = Array.from(root.querySelectorAll('button')).find((b) => text(b as HTMLElement).includes(label))
  assert.ok(found, `кнопка «${label}» найдена`)
  return found as HTMLElement
}

const buttonByLabel = (root: HTMLElement, label: string): HTMLElement => {
  const found = Array.from(root.querySelectorAll('button')).find((b) => b.getAttribute('aria-label') === label)
  assert.ok(found, `кнопка с aria-label «${label}» найдена`)
  return found as HTMLElement
}

before(() => {
  // jsdom не реализует matchMedia, а часть компонентов его вызывает
  dom.window.matchMedia =
    dom.window.matchMedia ??
    ((query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList)
  ;(g as { matchMedia?: unknown }).matchMedia = dom.window.matchMedia
})

beforeEach(() => {
  while (mounted.length > 0) mounted.pop()?.unmount()
  cleanup()
  dom.window.localStorage.clear()
  dom.window.document.body.innerHTML = ''
})

/** Компонент-пробник: показывает состояние избранного и управляет им */
function FavoritesProbe() {
  const { favorites, toggleFavorite, isFavorite } = useSaved()
  const trim = TRIMS[0]
  const item = { kind: 'trim' as const, modelId: trim.modelId, trimId: trim.id }
  return React.createElement(
    'div',
    null,
    React.createElement('span', { 'data-testid': 'count' }, String(favorites.length)),
    React.createElement(
      'button',
      { 'data-testid': 'toggle', onClick: () => toggleFavorite(item) },
      'toggle',
    ),
    React.createElement(
      'span',
      { 'data-testid': 'flag' },
      String(isFavorite(trim.modelId, trim.id)),
    ),
  )
}

describe('избранное: сохранение между перезагрузками', () => {
  test('отметка попадает в localStorage и восстанавливается после перемонтирования', () => {
    const first = mount(React.createElement(FavoritesProbe))
    assert.equal(first.container.querySelector('[data-testid="count"]')?.textContent, '0')

    click(first.container.querySelector('[data-testid="toggle"]') as HTMLElement)

    assert.equal(first.container.querySelector('[data-testid="count"]')?.textContent, '1')
    assert.equal(first.container.querySelector('[data-testid="flag"]')?.textContent, 'true')
    assert.ok(dom.window.localStorage.getItem('haval-garage.favorites.v1'), 'состояние записано в localStorage')

    first.unmount()

    // новое монтирование — как перезагрузка страницы
    const second = mount(React.createElement(FavoritesProbe))
    assert.equal(second.container.querySelector('[data-testid="count"]')?.textContent, '1')
  })

  test('повторное нажатие снимает отметку', () => {
    const handle = mount(React.createElement(FavoritesProbe))
    const button = handle.container.querySelector('[data-testid="toggle"]') as HTMLElement
    click(button)
    click(button)
    assert.equal(handle.container.querySelector('[data-testid="count"]')?.textContent, '0')
  })
})

describe('сравнение из URL', () => {
  test('комплектации из query-параметра попадают в состояние сравнения', () => {
    const priced = TRIMS.filter((t) => t.basePrice !== null)
    const a = priced[0]
    const b = priced.find((t) => t.modelId !== a.modelId) ?? priced[1]

    function CompareProbe() {
      const { trimIds } = useCompare()
      return React.createElement('span', { 'data-testid': 'ids' }, trimIds.join(','))
    }

    const handle = mount(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(ComparePage),
        React.createElement(CompareProbe),
      ),
      `/compare?trims=${a.id},${b.id}`,
    )

    assert.equal(handle.container.querySelector('[data-testid="ids"]')?.textContent, `${a.id},${b.id}`)
  })

  test('несуществующая комплектация в URL игнорируется', () => {
    function CompareProbe() {
      const { trimIds } = useCompare()
      return React.createElement('span', { 'data-testid': 'ids' }, trimIds.join(','))
    }
    const handle = mount(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(ComparePage),
        React.createElement(CompareProbe),
      ),
      '/compare?trims=нет-такой-комплектации',
    )
    assert.equal(handle.container.querySelector('[data-testid="ids"]')?.textContent, '')
  })
})

describe('мобильное меню', () => {
  test('бургер открывает навигацию и закрывается повторным нажатием', () => {
    const handle = mount(React.createElement(Layout), '/')
    const mobileNav = () => handle.container.querySelector('nav[aria-label="Мобильная навигация"]')

    assert.equal(mobileNav(), null, 'до открытия мобильного меню в разметке нет')

    click(buttonByLabel(handle.container, 'Открыть меню'))
    const nav = mobileNav()
    assert.ok(nav, 'мобильное меню отрисовано')
    assert.ok(text(nav as HTMLElement).includes('Кредитные программы'), 'в меню есть пункт «Кредитные программы»')
    assert.equal(
      buttonByLabel(handle.container, 'Закрыть меню').getAttribute('aria-expanded'),
      'true',
    )

    click(buttonByLabel(handle.container, 'Закрыть меню'))
    assert.equal(mobileNav(), null, 'меню закрылось')
  })
})

describe('помощник по выбору', () => {
  test('вопрос о бюджете даёт ответ с расчётными числами', () => {
    const handle = mount(React.createElement(AdvisorPage), '/advisor?model=m6&payment=70000')
    type(handle.container.querySelector('textarea') as HTMLTextAreaElement, 'Подберите автомобиль до 70 000 ₽ в месяц')
    click(buttonByText(handle.container, 'Спросить'))

    const answer = text(handle.container)
    assert.ok(/Укладывается в платёж/.test(answer), 'помощник дал подбор по бюджету')
    assert.ok(/₽/.test(answer), 'в ответе есть деньги')
    assert.ok(
      /Выгоды по трейд-ин и спецпрограммам в этот подсчёт не входят/.test(answer),
      'подбор по бюджету явно отделён от выгод трейд-ина и спецпрограмм',
    )
  })

  test('вопрос о разнице комплектаций без модели просит выбрать модель', () => {
    const handle = mount(React.createElement(AdvisorPage), '/advisor')
    type(handle.container.querySelector('textarea') as HTMLTextAreaElement, 'В чём разница комплектаций?')
    click(buttonByText(handle.container, 'Спросить'))

    assert.ok(/Выберите модель/.test(text(handle.container)), 'помощник не угадывает модель')
  })

  test('неизвестный вопрос объясняет возможности, а не имитирует ответ', () => {
    const handle = mount(React.createElement(AdvisorPage), '/advisor')
    type(handle.container.querySelector('textarea') as HTMLTextAreaElement, 'Какая погода в Сочи?')
    click(buttonByText(handle.container, 'Спросить'))

    const answer = text(handle.container)
    assert.ok(/Что я умею/.test(answer))
    assert.ok(/не языковая модель|детерминирован/i.test(answer), 'прямо сказано, что это не языковая модель')
  })

  test('справка по выбранной модели берётся из каталога', () => {
    const handle = mount(React.createElement(AdvisorPage), '/advisor?model=m6')
    const answer = text(handle.container)
    const m6 = getModel('m6')
    assert.ok(m6, 'модель найдена')
    assert.ok(answer.includes('Справка по HAVAL M6'), 'шапка справки показывает модель')
    assert.ok(/Комплектаций в каталоге/.test(answer))
  })
})
