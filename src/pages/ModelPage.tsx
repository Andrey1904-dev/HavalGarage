import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Button,
  Callout,
  Card,
  DataTable,
  EmptyState,
  SectionTitle,
  StatTile,
  TableCell,
  Tag,
} from '../components/ui'
import PriceMeta from '../components/PriceMeta'
import { ModelGallery } from '../components/ModelImage'
import { CompareToggle, FavoriteButton } from '../components/ActionButtons'
import {
  ArrowUpRightIcon,
  CarIcon,
  CheckIcon,
  ChevronRightIcon,
  CloseIcon,
  FuelIcon,
  GaugeIcon,
  PercentIcon,
  WrenchIcon,
} from '../components/icons'
import {
  CATALOG_FIXED_AT,
  activeOffersForModel,
  getModel,
  getOfficialSpecs,
  getModelEquipment,
  programsForModel,
  trimDetails,
  trimsForModel,
} from '../data/haval'
import { useCalculator } from '../context/CalculatorContext'
import { fmtDate, fmtMoney, fmtNumber } from '../utils/format'
import { absoluteUrl, carJsonLd, useSeo } from '../utils/seo'
import { track } from '../utils/analytics'

/**
 * Страница модели: галерея, описание, цены и комплектации, официальные
 * характеристики, сравнение комплектаций, переход к расчёту кредита,
 * блок стоимости владения и ссылки на первоисточники.
 */
