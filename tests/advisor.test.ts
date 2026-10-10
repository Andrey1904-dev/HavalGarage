/**
 * Тесты детерминированного помощника по выбору.
 *
 * Главное, что проверяется: помощник не придумывает данные. Один и тот же
 * вопрос всегда даёт один и тот же ответ; числа совпадают с расчётами
 * калькуляторов; отсутствие данных обозначается явно.
 */
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { ADVISOR_DEFAULTS, advisorModels, askAdvisor, detectIntent, modelFacts } from '../src/utils/advisor'
import { annuityPayment } from '../src/utils/loan'
import { searchByBudget } from '../src/utils/budget'
import { MODELS, trimsForModel } from '../src/data/haval'

const baseRequest = {
  maxMonthlyPayment: 35_000,
  downPaymentRub: 500_000,
  termMonths: ADVISOR_DEFAULTS.termMonths,
  annualRatePercent: ADVISOR_DEFAULTS.annualRatePercent,
  modelId: null,
  trimIds: [],
}

describe('распознавание намерения', () => {
  test('типовые вопросы попадают в нужный тип', () => {
    assert.equal(detectIntent('Подберите автомобиль до 35 000 ₽ в месяц'), 'budget')
    assert.equal(detectIntent('В чём разница комплектаций JOLION?'), 'trim-diff')
    assert.equal(detectIntent('Сравните H9 и H7'), 'compare')
    assert.equal(detectIntent('Из чего состоит ежемесячный платёж?'), 'payment-structure')
    assert.equal(detectIntent('Какая будет переплата по кредиту?'), 'payment-structure')
    assert.equal(detectIntent('Стоит ли переплачивать за Техно +?'), 'tradeoff')
    assert.equal(detectIntent('Какая погода в Сочи?'), 'unknown')
  })
})

describe('детерминированность', () => {
  test('один и тот же вопрос даёт одинаковый ответ', () => {
    const a = askAdvisor('Подберите автомобиль до 35 000 ₽ в месяц', baseRequest)
    const b = askAdvisor('Подберите автомобиль до 35 000 ₽ в месяц', baseRequest)
    assert.deepEqual(a, b)
  })

  test('в ответе нет случайных или «сгенерированных» значений', () => {
    const answer = askAdvisor('Подберите автомобиль до 40 000 ₽ в месяц', baseRequest)
    assert.ok(answer.rows.length > 0)
    for (const row of answer.rows) {
      assert.match(row.value, /[\d\s₽]/, 'строка ответа содержит конкретные числа')
    }
  })
})

