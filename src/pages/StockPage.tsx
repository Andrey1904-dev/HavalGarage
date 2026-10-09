import { Link } from 'react-router-dom'
import { Button, Callout, Card, DataTable, EmptyState, SectionTitle, StatTile, TableCell, Tag } from '../components/ui'
import { AlertIcon, ArrowUpRightIcon, CarIcon } from '../components/icons'
import { FavoriteButton } from '../components/ActionButtons'
import {
  CATALOG_FIXED_AT,
  STOCK_ITEMS,
  STOCK_SOURCE,
  getModel,
  trimDetails,
} from '../data/haval'
import { fmtDate, fmtMoney } from '../utils/format'
import { useSeo } from '../utils/seo'
import { track } from '../utils/analytics'

/**
 * Автомобили в наличии.
 *
 * Официальный раздел haval.ru/online-stock/ — клиентское приложение, поэтому
 * остатки (VIN, цвета, дилеры) нельзя надёжно проверить. Фиктивные автомобили,
 * VIN и остатки не создаются: раздел работает в условном режиме и показывает
 * только позиции, подтверждённые публикуемым источником, с явной пометкой
 * статуса и ссылкой на первоисточник.
 */
export default function StockPage() {
  useSeo({
    title: 'Автомобили HAVAL в наличии — подтверждённые предложения и статус источника',
    description:
      'Раздел автомобилей в наличии: статус официального источника haval.ru/online-stock/, подтверждённые специальные ' +
      'цены дилера и пояснение, почему остатки не публикуются без надёжной проверки.',
    path: '/stock',
    noindex: true,
  })

  const confirmed = STOCK_ITEMS.filter((i) => i.status === 'confirmed')
  const unverified = STOCK_ITEMS.filter((i) => i.status !== 'confirmed')

  return (
    <div className="animate-page-enter flex flex-col gap-4">
      <header className="flex flex-col gap-1.5">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#E4002B]">
          Проверено {fmtDate(STOCK_SOURCE.checkedAt)}
        </p>
        <h1 className="font-display-num text-[26px] font-bold uppercase tracking-wide text-[#F3F4F4] sm:text-[32px]">
          Автомобили в наличии
        </h1>
        <p className="max-w-2xl text-[12.5px] leading-relaxed text-[#A9AFB7]">
          Раздел работает в условном режиме: мы показываем только те предложения, которые подтверждены публикуемым
          источником. VIN, остатки на складе и конкретные автомобили не выдумываются.
        </p>
      </header>

      <Callout tone="warn" title="Статус официального источника">
        {STOCK_SOURCE.reason}{' '}
        <a
          href={STOCK_SOURCE.officialUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-bold underline underline-offset-2"
          onClick={() => track('official_source_click', { source: 'stock', url: STOCK_SOURCE.officialUrl })}
        >
          Открыть официальный раздел «в наличии»
          <ArrowUpRightIcon className="h-3 w-3" />
        </a>
      </Callout>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatTile label="Позиций в разделе" value={STOCK_ITEMS.length} />
        <StatTile label="Подтверждено" value={confirmed.length} tone={confirmed.length > 0 ? 'success' : 'warn'} />
        <StatTile label="Требуют проверки" value={unverified.length} tone={unverified.length > 0 ? 'warn' : 'default'} />
        <StatTile label="Официальный онлайн-склад" value={STOCK_SOURCE.available ? 'доступен' : 'недоступен'} tone="warn" />
      </div>

      {STOCK_ITEMS.length === 0 ? (
        <EmptyState
          icon={<CarIcon className="h-6 w-6" />}
          title="Подтверждённых предложений нет"
          text="Как только источник позволит надёжно получать данные об остатках, позиции появятся здесь. Пока доступны цены официальных прайс-листов в каталоге."
          action={
            <Link to="/catalog">
              <Button type="button" variant="secondary">
                В каталог
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          <SectionTitle tip="Каждая позиция содержит цену, год производства, условия, ссылку на первоисточник и дату последней проверки. Идентификатор автомобиля и цвет публикуются только если их раскрыл источник.">
            Предложения дилера
          </SectionTitle>
          <div className="flex flex-col gap-3">
            {STOCK_ITEMS.map((item) => {
              const model = getModel(item.modelId)
              const details = item.trimId ? trimDetails(item.trimId) : null
              return (
                <Card key={item.id} className="flex flex-col gap-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/models/${model?.slug ?? item.modelId}`}
                          className="font-display-num text-[16px] font-bold uppercase tracking-wide text-[#F3F4F4] hover:text-[#E4002B]"
                        >
                          {model?.name ?? item.modelId}
                        </Link>
                        {item.status === 'confirmed' ? (
                          <Tag tone="success">подтверждено источником</Tag>
                        ) : (
                          <Tag tone="warn">требует подтверждения</Tag>
                        )}
                      </div>
                      <p className="text-[12px] text-[#A9AFB7]">{item.trimName}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <p className="font-display-num text-[20px] font-bold leading-none text-[#F3F4F4]">
                        {fmtMoney(item.price)}
                      </p>
                      {details?.trim.basePrice != null && details.trim.basePrice > item.price && (
                        <p className="text-[11px] text-[#16B374]">
                          выгода {fmtMoney(details.trim.basePrice - item.price)} к МЦП {fmtMoney(details.trim.basePrice)}
                        </p>
                      )}
                    </div>
                  </div>

                  <DataTable head={['Параметр', 'Значение']} className="border-0">
                    <tr>
                      <TableCell sticky>Год производства</TableCell>
                      <TableCell>{item.productionYear ?? 'не опубликован'}</TableCell>
                    </tr>
                    <tr>
                      <TableCell sticky>Цвет</TableCell>
                      <TableCell>{item.color ?? 'не опубликован источником'}</TableCell>
                    </tr>
                    <tr>
                      <TableCell sticky>Идентификатор автомобиля</TableCell>
                      <TableCell>
                        {item.vehicleId ?? (
                          <span className="flex items-center gap-1.5 text-[#A9AFB7]">
                            <AlertIcon className="h-3 w-3" /> не публикуется — VIN не выдумывается
                          </span>
                        )}
                      </TableCell>
                    </tr>
                    <tr>
                      <TableCell sticky>Дилер / регион</TableCell>
                      <TableCell>
                        {item.dealer ?? '—'}
                        {item.region ? ` · ${item.region}` : ''}
                      </TableCell>
                    </tr>
                    <tr>
                      <TableCell sticky>Условия покупки</TableCell>
                      <TableCell>{item.conditions}</TableCell>
                    </tr>
                    <tr>
                      <TableCell sticky>Тип цены</TableCell>
                      <TableCell>{item.priceType === 'stock' ? 'цена конкретного автомобиля в наличии' : item.priceType}</TableCell>
                    </tr>
                    <tr>
                      <TableCell sticky>Дата последней проверки</TableCell>
                      <TableCell>{fmtDate(item.verifiedAt)}</TableCell>
                    </tr>
                    <tr>
                      <TableCell sticky>Первоисточник</TableCell>
                      <TableCell>
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-[#F3F4F4]"
                          onClick={() => track('official_source_click', { source: 'stock-item', url: item.sourceUrl })}
                        >
                          открыть источник
                          <ArrowUpRightIcon className="h-3 w-3" />
                        </a>
                      </TableCell>
                    </tr>
                  </DataTable>

                  <div className="mt-auto flex flex-wrap gap-2">
                    {item.trimId && details && (
                      <>
                        <Link to={`/models/${details.model.slug}`}>
                          <Button type="button" variant="secondary" className="min-h-[40px]">
                            Страница модели
                          </Button>
                        </Link>
                        <Link to={`/calculator?trim=${item.trimId}`}>
                          <Button type="button" variant="ghost" className="min-h-[40px]">
                            Рассчитать кредит
                          </Button>
                        </Link>
                        <FavoriteButton modelId={item.modelId} trimId={item.trimId} />
                      </>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      <Callout tone="info" title="Почему раздел условный">
        Официальный онлайн-склад производителя отдаёт список автомобилей только через клиентское приложение браузера,
        поэтому надёжно получить VIN, цвет, дилера и остаток нельзя. По требованию к данным мы не публикуем
        неподтверждённые позиции: лучше показать меньше, но только то, что подтверждено источником. Цены официальных
        прайс-листов доступны в{' '}
        <Link to="/catalog" className="underline underline-offset-2">
          каталоге
        </Link>{' '}
        (проверено {fmtDate(CATALOG_FIXED_AT)}).
      </Callout>
    </div>
  )
}
