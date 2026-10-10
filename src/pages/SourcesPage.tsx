import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Button,
  Callout,
  Card,
  DataTable,
  Disclosure,
  SectionTitle,
  StatTile,
  TableCell,
  Tag,
} from '../components/ui'
import { ArrowUpRightIcon, DatabaseIcon, DocIcon, HistoryIcon } from '../components/icons'
import {
  CATALOG_FIXED_AT,
  DEALER_URL,
  HAVAL_MODELS_URL,
  HAVAL_ONLINE_STOCK_URL,
  HAVAL_PRICE_LISTS_URL,
  MODELS,
  OFFICIAL_PRICE_COUNT,
  PRICE_HISTORY,
  PRICE_STALE_AFTER_DAYS,
  PRICES,
  UNVERIFIED_PRICES,
  catalogAgeDays,
  isCatalogStale,
  lastSuccessfulCheck,
  todayIso,
  trimsForModel,
} from '../data/haval'
import { fmtDate, fmtMoney } from '../utils/format'
import { hasAnalyticsConsent, recentEvents, setAnalyticsConsent } from '../utils/analytics'
import { useSeo } from '../utils/seo'
import { track } from '../utils/analytics'

/**
 * Источники данных и актуальность: первоисточники, даты проверки, типы цен,
 * неподтверждённые данные, история обновлений и настройки приватности.
 */