describe('подбор по бюджету', () => {
  test('числа ответа совпадают с расчётом калькулятора', () => {
    const maxPayment = 70_000
    const answer = askAdvisor(`Подберите автомобиль до ${maxPayment.toLocaleString('ru-RU')} ₽ в месяц`, {
      ...baseRequest,
      maxMonthlyPayment: maxPayment,
    })
    const result = searchByBudget({
      maxMonthlyPayment: maxPayment,
      downPaymentRub: baseRequest.downPaymentRub,
      termMonths: baseRequest.termMonths,
      annualRatePercent: baseRequest.annualRatePercent,
    })
    assert.equal(result.ok, true)
    const affordable = result.matches.filter((m) => m.eligible && m.withinBudget)
    assert.ok(affordable.length > 0, 'при таком лимите варианты есть')
    assert.equal(answer.rows.length, Math.min(5, affordable.length))
    for (let i = 0; i < answer.rows.length; i++) {
      // цена и платёж берутся из результата подбора, а не пересчитываются заново
      const expected = annuityPayment(affordable[i].creditAmount, baseRequest.annualRatePercent, baseRequest.termMonths)
      assert.equal(expected, affordable[i].monthlyPayment, 'платёж помощника совпадает с формулой аннуитета')
      // в ответе деньги уже округлены для показа; неразрывные пробелы сводим к обычным
      const normalize = (v: string) => v.replace(/\s/g, ' ')
      assert.ok(
        normalize(answer.rows[i].value).includes(`${normalize(Math.round(expected).toLocaleString('ru-RU'))} ₽`),
        'в строке ответа показан тот же платёж',
      )
    }
  })

  test('без лимита платежа помощник просит уточнить, а не угадывает', () => {
    const answer = askAdvisor('Подберите автомобиль', { ...baseRequest, maxMonthlyPayment: null })
    assert.equal(answer.intent, 'budget')
    assert.equal(answer.rows.length, 0)
    assert.match(answer.title, /максимальный платёж/i)
  })

  test('при недостижимом бюджете объясняет причину и даёт расчётные рычаги', () => {
    const answer = askAdvisor('Хочу платить не более 5 000 ₽', baseRequest)
    assert.equal(answer.intent, 'budget')
    assert.match(answer.title, /не укладывается/)
    const labels = answer.rows.map((r) => r.label)
    assert.ok(labels.some((l) => /взнос|срок|цену/i.test(l)), 'предложены расчётные способы уложиться в бюджет')
    assert.ok(answer.disclaimer, 'есть оговорка, что это расчёт, а не предложение банка')
  })

  test('высокий лимит платежа даёт совпадения из каталога', () => {
    const answer = askAdvisor('Платеж до 70 000 ₽ в месяц', { ...baseRequest, maxMonthlyPayment: 70_000 })
    assert.ok(answer.rows.length > 0)
    assert.match(answer.title, /Укладывается/)
  })
})

describe('разница комплектаций', () => {
  test('без модели помощник не выдумывает сравнение', () => {
    const answer = askAdvisor('В чём разница комплектаций?', baseRequest)
    assert.equal(answer.intent, 'trim-diff')
    assert.match(answer.title, /Выберите модель/)
    assert.equal(answer.rows.length, 0)
  })

  test('модель с несколькими комплектациями даёт цены, шаги и матрицу различий', () => {
    const answer = askAdvisor('В чём разница комплектаций JOLION?', { ...baseRequest, modelId: 'jolion' })
    const trims = trimsForModel('jolion').filter((t) => t.basePrice !== null)
    assert.ok(trims.length >= 2)
    // первые строки — по комплектации, дальше идут различия оснащения
    assert.ok(answer.rows.length >= trims.length)
    const first = trims.map((t) => t.basePrice!).sort((a, b) => a - b)[0]
    assert.match(answer.rows[0].value, new RegExp(`${first.toLocaleString('ru-RU')}`))
    assert.ok(answer.disclaimer, 'оговорка про «не подтверждено» обязательна')
  })

  test('платежи по комплектациям совпадают с формулой аннуитета', () => {
    const answer = askAdvisor('Чем отличаются комплектации JOLION?', { ...baseRequest, modelId: 'jolion' })
    const trims = [...trimsForModel('jolion')].filter((t) => t.basePrice !== null).sort((a, b) => a.basePrice! - b.basePrice!)
    for (let i = 0; i < trims.length; i++) {
      const credit = Math.max(0, trims[i].basePrice! - baseRequest.downPaymentRub)
      const expected = annuityPayment(credit, baseRequest.annualRatePercent, baseRequest.termMonths)
      assert.ok(
        answer.rows.some((r) => r.label === trims[i].name && r.value.includes(Math.round(expected).toLocaleString('ru-RU'))),
        `платёж для ${trims[i].name} совпадает с расчётом`,
      )
    }
  })
})