export default function ModelPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { state, update, selectModel } = useCalculator()

  const model = getModel(slug ?? '')

  useSeo({
    title: model
      ? `${model.name} — цены, комплектации и характеристики | HAVAL Гараж`
      : 'Модель не найдена | HAVAL Гараж',
    description: model
      ? `${model.name}: ${model.bodyType}. Цены и комплектации по официальному прайс-листу haval.ru, технические характеристики, оснащение, расход топлива и расчёт кредита.`
      : 'Страница модели не найдена — вернитесь в каталог HAVAL Гараж.',
    path: model ? `/models/${model.slug}` : '/catalog',
    image: model?.image ?? null,
    noindex: !model,
    jsonLd: model
      ? carJsonLd({
          name: model.name,
          description: model.description,
          image: model.image ? absoluteUrl(model.image) : null,
          url: absoluteUrl(`/models/${model.slug}`),
          priceFrom:
            trimsForModel(model.id)
              .map((t) => t.basePrice)
              .filter((p): p is number => p !== null)
              .sort((a, b) => a - b)[0] ?? null,
          bodyType: model.bodyType,
        })
      : null,
  })

  useEffect(() => {
    if (model) track('model_view', { model: model.id, slug: model.slug })
  }, [model])

  const trimsCurrent = useMemo(() => (model ? trimsForModel(model.id, false) : []), [model])
  const trimsArchive = useMemo(
    () => (model ? trimsForModel(model.id, true).filter((t) => t.status === 'archive') : []),
    [model],
  )
  const offers = useMemo(() => (model ? activeOffersForModel(model.id, CATALOG_FIXED_AT) : []), [model])
  const programs = useMemo(() => (model ? programsForModel(model.id) : []), [model])
  const specs = useMemo(() => (model ? getOfficialSpecs(model.id) : null), [model])
  const equipment = useMemo(() => (model ? getModelEquipment(model.id) : null), [model])

  if (!model) {
    return (
      <EmptyState
        icon={<CarIcon className="h-6 w-6" />}
        title="Модель не найдена"
        text="Вернитесь в каталог и выберите модель из списка."
        action={
          <Link to="/catalog">
            <Button type="button" variant="secondary">
              В каталог
            </Button>
          </Link>
        }
      />
    )
  }

  const details = trimsCurrent.map((t) => trimDetails(t.id)).filter((d) => d !== null)
  const prices = trimsCurrent.map((t) => t.basePrice).filter((p): p is number => p !== null)
  const priceFrom = prices.length > 0 ? Math.min(...prices) : null
  const priceTo = prices.length > 0 ? Math.max(...prices) : null
  const consumption = details.find((d) => d?.consumption?.combined !== null)?.consumption?.combined ?? null

  const chooseTrim = (trimId: string) => {
    if (state.modelId !== model.id) selectModel(model.id)
    update({ trimId })
    track('trim_view', { model: model.id, trim: trimId, action: 'to-calculator' })
    navigate('/calculator')
  }

  const visibleTrims = state.showArchiveTrims ? [...trimsCurrent, ...trimsArchive] : trimsCurrent

  return (
    <div className="animate-page-enter flex flex-col gap-4">
      {/* ---------------- Шапка модели ---------------- */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_1fr]">
        <div className="flex flex-col gap-3">
          <ModelGallery model={model} />
          <div className="flex flex-wrap items-center gap-2">
            <Tag>{model.bodyType}</Tag>
            <Tag>{model.family === 'PRO' ? 'HAVAL PRO' : model.family === 'PICKUP' ? 'Пикап GWM' : 'HAVAL CITY'}</Tag>
            {model.availability === 'coming-soon' ? <Tag tone="warn">скоро в продаже</Tag> : <Tag tone="success">в продаже</Tag>}
            {model.priceListUrl === null && <Tag tone="warn">вне официального каталога</Tag>}
            <FavoriteButton modelId={model.id} />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h1 className="font-display-num text-[26px] font-bold uppercase leading-tight tracking-wide text-[#F3F4F4] sm:text-[34px]">
            {model.name}
          </h1>
          <p className="text-[13px] leading-relaxed text-[#A9AFB7]">{model.description}</p>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <StatTile label="Цена от" value={priceFrom ? fmtMoney(priceFrom) : 'нет данных'} tone="accent" />
            <StatTile label="Цена до" value={priceTo ? fmtMoney(priceTo) : '—'} />
            <StatTile
              label="Расход (смеш.)"
              value={consumption !== null ? `${fmtNumber(consumption)} л` : 'нет данных'}
              hint={consumption !== null ? 'по официальному прайс-листу' : undefined}
            />
            <StatTile label="Комплектаций" value={trimsCurrent.length} />
          </div>

          {model.highlights && model.highlights.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {model.highlights.map((h) => (
                <li key={h} className="flex items-start gap-2 text-[12px] leading-relaxed text-[#A9AFB7]">
                  <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#16B374]" />
                  {h}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-auto flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              onClick={() => {
                selectModel(model.id)
                track('calculator_open', { model: model.id, source: 'model-page' })
                navigate('/calculator')
              }}
            >
              Рассчитать кредит
            </Button>
            <Link to="/budget">
              <Button type="button" variant="secondary">
                Подобрать по бюджету
              </Button>
            </Link>
            <Link to="/catalog">
              <Button type="button" variant="ghost">
                ← В каталог
              </Button>
            </Link>
          </div>

          <div className="rounded-[10px] border border-[#363B43] bg-[#0E1013]/70 p-3">
            <p className="text-[11px] leading-relaxed text-[#A9AFB7]">
              Официальные источники:{' '}
              {model.officialUrl && (
                <SourceLink href={model.officialUrl} label="страница модели на haval.ru" model={model.id} />
              )}
              {model.catalogueUrl && (
                <SourceLink href={model.catalogueUrl} label="каталог модели (PDF)" model={model.id} />
              )}
              {model.priceListUrl && (
                <SourceLink href={model.priceListUrl} label="прайс-лист (PDF)" model={model.id} />
              )}
              {model.sourceUrl && <SourceLink href={model.sourceUrl} label="страница дилера АГАТ" model={model.id} />}
              {!model.priceListUrl && !model.catalogueUrl && (
                <span className="text-[#F5A623]">
                  официальные документы модели на haval.ru не опубликованы — данные требуют подтверждения
                </span>
              )}
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- Специальные предложения ---------------- */}
      {offers.length > 0 && (
        <>
          <SectionTitle tip="Только подтверждённые предложения. Выгода не вычитается из базовой цены автоматически: в калькуляторе её нужно выбрать явно и подтвердить выполнение условий.">
            Специальные предложения и выгоды
          </SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {offers.map((o) => (
              <Card key={o.id} className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] font-bold text-[#F3F4F4]">{o.name}</p>
                  <Tag tone="accent">
                    {o.discountPercent
                      ? `до ${o.discountPercent}%`
                      : o.discountAmount
                        ? `−${fmtMoney(o.discountAmount)}`
                        : 'выгода'}
                  </Tag>
                </div>
                <p className="text-[12px] leading-relaxed text-[#A9AFB7]">{o.conditions}</p>
                <div className="rounded-[8px] border border-[#363B43] bg-[#0E1013]/70 px-3 py-2">
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#A9AFB7]">Условия получения</p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-[#A9AFB7]">{o.eligibilityConditions}</p>
                </div>
                <p className="text-[10.5px] text-[#A9AFB7]">
                  Источник:{' '}
                  <SourceLink href={o.sourceUrl} label={sourceLabel(o.sourceUrl)} model={model.id} />
                  {o.validFrom ? ` · действует с ${fmtDate(o.validFrom)}` : ' · дата начала действия не опубликована'}
                  {o.validUntil ? ` · до ${fmtDate(o.validUntil)}` : ' · дата окончания не опубликована'}
                  {o.status !== 'active' && <span className="text-[#F5A623]"> · актуальность подтвердите у дилера</span>}
                </p>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* ---------------- Комплектации и цены ---------------- */}
      <SectionTitle
        tip="Цены — МЦП из официального прайс-листа. Архивные позиции прошлых лет производства скрыты по умолчанию и помечены бейджем «архив»."
        action={
          trimsArchive.length > 0 ? (
            <button
              type="button"
              onClick={() => update({ showArchiveTrims: !state.showArchiveTrims })}
              className="min-h-[36px] rounded-[8px] border border-[#363B43] bg-[#1A1D22] px-3 py-1.5 text-[11.5px] font-semibold text-[#A9AFB7] transition-colors hover:text-[#F3F4F4]"
            >
              {state.showArchiveTrims ? 'Скрыть архивные цены' : `Показать архивные цены (${trimsArchive.length})`}
            </button>
          ) : undefined
        }
      >
        Комплектации и цены
      </SectionTitle>

      {visibleTrims.length === 0 ? (
        <EmptyState
          icon={<CarIcon className="h-6 w-6" />}
          title="Нет данных о комплектациях"
          text="Официальный прайс-лист для этой модели не опубликован. Проверьте раздел «Источники данных»."
          action={
            <Link to="/sources">
              <Button type="button" variant="secondary">
                Источники данных
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {visibleTrims.map((t) => {
            const d = trimDetails(t.id)
            return (
              <Card key={t.id} className={`flex flex-col gap-2.5 ${t.status === 'archive' ? 'opacity-80' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[14px] font-bold text-[#F3F4F4]">{t.name}</p>
                    <p className="mt-0.5 text-[11px] text-[#A9AFB7]">
                      {[
                        t.engine !== 'Нет данных' ? t.engine : null,
                        t.horsepower ? `${t.horsepower} л.с.` : null,
                        d?.torqueNm ? `${d.torqueNm} Нм` : null,
                        t.transmission !== 'Нет данных' ? t.transmission : null,
                        t.drivetrain !== 'Нет данных' ? t.drivetrain : null,
                        t.modelYear ? `${t.modelYear} м.г.` : null,
                        t.productionYear ? `${t.productionYear} г.в.` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'Характеристики не опубликованы'}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    {t.status === 'archive' && <Tag tone="warn">архив</Tag>}
                    {t.priceType && t.priceType !== 'msrp' && <Tag tone="warn">{priceTypeLabel(t.priceType)}</Tag>}
                  </div>
                </div>

                <div className="flex flex-wrap items-end justify-between gap-2">
                  {t.basePrice !== null ? (
                    <p className="font-display-num text-[22px] font-bold text-[#F3F4F4]">{fmtMoney(t.basePrice)}</p>
                  ) : (
                    <p className="text-[13px] font-semibold text-[#A9AFB7]">Нет данных о цене</p>
                  )}
                  {d && d.prices.length > 1 && (
                    <div className="flex flex-col items-end gap-0.5">
                      {d.prices
                        .filter((p) => p.priceType !== 'msrp' && p.status !== 'archived')
                        .map((p) => (
                          <p key={p.id} className="text-[11px] font-semibold text-[#16B374]">
                            {priceTypeLabel(p.priceType)}: {fmtMoney(p.amount)}
                          </p>
                        ))}
                    </div>
                  )}
                </div>

                {d?.consumption?.combined != null && (
                  <p className="flex items-center gap-1.5 text-[11px] text-[#A9AFB7]">
                    <FuelIcon className="h-3.5 w-3.5 text-[#E4002B]" />
                    Расход (смешанный): {fmtNumber(d.consumption.combined)} л/100 км
                    {d.consumption.city != null && ` · город ${fmtNumber(d.consumption.city)} л`}
                    {d.consumption.highway != null && ` · трасса ${fmtNumber(d.consumption.highway)} л`}
                  </p>
                )}

                {t.equipment.length > 0 && (
                  <ul className="flex flex-col gap-1">
                    {t.equipment.slice(0, 6).map((e) => (
                      <li key={e} className="flex items-start gap-1.5 text-[11.5px] text-[#A9AFB7]">
                        <CheckIcon className="mt-0.5 h-3 w-3 shrink-0 text-[#16B374]" />
                        {e}
                      </li>
                    ))}
                    {t.equipment.length > 6 && (
                      <li className="text-[11px] text-[#A9AFB7]">
                        и ещё {t.equipment.length - 6} позиций — в сравнении комплектаций
                      </li>
                    )}
                  </ul>
                )}

                <PriceMeta trim={t} />

                {t.status === 'current' && (
                  <div className="mt-auto flex flex-wrap gap-2 pt-1">
                    {t.basePrice !== null && (
                      <Button type="button" variant="secondary" className="min-h-[40px] flex-1" onClick={() => chooseTrim(t.id)}>
                        Выбрать и рассчитать <ChevronRightIcon className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <CompareToggle trimId={t.id} />
                    <FavoriteButton modelId={model.id} trimId={t.id} />
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* ---------------- Сравнение комплектаций (в пределах модели) ---------------- */}
      {trimsCurrent.length > 1 && (
        <>
          <SectionTitle
            tip="Таблица различий из официального прайс-листа: ● — есть, ○ — опция, × — нет, «?» — не подтверждено официальными данными."
            action={
              <Link to={`/compare?trims=${trimsCurrent.slice(0, 3).map((t) => t.id).join(',')}`}>
                <Button type="button" variant="secondary" className="min-h-[38px]">
                  Открыть подробное сравнение
                </Button>
              </Link>
            }
          >
            Сравнение комплектаций {model.name}
          </SectionTitle>
          <TrimMatrix trimIds={trimsCurrent.slice(0, 3).map((t) => t.id)} />
        </>
      )}

      {/* ---------------- Характеристики ---------------- */}
      {specs && (
        <>
          <SectionTitle tip="Данные перенесены из официального прайс-листа без изменений. Если документ не раскрывает параметр, он показан как «нет данных» — догадки не подставляются.">
            Технические характеристики
          </SectionTitle>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <SpecsCard specs={specs} />
            <div className="flex flex-col gap-3">
              {specs.engines.map((e) => (
                <Card key={e.code} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-bold text-[#F3F4F4]">Двигатель {e.code}</p>
                    <Tag>{e.fuel}</Tag>
                  </div>
                  <SpecRow label="Рабочий объём" value={e.displacementCc ? `${fmtNumber(e.displacementCc)} см³` : null} />
                  <SpecRow
                    label="Макс. мощность"
                    value={e.powerHp ? `${e.powerHp} л.с. (${e.powerKw ?? '—'} кВт)${e.powerRpm ? ` при ${e.powerRpm} об/мин` : ''}` : null}
                  />
                  <SpecRow
                    label="Макс. крутящий момент"
                    value={e.torqueNm ? `${e.torqueNm} Нм${e.torqueRpm ? ` при ${e.torqueRpm} об/мин` : ''}` : null}
                  />
                  {e.appliesTo && <SpecRow label="Комплектации" value={e.appliesTo} />}
                </Card>
              ))}

              {specs.unknownFields.length > 0 && (
                <Callout tone="warn" title="Не раскрыто официальным документом">
                  <ul className="ml-4 list-disc">
                    {specs.unknownFields.map((u) => (
                      <li key={u}>{u}</li>
                    ))}
                  </ul>
                </Callout>
              )}
            </div>
          </div>
        </>
      )}

      {/* ---------------- Оснащение ---------------- */}
      {equipment && equipment.standard.length > 0 && (
        <>
          <SectionTitle tip="Базовое оснащение модели по официальному прайс-листу: эти позиции входят во все комплектации. Различия между комплектациями — в таблице сравнения выше и на странице сравнения.">
            Оснащение (входит во все комплектации)
          </SectionTitle>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {equipment.standard.map((group) => (
              <Card key={group.group} className="flex flex-col gap-2">
                <p className="text-[12px] font-bold uppercase tracking-wider text-[#E4002B]">{group.group}</p>
                <ul className="flex flex-col gap-1">
                  {group.items.map((item) => (
                    <li key={item} className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-[#A9AFB7]">
                      <CheckIcon className="mt-0.5 h-3 w-3 shrink-0 text-[#16B374]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* ---------------- Стоимость владения ---------------- */}
      <SectionTitle tip="Расход топлива подставляется из официального прайс-листа; цена топлива, ТО, страховка и налог задаются вами — выдуманные тарифы не подставляются.">
        Полная стоимость владения
      </SectionTitle>
      <Card className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <StatTile
            label="Расход (смеш.)"
            value={consumption !== null ? `${fmtNumber(consumption)} л/100 км` : 'нет данных'}
            tone={consumption !== null ? 'default' : 'warn'}
          />
          <StatTile
            label="Топливо"
            value={specs?.engines[0]?.fuel ?? 'нет данных'}
            hint={specs?.fuelTankL ? `бак ${specs.fuelTankL} л` : undefined}
          />
          <StatTile
            label="Мощность"
            value={trimsCurrent[0]?.horsepower ? `${trimsCurrent[0].horsepower} л.с.` : '—'}
            hint="для расчёта налога"
          />
          <StatTile label="Клиренс" value={specs?.clearanceMm ? `${specs.clearanceMm.split(' ')[0]} мм` : 'нет данных'} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/ownership?trim=${trimsCurrent[0]?.id ?? ''}`}>
            <Button type="button">
              <GaugeIcon className="h-4 w-4" /> Рассчитать стоимость владения
            </Button>
          </Link>
          <Link to="/plan">
            <Button type="button" variant="secondary">
              План покупки и накопления
            </Button>
          </Link>
          <Link to="/calculator">
            <Button type="button" variant="ghost">
              <WrenchIcon className="h-4 w-4" /> Обратный расчёт взноса
            </Button>
          </Link>
        </div>

        <p className="text-[11px] leading-relaxed text-[#A9AFB7]">
          Стоимость владения считается отдельно от кредитных платежей: эксплуатационные расходы и переплата по кредиту
          не смешиваются в один показатель. Страховка, включённая в тело кредита, не учитывается дважды.
        </p>
      </Card>

      {/* ---------------- Кредитные программы ---------------- */}
      {programs.length > 0 && (
        <>
          <SectionTitle tip="Программы с опубликованными условиями. Льготная ставка не применяется к моделям вне программы; ограничения (взнос, срок, КАСКО) показаны в разделе «Программы».">
            Кредитные программы для {model.name}
          </SectionTitle>
          <div className="flex flex-wrap gap-2">
            {programs.map((p) => (
              <Link
                key={p.id}
                to="/programs"
                onClick={() => track('program_view', { model: model.id, program: p.id })}
                className="flex min-h-[40px] items-center gap-2 rounded-[8px] border border-[#363B43] bg-[#1A1D22] px-3 py-2 text-[12px] font-semibold text-[#A9AFB7] transition-colors hover:border-[#E4002B]/60 hover:text-[#F3F4F4]"
              >
                <PercentIcon className="h-3.5 w-3.5 text-[#E4002B]" />
                {p.name}
                {p.baseRate !== null && <span className="text-[#F3F4F4]">от {String(p.baseRate).replace('.', ',')}%</span>}
              </Link>
            ))}
          </div>
        </>
      )}

      <Callout tone="info" title="Как проверялись данные">
        Цена, комплектации, характеристики и оснащение взяты из официального прайс-листа модели (проверено{' '}
        {fmtDate(specs?.verifiedAt ?? CATALOG_FIXED_AT)}). Расхождение между тизерами дилера и прайс-листом
        фиксируется в разделе <Link to="/sources" className="underline underline-offset-2">«Источники данных»</Link>.
        Расчёт кредита — математическая симуляция, не оферта и не одобрение.
      </Callout>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function SourceLink({ href, label, model }: { href: string; label: string; model: string }) {
  return (
    <>
      {' '}
      <a
        className="inline-flex items-center gap-1 text-[#F3F4F4] underline decoration-[#363B43] underline-offset-2 hover:text-[#E4002B]"
        href={href}
        target="_blank"
        rel="noreferrer"
        onClick={() => track('official_source_click', { model, url: href })}
      >
        {label}
        <ArrowUpRightIcon className="h-3 w-3" />
      </a>
      {' ·'}
    </>
  )
}

function sourceLabel(url: string): string {
  if (url.includes('cdn.perxis.ru')) return 'официальный прайс-лист (каталоги haval.ru)'
  if (url.includes('haval.ru')) return 'официальный сайт haval.ru'
  if (url.includes('agat-ekb-haval.ru')) return 'страница дилера АГАТ (вторичный источник)'
  return 'каталог наличия ГК АГАТ (вторичный источник)'
}

function priceTypeLabel(type: string): string {
  switch (type) {
    case 'msrp':
      return 'МЦП (рекомендованная)'
    case 'trade-in':
      return 'цена с трейд-ин'
    case 'with-benefit':
      return 'цена с выгодой'
    case 'stock':
      return 'цена в наличии'
    case 'credit':
      return 'цена по кредитной программе'
    case 'teaser':
      return 'тизер дилера'
    default:
      return 'цена'
  }
}

function SpecRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[#363B43]/60 pb-1 last:border-0">
      <span className="text-[11.5px] text-[#A9AFB7]">{label}</span>
      <span className={`text-right text-[12px] font-semibold ${value ? 'text-[#F3F4F4]' : 'text-[#A9AFB7]'}`}>
        {value ?? 'нет данных'}
      </span>
    </div>
  )
}

function SpecsCard({ specs }: { specs: NonNullable<ReturnType<typeof getOfficialSpecs>> }) {
  const dims = specs.dimensions
  return (
    <Card className="flex flex-col gap-1.5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-[12px] font-bold uppercase tracking-wider text-[#E4002B]">Габариты и масса</p>
        <Tag tone={specs.verifiedAt ? 'success' : 'warn'}>проверено {fmtDate(specs.verifiedAt)}</Tag>
      </div>
      <SpecRow
        label="Длина × ширина × высота"
        value={dims && dims.lengthMm ? `${dims.lengthMm} × ${dims.widthMm} × ${dims.heightMm} мм` : null}
      />
      <SpecRow label="Колёсная база" value={specs.wheelbaseMm ? `${fmtNumber(specs.wheelbaseMm)} мм` : null} />
      <SpecRow label="Клиренс" value={specs.clearanceMm ? `${specs.clearanceMm} мм` : null} />
      <SpecRow label="Тип кузова" value={specs.bodyType} />
      <SpecRow label="Мест" value={specs.seats ? String(specs.seats) : null} />
      <SpecRow label="Объём багажника" value={specs.trunkL ? `${specs.trunkL} л` : null} />
      <SpecRow label="Топливный бак" value={specs.fuelTankL ? `${specs.fuelTankL} л` : null} />
      <SpecRow label="Снаряжённая масса" value={specs.weightKg ? `${specs.weightKg} кг` : null} />
      <SpecRow label="Полная масса / нагрузка" value={specs.payloadKg ? `${specs.payloadKg} кг полезной нагрузки` : null} />
      <SpecRow label="Прицеп (с тормозами / без)" value={specs.towKg ? `${specs.towKg} кг` : null} />
      <SpecRow label="Привод" value={specs.drivetrain} />
      <SpecRow label="Коробка передач" value={specs.transmissions.length > 0 ? specs.transmissions.join('; ') : null} />
      <SpecRow label="Передняя подвеска" value={specs.suspensionFront} />
      <SpecRow label="Задняя подвеска" value={specs.suspensionRear} />
      <SpecRow label="Тормоза" value={specs.brakes} />
      <SpecRow label="Усилитель руля" value={specs.steering} />
      <SpecRow label="Расход (город / трасса / смеш.)" value={consumptionText(specs)} />
      <SpecRow label="Разгон 0–100 км/ч" value={specs.acceleration0to100 ? `${specs.acceleration0to100} с` : null} />
      <SpecRow label="Макс. скорость" value={specs.maxSpeedKmh ? `${specs.maxSpeedKmh} км/ч` : null} />
      <SpecRow label="Шины" value={specs.tires.length > 0 ? specs.tires.join(', ') : null} />
      <SpecRow label="Диски" value={specs.wheels.length > 0 ? specs.wheels.join(', ') : null} />
      <SpecRow label="Цвета кузова" value={specs.colorsExterior.length > 0 ? specs.colorsExterior.join(', ') : null} />
      <SpecRow label="Цвет салона" value={specs.colorsInterior.length > 0 ? specs.colorsInterior.join(', ') : null} />
      {specs.offroad.length > 0 && <SpecRow label="Внедорожные функции" value={specs.offroad.join('; ')} />}
      <p className="mt-1 text-[10.5px] leading-relaxed text-[#A9AFB7]">
        Источник:{' '}
        <a
          href={specs.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-[#363B43] underline-offset-2 hover:text-[#F3F4F4]"
        >
          {specs.sourceLabel}
        </a>
      </p>
    </Card>
  )
}

function consumptionText(specs: { consumption: { city: number | null; highway: number | null; combined: number | null } | null }): string | null {
  const c = specs.consumption
  if (!c) return null
  const parts = [
    c.city !== null ? `${fmtNumber(c.city)} л` : null,
    c.highway !== null ? `${fmtNumber(c.highway)} л` : null,
    c.combined !== null ? `${fmtNumber(c.combined)} л` : null,
  ]
  if (parts.every((p) => p === null)) return null
  return parts.map((p) => p ?? '—').join(' / ')
}

/** Таблица различий комплектаций (до трёх) — из матрицы официального прайс-листа */
function TrimMatrix({ trimIds }: { trimIds: string[] }) {
  const [onlyDiff, setOnlyDiff] = useState(true)
  // ключ — стабильная строка: пропс trimIds создаётся заново на каждый рендер
  const trimKey = trimIds.join(',')
  const trims = useMemo(
    () =>
      trimKey
        .split(',')
        .filter(Boolean)
        .map((id) => trimDetails(id))
        .filter((d) => d !== null),
    [trimKey],
  )
  const equipment = trims[0] ? getModelEquipment(trims[0].trim.modelId) : null

  const rows = useMemo(() => {
    const result: Array<{
      feature: string
      group: string
      values: Array<'standard' | 'optional' | 'unavailable' | 'unknown'>
    }> = []

    result.push({
      feature: 'Цена (МЦП)',
      group: 'Цена',
      values: trims.map((d) => (d.trim.basePrice !== null ? ('standard' as const) : ('unknown' as const))),
    })

    if (equipment) {
      for (const row of equipment.matrix) {
        result.push({
          feature: row.feature,
          group: row.group,
          values: trims.map((d) => row.values[d.trim.id] ?? ('unknown' as const)),
        })
      }
    }
    return result
  }, [equipment, trims])

  if (trims.length < 2) return null

  const shown = onlyDiff ? rows.filter((r) => r.group === 'Цена' || new Set(r.values).size > 1) : rows

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOnlyDiff((v) => !v)}
          className="min-h-[36px] rounded-[8px] border border-[#363B43] bg-[#1A1D22] px-3 text-[11.5px] font-bold text-[#A9AFB7] transition-colors hover:text-[#F3F4F4]"
          aria-pressed={onlyDiff}
        >
          {onlyDiff ? 'Показать все позиции' : 'Показать только различия'}
        </button>
        <p className="text-[11px] text-[#A9AFB7]">● есть · ○ опция · × нет · ? не подтверждено</p>
      </div>

      <DataTable head={['Параметр', ...trims.map((d) => `${d.model.name} ${d.trim.name}`)]}>
        {shown.map((row) => (
          <tr key={`${row.group}-${row.feature}`}>
            <TableCell sticky>
              <span className="block text-[10px] uppercase tracking-wider text-[#A9AFB7]">{row.group}</span>
              {row.feature}
            </TableCell>
            {row.values.map((v, i) => (
              <TableCell key={trims[i].trim.id} className="text-center">
                <AvailabilityMark value={v} />
              </TableCell>
            ))}
          </tr>
        ))}
        <tr>
          <TableCell sticky>Стоимость перехода</TableCell>
          {trims.map((d, i) => {
            if (i === 0) return <TableCell key={d.trim.id} className="text-center">—</TableCell>
            const prev = trims[i - 1]
            const diff =
              d.trim.basePrice !== null && prev.trim.basePrice !== null ? d.trim.basePrice - prev.trim.basePrice : null
            return (
              <TableCell key={d.trim.id} className="text-center">
                {diff !== null ? (
                  <span className={diff >= 0 ? 'text-[#E4002B]' : 'text-[#16B374]'}>
                    {diff >= 0 ? '+' : '−'}
                    {fmtMoney(Math.abs(diff))}
                  </span>
                ) : (
                  'нет данных'
                )}
              </TableCell>
            )
          })}
        </tr>
      </DataTable>
    </div>
  )
}

function AvailabilityMark({ value }: { value: 'standard' | 'optional' | 'unavailable' | 'unknown' }) {
  if (value === 'standard') return <CheckIcon className="mx-auto h-4 w-4 text-[#16B374]" aria-label="есть" />
  if (value === 'optional') return <span className="font-bold text-[#F5A623]" aria-label="доступно опционально">○</span>
  if (value === 'unavailable') return <CloseIcon className="mx-auto h-4 w-4 text-[#A9AFB7]" aria-label="нет" />
  return <span className="text-[#A9AFB7]" aria-label="не подтверждено официальными данными">?</span>
}
