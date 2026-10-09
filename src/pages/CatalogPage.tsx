import { Link } from 'react-router-dom'
import ModelCard from '../components/ModelCard'
import { Button, SectionTitle } from '../components/ui'
import { MODELS, CATALOG_FIXED_AT, DEALER_URL, HAVAL_PRICE_LISTS_URL, getModel } from '../data/haval'
import { GENERATED_PRICES, hasGeneratedData } from '../data/haval/generated'
import { fmtDate, fmtMoney } from '../utils/format'
import { CardIcon, PercentIcon, SparklesIcon } from '../components/icons'

export default function CatalogPage() {
  const city = MODELS.filter((m) => m.family === 'CITY')
  const pickup = MODELS.filter((m) => m.family === 'PICKUP')
  const pro = MODELS.filter((m) => m.family === 'PRO')

  return (
    <div className="animate-page-enter flex flex-col gap-2">
      {/* Хиро */}
      <section className="relative overflow-hidden rounded-[14px] border border-[#363B43]/85 bg-[#1A1D22]">
        <div className="absolute inset-0" aria-hidden="true">
          <img src="/images/models/f7.webp" alt="" className="h-full w-full object-cover opacity-45" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0E1013] via-[#0E1013]/78 to-[#0E1013]/25" />
          <div className="animate-sheen pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/6 to-transparent" />
        </div>
        <div className="relative flex flex-col gap-4 px-5 py-8 sm:px-8 sm:py-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#E4002B]">
            Официальный дилер АГАТ · Екатеринбург
          </p>
          <h1 className="font-display-num max-w-xl text-[30px] font-bold uppercase leading-[1.06] tracking-wide text-[#F3F4F4] sm:text-[42px]">
            Каталог HAVAL <span className="text-[#A9AFB7]">и кредитный калькулятор</span>
          </h1>
          <p className="max-w-lg text-[13px] leading-relaxed text-[#A9AFB7]">
            Модели, комплектации и цены — по данным сайта дилера и официальных прайс-листов.
            Рассчитайте аннуитетный платёж, переплату и долговую нагрузку — с учётом
            подтверждённых скидок и официальных кредитных программ.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <Link to="/calculator">
              <Button type="button">Рассчитать кредит</Button>
            </Link>
            <Link to="/programs">
              <Button type="button" variant="secondary">
                Кредитные программы
              </Button>
            </Link>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-[11.5px] text-[#A9AFB7]">
            <span className="inline-flex items-center gap-1.5">
              <CardIcon className="h-3.5 w-3.5 text-[#E4002B]" /> Аннуитет и нулевая ставка
            </span>
            <span className="inline-flex items-center gap-1.5">
              <PercentIcon className="h-3.5 w-3.5 text-[#E4002B]" /> Программы от 0,01%*
            </span>
            <span className="inline-flex items-center gap-1.5">
              <SparklesIcon className="h-3.5 w-3.5 text-[#E4002B]" /> Подтверждённые скидки
            </span>
          </div>
        </div>
      </section>

      <SectionTitle
        tip="Модели из каталога официального дилера АГАТ (agat-ekb-haval.ru). Цены — по опубликованным страницам и прайс-листам; дата фиксации указана в карточках."
      >
        HAVAL CITY и пикапы
      </SectionTitle>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {[...city, ...pickup].map((m) => (
          <ModelCard key={m.id} model={m} />
        ))}
      </div>

      <SectionTitle
        tip="Линейка HAVAL PRO представлена на странице «Каталоги и прайс-листы» дилера. Для части моделей опубликованы только цены «от» по прайс-листам прошлых годов — актуальность подтвердите у дилера."
      >
        HAVAL PRO
      </SectionTitle>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {pro.map((m) => (
          <ModelCard key={m.id} model={m} />
        ))}
      </div>

      {hasGeneratedData && (
        <>
          <SectionTitle tip="Данные собраны скриптом обновления (npm run update:prices) или импортом прайс-листа и не подменяют подтверждённые цены каталога.">
            Собрано автоматически
          </SectionTitle>
          <div className="rounded-[10px] border border-[#363B43] bg-[#1A1D22] p-4">
            <p className="mb-2 text-[11px] text-[#A9AFB7]">
              Источник: {GENERATED_PRICES.source} · сбор {GENERATED_PRICES.fetchedAt}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {GENERATED_PRICES.teasers.map((t) => (
                <div key={`${t.slug}-${t.trimName ?? ''}`} className="rounded-[8px] border border-[#363B43] bg-[#0E1013]/70 px-2.5 py-2">
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#A9AFB7]">
                    {getModel(t.slug)?.name ?? t.slug}
                  </p>
                  <p className="font-display-num mt-0.5 text-[15px] font-bold text-[#F3F4F4]">{fmtMoney(t.price)}</p>
                  {t.trimName && <p className="text-[10px] text-[#A9AFB7]">{t.trimName}</p>}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-[#A9AFB7]">
        * Рекламная минимальная ставка достигается при выполнении условий программ (взнос, срок, КАСКО).
        Данные зафиксированы {fmtDate(CATALOG_FIXED_AT)} по официальным{' '}
        <a className="underline decoration-[#363B43] underline-offset-2 hover:text-[#F3F4F4]" href={HAVAL_PRICE_LISTS_URL} target="_blank" rel="noreferrer">
          прайс-листам производителя
        </a>{' '}
        и страницам{' '}
        <a className="underline decoration-[#363B43] underline-offset-2 hover:text-[#F3F4F4]" href={DEALER_URL} target="_blank" rel="noreferrer">
          дилера
        </a>
        . Расчёт не является одобрением кредита.
      </p>
    </div>
  )
}