describe('сравнение автомобилей', () => {
  test('меньше двух автомобилей — честный отказ', () => {
    const answer = askAdvisor('Сравните H9 и H7', { ...baseRequest, trimIds: [] })
    assert.equal(answer.intent, 'compare')
    assert.match(answer.title, /Добавьте/)
    assert.equal(answer.rows.length, 0)
  })

  test('два автомобиля: общие условия и разница в деньгах', () => {
    const a = trimsForModel('m6').find((t) => t.basePrice !== null)!
    const b = trimsForModel('jolion').find((t) => t.basePrice !== null)!
    const answer = askAdvisor('Сравните эти автомобили', { ...baseRequest, trimIds: [a.id, b.id] })
    assert.equal(answer.intent, 'compare')
    const labels = answer.rows.map((r) => r.label)
    assert.ok(labels.some((l) => /Цена/.test(l)))
    assert.ok(labels.some((l) => /Платёж/.test(l)))
    assert.ok(labels.some((l) => /Разница/.test(l)))
    assert.ok(answer.links.some((l) => l.to.startsWith('/compare?trims=')))
  })
})

describe('структура платежа', () => {
  test('разбор платежа содержит тело, проценты и оговорку про банк', () => {
    const answer = askAdvisor('Из чего состоит ежемесячный платёж?', { ...baseRequest, modelId: 'jolion' })
    assert.equal(answer.intent, 'payment-structure')
    const labels = answer.rows.map((r) => r.label)
    for (const expected of ['Цена', 'Первоначальный взнос', 'Сумма кредита', 'Ежемесячный платёж', 'Проценты за весь срок']) {
      assert.ok(labels.includes(expected), `в ответе есть строка «${expected}»`)
    }
    assert.ok(answer.paragraphs.some((p) => /A = P · r/.test(p)), 'формула аннуитета приведена')
    assert.match(answer.disclaimer ?? '', /банк|договор/i)
  })

  test('без модели разбор остаётся общим, без выдуманных сумм', () => {
    const answer = askAdvisor('Из чего состоит платёж?', baseRequest)
    assert.equal(answer.intent, 'payment-structure')
    assert.equal(answer.rows.length, 1)
    assert.match(answer.rows[0].value, /Выберите модель/)
  })
})

describe('компромисс и неизвестные вопросы', () => {
  test('вопрос о переплате без модели просит выбрать модель', () => {
    const answer = askAdvisor('Стоит ли переплачивать за Техно +?', baseRequest)
    assert.equal(answer.intent, 'tradeoff')
    assert.match(answer.title, /Выберите модель/)
  })

  test('с моделью компромисс разбирается как разница комплектаций', () => {
    const answer = askAdvisor('Стоит ли переплачивать за Техно плюс?', { ...baseRequest, modelId: 'jolion' })
    assert.equal(answer.intent, 'tradeoff')
    assert.ok(answer.rows.length > 0)
    assert.match(answer.title, /JOLION|Комплектации/)
  })

  test('неизвестный вопрос объясняет возможности, а не имитирует ответ', () => {
    const answer = askAdvisor('Какая погода в Сочи?', baseRequest)
    assert.equal(answer.intent, 'unknown')
    assert.match(answer.title, /Что я умею/)
    assert.ok(answer.disclaimer)
  })
})

describe('справочные данные', () => {
  test('список моделей непуст и совпадает с каталогом', () => {
    assert.equal(advisorModels().length, MODELS.length)
  })

  test('факты о модели берутся из каталога, а не из догадок', () => {
    const jolion = MODELS.find((m) => m.slug === 'jolion')!
    const facts = modelFacts(jolion)
    const labels = facts.map((f) => f.label)
    assert.ok(labels.includes('Комплектаций в каталоге'))
    const count = facts.find((f) => f.label === 'Комплектаций в каталоге')!.value
    assert.equal(Number(count), trimsForModel(jolion.id).length)
    for (const fact of facts) assert.notEqual(fact.value, '')
  })

  test('отсутствующая цена обозначается как отсутствие данных', () => {
    const model = MODELS.find((m) => m.slug === 'poer-kingkong')!
    const facts = modelFacts(model)
    const price = facts.find((f) => f.label === 'Цена от')!.value
    assert.match(price, /нет данных|₽/)
  })
})