export default function SourcesPage() {
  const [consent, setConsent] = useState(hasAnalyticsConsent())

  useSeo({
    title: 'Источники данных и актуальность цен | HAVAL Гараж',
    description:
      'Официальные прайс-листы и каталоги haval.ru как первоисточник цен и характеристик HAVAL: даты проверки, ' +
      'типы цен, неподтверждённые данные, история обновлений и политика приватности.',
    path: '/sources',
  })

  const priceCounts = MODELS.map((m) => ({
    model: m,
    trims: trimsForModel(m.id).filter((t) => t.basePrice !== null).length,
  }))
  const totalTrims = priceCounts.reduce((s, p) => s + p.trims, 0)
  const unverified = UNVERIFIED_PRICES
  const realToday = todayIso()
  const catalogStale = isCatalogStale(realToday)
  const catalogAge = catalogAgeDays(CATALOG_FIXED_AT, realToday)

  return (
    <div className="animate-page-enter flex flex-col gap-4">
      <header className="flex flex-col gap-1.5">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#E4002B]">Прозрачность данных</p>
        <h1 className="font-display-num text-[26px] font-bold uppercase tracking-wide text-[#F3F4F4] sm:text-[32px]">
          Источники данных и актуальность
        </h1>
        <p className="max-w-2xl text-[12.5px] leading-relaxed text-[#A9AFB7]">
          HavalGarage — независимый информационный сервис. Единственный первоисточник цен, комплектаций и характеристик —
          официальные каталоги и прайс-листы производителя. Данные дилера используются как вторичные и помечаются.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatTile label="Проверено" value={fmtDate(CATALOG_FIXED_AT)} tone="accent" />
        <StatTile label="Официальных цен" value={OFFICIAL_PRICE_COUNT} hint="из прайс-листов производителя" />
        <StatTile label="Комплектаций с ценой" value={totalTrims} hint="текущие модельные годы" />
        <StatTile
          label="Требуют подтверждения"
          value={unverified.length}
          tone={unverified.length > 0 ? 'warn' : 'success'}
          hint="нет даты действия или источник — тизер"
        />
      </div>

      {catalogStale && (
        <Callout tone="warn" title={`Снимку каталога ${catalogAge ?? '—'} дн. — требуется повторная проверка`}>
          Прошло больше {PRICE_STALE_AFTER_DAYS} дн. с фиксации данных ({fmtDate(CATALOG_FIXED_AT)}). Цены, комплектации и
          программы могли измениться: сверяйтесь с официальным прайс-листом перед решением. Реального времени здесь нет и
          быть не может — каталог обновляется скриптами и ручной проверкой.
        </Callout>
      )}

      {/* ---------------- Первоисточники ---------------- */}
      <SectionTitle tip="Каждая цена в приложении связана со ссылкой на PDF первоисточника и датой проверки. Откройте документ, чтобы сверить значение.">
        Официальные прайс-листы по моделям
      </SectionTitle>
      <DataTable head={['Модель', 'Комплектаций с ценой', 'Прайс-лист (PDF)', 'Официальный каталог', 'Проверено']}>
        {priceCounts.map(({ model, trims }) => (
          <tr key={model.id}>
            <TableCell sticky>
              <Link to={`/models/${model.slug}`} className="hover:text-[#E4002B]">
                {model.name}
              </Link>
              <span className="block text-[10.5px] font-normal text-[#A9AFB7]">{model.bodyType}</span>
            </TableCell>
            <TableCell>{trims > 0 ? trims : <Tag tone="warn">нет данных</Tag>}</TableCell>
            <TableCell>
              {model.priceListUrl ? (
                <SourceLink href={model.priceListUrl} label="открыть прайс-лист" />
              ) : (
                <span className="text-[#F5A623]">не опубликован</span>
              )}
            </TableCell>
            <TableCell>
              {model.catalogueUrl ? <SourceLink href={model.catalogueUrl} label="каталог (PDF)" /> : '—'}
            </TableCell>
            <TableCell>{fmtDate(CATALOG_FIXED_AT)}</TableCell>
          </tr>
        ))}
      </DataTable>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => openOfficial(HAVAL_PRICE_LISTS_URL, 'catalogues')}>
          <DocIcon className="h-4 w-4" /> Каталоги и прайс-листы haval.ru
        </Button>
        <Button type="button" variant="ghost" onClick={() => openOfficial(HAVAL_MODELS_URL, 'models')}>
          Модельный ряд haval.ru
        </Button>
        <Button type="button" variant="ghost" onClick={() => openOfficial(HAVAL_ONLINE_STOCK_URL, 'stock')}>
          Автомобили в наличии
        </Button>
        <Button type="button" variant="ghost" onClick={() => openOfficial(DEALER_URL, 'dealer')}>
          Дилер АГАТ (вторичный источник)
        </Button>
      </div>

      {/* ---------------- Типы цен ---------------- */}
      <SectionTitle tip="Цены разных типов не смешиваются и не вычитаются автоматически: выгода применяется только если пользователь подтверждает условия.">
        Типы цен в каталоге
      </SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <PriceTypeCard
          title="МЦП — рекомендованная цена"
          text="Максимальная цена перепродажи из официального прайс-листа. Базовая цена комплектации; не является публичной офертой."
          count={PRICES.filter((p) => p.priceType === 'msrp').length}
        />
        <PriceTypeCard
          title="Цена с выгодой"
          text="Цена при подтверждённой специальной выгоде (например, прямая скидка дилера). Условия получения хранятся вместе с ценой."
          count={PRICES.filter((p) => p.priceType === 'with-benefit').length}
        />
        <PriceTypeCard
          title="Цена при трейд-ин"
          text="Цена при сдаче автомобиля HAVAL или Great Wall в трейд-ин. Выгода применяется только после подтверждения условий программы."
          count={PRICES.filter((p) => p.priceType === 'trade-in').length}
        />
        <PriceTypeCard
          title="Цена автомобиля в наличии"
          text="Цена конкретной машины из наличия дилера. Раздел условный: официальный онлайн-склад не отдаёт данные для надёжной проверки."
          count={PRICES.filter((p) => p.priceType === 'stock').length}
        />
        <PriceTypeCard
          title="Цена по кредитной программе"
          text="Цена, доступная при оформлении кредитной программы. Хранится отдельно от базовой и не подставляется в расчёт автоматически."
          count={PRICES.filter((p) => p.priceType === 'credit').length}
        />
        <PriceTypeCard
          title="Тизер без комплектации"
          text="Цена «от» из тизера, где комплектация не раскрыта. Помечается предупреждением «актуальность подтвердите у дилера»."
          count={PRICES.filter((p) => p.priceType === 'teaser').length}
          warn
        />
      </div>

      {/* ---------------- Неподтверждённые данные ---------------- */}
      <SectionTitle tip="Если официальный документ не раскрывает значение, поле остаётся пустым и показывается как «нет данных». Агрегаторы, форумы и объявления не используются.">
        Что осталось неподтверждённым
      </SectionTitle>
      <Card className="flex flex-col gap-2.5">
        <ul className="flex list-disc flex-col gap-1.5 pl-4 text-[12px] leading-relaxed text-[#A9AFB7]">
          <li>
            <strong className="text-[#F3F4F4]">GWM POER KINGKONG</strong> — отсутствует в официальном каталоге haval.ru,
            прайс-лист не опубликован. Цена «от {fmtMoney(3_099_000)}» известна только из тизера дилера, комплектация не
            раскрыта, характеристики не заполнены.
          </li>
          <li>
            <strong className="text-[#F3F4F4]">HAVAL H7</strong> — рабочий объём двигателя и размер шин в прайс-листе не
            указаны; расход опубликован только для смешанного цикла.
          </li>
          <li>
            <strong className="text-[#F3F4F4]">Даты окончания акций</strong> — официальные документы публикуют только
            «действует с»; поле «действует до» остаётся пустым, статус предложения помечен как требующий проверки.
          </li>
          <li>
            <strong className="text-[#F3F4F4]">Стоимость КАСКО, ОСАГО, ТО и транспортного налога</strong> — не
            рассчитывается по выдуманным тарифам: в калькуляторе стоимости владения эти поля заполняет пользователь.
          </li>
          <li>
            <strong className="text-[#F3F4F4]">Остатки автомобилей, VIN и цвета конкретных машин</strong> — официальный
            онлайн-склад отдаёт данные только через клиентское приложение, поэтому раздел «В наличии» условный.
          </li>
          <li>
            <strong className="text-[#F3F4F4]">Индивидуальные условия банка</strong> — ставки и одобрение определяются
            банком; расчёт предварительный и не выдаётся за точный.
          </li>
          <li>
            <strong className="text-[#F3F4F4]">Расхождение тизера дилера и прайс-листа</strong> — тизер «DARGO X от
            3 199 000 ₽» не совпадает с официальными 3 499 000 ₽ (Оптимум 2.0T 4WD 2025 м.г.); в приложении используется
            цена прайс-листа.
          </li>
          <li>
            <strong className="text-[#F3F4F4]">H5: тип двигателя</strong> — карточка каталога производителя описывает
            комплектацию «с дизельным двигателем 2.0T», а прайс-лист указывает бензиновый 1967 см³ / 200 л.с.
            Использован прайс-лист как более детальный документ; расхождение зафиксировано.
          </li>
        </ul>
      </Card>

      {/* ---------------- История проверок ---------------- */}
      <SectionTitle tip="История не перезаписывается при ошибке источника: неудачная попытка фиксируется отдельной записью, последняя корректная цена остаётся в каталоге.">
        История проверок и обновлений
      </SectionTitle>
      <div className="flex flex-col gap-2.5">
        {PRICE_HISTORY.slice()
          .reverse()
          .map((entry, i) => (
            <Card key={`${entry.checkedAt}-${i}`} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <HistoryIcon className="h-4 w-4 text-[#E4002B]" />
                <p className="text-[13px] font-bold text-[#F3F4F4]">{fmtDate(entry.checkedAt)}</p>
                <Tag tone={entry.outcome === 'failed' ? 'warn' : 'success'}>{outcomeLabel(entry.outcome)}</Tag>
                {entry.confirmedPrices !== undefined && (
                  <Tag>подтверждено цен: {entry.confirmedPrices}</Tag>
                )}
              </div>
              <p className="text-[12px] leading-relaxed text-[#A9AFB7]">{entry.summary}</p>
              <p className="text-[11px] text-[#A9AFB7]">
                Источник:{' '}
                <a href={entry.source} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-[#F3F4F4]">
                  {entry.source}
                </a>{' '}
                · модели: {entry.models.length}
              </p>
              {entry.errors && entry.errors.length > 0 && (
                <ul className="ml-4 list-disc text-[11.5px] text-[#F5A623]">
                  {entry.errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
      </div>

      <Callout tone="info" title="Как обновляются данные">
        <p>
          Обновление в реальном времени не выполняется и не обещается. Механизм такой: сбор или импорт официальных
          прайс-листов → нормализация → валидация структуры и обязательных полей → сравнение с текущими данными →
          сохранение подтверждённых изменений → запись истории → отображение даты последней успешной проверки.
        </p>
        <ul className="mt-2 ml-4 list-disc">
          <li>
            <code className="text-[#F3F4F4]">npm run update:prices</code> — сбор тизеров и сносок со страниц источника;
            при ошибке сети существующие данные не изменяются и не обнуляются.
          </li>
          <li>
            <code className="text-[#F3F4F4]">npm run import:price-list -- price-lists/file.json</code> — структурированный
            импорт из официального прайс-листа с валидацией; ошибки отклоняют импорт целиком.
          </li>
          <li>
            <code className="text-[#F3F4F4]">.github/workflows/prices.yml</code> — периодическая проверка доступности
            источников и фиксация результата в истории (без обхода CAPTCHA и авторизации).
          </li>
        </ul>
        <p className="mt-2">
          Последняя успешная проверка источников: {fmtDate(lastSuccessfulCheck() ?? CATALOG_FIXED_AT)}.
        </p>
      </Callout>

      {/* ---------------- Приватность ---------------- */}
      <SectionTitle tip="Собираются только обезличенные события взаимодействия. Имя, телефон, адрес, банковские реквизиты и VIN не собираются.">
        Аналитика и приватность
      </SectionTitle>
      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-bold text-[#F3F4F4]">Внешняя система аналитики</p>
            <p className="text-[11.5px] leading-relaxed text-[#A9AFB7]">
              По умолчанию провайдер не подключён: события остаются в локальном буфере браузера и никуда не отправляются.
              При согласии события могут передаваться подключённому счётчику (без персональных данных).
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={consent}
            onClick={() => {
              const next = !consent
              setAnalyticsConsent(next)
              setConsent(next)
            }}
            className={`relative min-h-[40px] w-[92px] shrink-0 rounded-full border px-1 text-[11.5px] font-bold transition-colors ${
              consent ? 'border-[#16B374] bg-[#16B374]/20 text-[#16B374]' : 'border-[#363B43] bg-[#23272D] text-[#A9AFB7]'
            }`}
          >
            <span
              className={`absolute top-1 h-7 w-7 rounded-full transition-all ${
                consent ? 'left-[54px] bg-[#16B374]' : 'left-1 bg-[#A9AFB7]'
              }`}
              aria-hidden="true"
            />
            <span className={consent ? 'mr-6' : 'ml-6'}>{consent ? 'вкл' : 'выкл'}</span>
          </button>
        </div>

        <Disclosure title="Какие события отслеживаются" defaultOpen={false}>
          <ul className="ml-4 list-disc text-[11.5px] leading-relaxed text-[#A9AFB7]">
            <li>открытие модели и просмотр комплектации;</li>
            <li>запуск калькулятора и изменение параметров кредита;</li>
            <li>использование подбора по бюджету и сортировки;</li>
            <li>сравнение комплектаций, расчёт владения, план накопления, трейд-ин;</li>
            <li>сохранение расчёта, печать/экспорт;</li>
            <li>переход к официальному источнику.</li>
          </ul>
          <p className="mt-2 text-[11.5px] text-[#A9AFB7]">
            Не собираются: имя, телефон, e-mail, адрес, паспортные и банковские данные, VIN. Поля с такими ключами
            отбрасываются до записи события.
          </p>
        </Disclosure>

        <Disclosure title="Последние события в этой сессии" defaultOpen={false}>
          {recentEvents(15).length === 0 ? (
            <p className="text-[11.5px] text-[#A9AFB7]">Событий пока нет.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {recentEvents(15).map((e, i) => (
                <li key={`${e.at}-${i}`} className="flex items-center gap-2 text-[11px] text-[#A9AFB7]">
                  <DatabaseIcon className="h-3 w-3 shrink-0 text-[#E4002B]" />
                  <code className="text-[#F3F4F4]">{e.name}</code>
                  <span>{JSON.stringify(e.props)}</span>
                </li>
              ))}
            </ul>
          )}
        </Disclosure>

        <p className="text-[11.5px] leading-relaxed text-[#A9AFB7]">
          Избранное, сравнения, расчёты и планы хранятся только в localStorage этого браузера. На сервер отправляются
          лишь те данные, которые вы сами вводите в форме заявки (имя и телефон) — и только при явной отправке.
        </p>
      </Card>
    </div>
  )
}

function SourceLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 underline decoration-[#363B43] underline-offset-2 hover:text-[#F3F4F4]"
      onClick={() => track('official_source_click', { url: href, source: 'sources-page' })}
    >
      {label}
      <ArrowUpRightIcon className="h-3 w-3" />
    </a>
  )
}

function openOfficial(url: string, source: string) {
  track('official_source_click', { url, source })
  window.open(url, '_blank', 'noopener,noreferrer')
}

function PriceTypeCard({
  title,
  text,
  count,
  warn = false,
}: {
  title: string
  text: string
  count: number
  warn?: boolean
}) {
  return (
    <Card className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12.5px] font-bold text-[#F3F4F4]">{title}</p>
        {warn ? <Tag tone="warn">{count}</Tag> : <Tag>{count}</Tag>}
      </div>
      <p className="text-[11.5px] leading-relaxed text-[#A9AFB7]">{text}</p>
    </Card>
  )
}

function outcomeLabel(outcome: string): string {
  switch (outcome) {
    case 'updated':
      return 'данные обновлены'
    case 'unchanged':
      return 'изменений нет'
    case 'failed':
      return 'ошибка источника'
    default:
      return 'ручная проверка'
  }
}
