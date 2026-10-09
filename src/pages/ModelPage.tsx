import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, Card, EmptyState, SectionTitle, Tag } from '../components/ui'
import PriceMeta from '../components/PriceMeta'
import { CarIcon, CheckIcon, ChevronRightIcon } from '../components/icons'
import { getModel, programsForModel, activeOffersForModel, trimsForModel, CATALOG_FIXED_AT } from '../data/haval'
import { useCalculator } from '../context/CalculatorContext'
import { fmtMoney, fmtDate } from '../utils/format'

export default function ModelPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { state, update, selectModel } = useCalculator()

  const model = getModel(slug ?? '')
  if (!model) {
    return (
      <EmptyState
        icon={<CarIcon className="h-6 w-6" />}
        title="Модель не найдена"
        text="Вернитесь в каталог и выберите модель из списка."
        action={
          <Link to="/">
            <Button type="button" variant="secondary">
              В каталог
            </Button>
          </Link>
        }
      />
    )
  }

  const trimsCurrent = trimsForModel(model.id, false)
  const trimsArchive = trimsForModel(model.id, true).filter((t) => t.status === 'archive')
  const offers = activeOffersForModel(model.id, CATALOG_FIXED_AT)
  const programs = programsForModel(model.id)

  const chooseTrim = (trimId: string) => {
    if (state.modelId !== model.id) selectModel(model.id)
    update({ trimId })
    navigate('/calculator')
  }

  return (
    <div className="animate-page-enter flex flex-col gap-4">
      {/* Шапка модели */}
      <section className="relative overflow-hidden rounded-[14px] border border-[#363B43]/85 bg-[#1A1D22]">
        <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr]">
          <div className="relative h-56 sm:h-72">
            {model.image && (
              <img src={model.image} alt={model.name} className="animate-car-in h-full w-full object-cover" />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1A1D22] via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-[#1A1D22]" />
          </div>
          <div className="flex flex-col gap-3 p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Tag>{model.bodyType}</Tag>
              {model.availability === 'coming-soon' ? <Tag tone="warn">скоро в продаже</Tag> : <Tag tone="success">в продаже</Tag>}
            </div>
            <h1 className="font-display-num text-[26px] font-bold uppercase tracking-wide text-[#F3F4F4] sm:text-[32px]">
              {model.name}
            </h1>
            <p className="text-[13px] leading-relaxed text-[#A9AFB7]">{model.description}</p>
            <p className="text-[11px] text-[#A9AFB7]">
              Источник:{' '}
              <a className="underline decoration-[#363B43] underline-offset-2 hover:text-[#F3F4F4]" href={model.sourceUrl} target="_blank" rel="noreferrer">
                страница модели на agat-ekb-haval.ru
              </a>
              {model.priceListUrl && (
                <>
                  {' · '}
                  <a
                    className="underline decoration-[#363B43] underline-offset-2 hover:text-[#F3F4F4]"
                    href={model.priceListUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    официальный прайс-лист
                  </a>
                </>
              )}
            </p>
            <div className="mt-auto flex flex-wrap gap-2 pt-2">
              <Button type="button" onClick={() => navigate('/calculator')} disabled={model.availability === 'coming-soon' && trimsCurrent.length === 0}>
                Рассчитать кредит
              </Button>
              <Link to="/">
                <Button type="button" variant="ghost">
                  ← В каталог
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Спецпредложения */}
      {offers.length > 0 && (
        <>
          <SectionTitle tip="Только подтверждённые предложения, опубликованные дилером. Скидка применяется в калькуляторе после явного выбора.">
            Специальные предложения
          </SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {offers.map((o) => (
              <Card key={o.id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-bold text-[#F3F4F4]">
                    {o.offerType === 'state-support' ? 'Госпрограмма' : 'Специальное предложение'}
                  </p>
                  <Tag tone="accent">
                    {o.discountPercent ? `до ${o.discountPercent}%` : o.discountAmount ? `−${fmtMoney(o.discountAmount)}` : 'выгода'}
                  </Tag>
                </div>
                <p className="text-[12px] leading-relaxed text-[#A9AFB7]">{o.conditions}</p>
                <p className="text-[10.5px] text-[#A9AFB7]">
                  Источник:{' '}
                  {o.sourceUrl.includes('agat-ekb')
                    ? 'agat-ekb-haval.ru'
                    : o.sourceUrl.includes('cdn.perxis.ru')
                      ? 'официальный прайс-лист (каталоги haval.ru)'
                      : 'каталог наличия ГК АГАТ'}
                  {o.validFrom && ` · действует с ${fmtDate(o.validFrom)}`}
                </p>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Комплектации */}
      <SectionTitle
        tip="В подбор попадают комплектации с подтверждёнными ценами. Архивные цены прошлых лет производства скрыты по умолчанию, чтобы не смешивать модельные годы."
        action={
          trimsArchive.length > 0 ? (
            <button
              type="button"
              onClick={() => update({ showArchiveTrims: !state.showArchiveTrims })}
              className="min-h-[36px] rounded-[8px] border border-[#363B43] bg-[#1A1D22] px-3 py-1.5 text-[11.5px] font-semibold text-[#A9AFB7] transition-colors hover:text-[#F3F4F4]"
            >
              {state.showArchiveTrims ? 'Скрыть архивные цены' : 'Показать архивные цены'}
            </button>
          ) : undefined
        }
      >
        Комплектации и цены
      </SectionTitle>

      {trimsCurrent.length === 0 && trimsArchive.length === 0 ? (
        <EmptyState
          icon={<CarIcon className="h-6 w-6" />}
          title="Нет данных о комплектациях"
          text="Дилер пока не опубликовал цены для этой модели. Следите за прайс-листами на сайте АГАТ."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {(state.showArchiveTrims ? [...trimsCurrent, ...trimsArchive] : trimsCurrent).map((t) => (
            <Card key={t.id} className={`flex flex-col gap-2.5 ${t.status === 'archive' ? 'opacity-80' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[14px] font-bold text-[#F3F4F4]">{t.name}</p>
                  <p className="mt-0.5 text-[11px] text-[#A9AFB7]">
                    {[
                      t.engine !== 'Нет данных' ? t.engine : null,
                      t.horsepower ? `${t.horsepower} л.с.` : null,
                      t.transmission !== 'Нет данных' ? t.transmission : null,
                      t.drivetrain !== 'Нет данных' ? t.drivetrain : null,
                      t.modelYear ? `${t.modelYear} м.г.` : null,
                      t.productionYear ? `${t.productionYear} г.в.` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'Характеристики не опубликованы'}
                  </p>
                </div>
                {t.status === 'archive' && <Tag tone="warn">архив</Tag>}
              </div>

              {t.basePrice !== null ? (
                <p className="font-display-num text-[22px] font-bold text-[#F3F4F4]">{fmtMoney(t.basePrice)}</p>
              ) : (
                <p className="text-[13px] font-semibold text-[#A9AFB7]">Нет данных о цене</p>
              )}

              {t.equipment.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {t.equipment.map((e) => (
                    <li key={e} className="flex items-start gap-1.5 text-[11.5px] text-[#A9AFB7]">
                      <CheckIcon className="mt-0.5 h-3 w-3 shrink-0 text-[#16B374]" />
                      {e}
                    </li>
                  ))}
                </ul>
              )}

              <PriceMeta trim={t} />

              {t.basePrice !== null && (
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-auto min-h-[40px]"
                  onClick={() => chooseTrim(t.id)}
                >
                  Выбрать и рассчитать <ChevronRightIcon className="h-3.5 w-3.5" />
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Программы для модели */}
      {programs.length > 0 && (
        <>
          <SectionTitle>Кредитные программы дилера для {model.name}</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {programs.map((p) => (
              <Link
                key={p.id}
                to="/programs"
                className="rounded-[8px] border border-[#363B43] bg-[#1A1D22] px-3 py-2 text-[12px] font-semibold text-[#A9AFB7] transition-colors hover:border-[#E4002B]/60 hover:text-[#F3F4F4]"
              >
                {p.name}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

