import { Link, useNavigate } from 'react-router-dom'
import { Car, Gauge, Layers3, ArrowRight } from 'lucide-react'
import type { HavalModel } from '../data/haval'
import { minCurrentPrice, modelSummary } from '../data/haval'
import { fmtMoney } from '../utils/format'
import { estimateMonthlyPayment } from '../utils/payment-estimate'
import { useCalculator } from '../context/CalculatorContext'
import { Badge, Button } from './ui'
import { ModelImage } from './ModelImage'
import { FavoriteButton } from './ActionButtons'

/**
 * Карточка модели в каталоге — композиция VehicleCard из HavalDesign:
 * фото с оверлеем, бейджи, спецификации-пилюли, цена «от» + оценка кредита,
 * кнопки «Кредит» (в калькулятор с выбранной моделью) и «Выбрать».
 * Все значения берутся из реального слоя данных src/data/haval.
 */
export default function ModelCard({ model }: { model: HavalModel }) {
  const navigate = useNavigate()
  const { selectModel } = useCalculator()
  const minTrim = minCurrentPrice(model.id)
  const summary = modelSummary(model.id)
  const comingSoon = model.availability === 'coming-soon'
  const unconfirmed = model.priceListUrl === null

  const estimate =
    summary?.priceFrom != null ? estimateMonthlyPayment(model.id, summary.priceFrom) : null

  const openCalculator = () => {
    selectModel(model.id)
    navigate('/calculator')
  }

  return (
    <article className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#2B3037] bg-[#181B1F] text-[#F4F5F6] transition-all duration-300 hover:border-[#FF334B]/50 hover:bg-[#1C2026] hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.8),0_0_20px_rgba(255,51,75,0.12)]">
      {/* Верхние бейджи и действия */}
      <div className="pointer-events-none absolute left-3 right-3 top-3 z-10 flex items-start justify-between">
        <div className="pointer-events-auto flex flex-wrap gap-1.5">
          <Badge variant={model.family === 'PRO' ? 'red' : 'glass'} size="sm">
            {model.family === 'PRO' ? 'HAVAL PRO' : model.family === 'PICKUP' ? 'Пикап' : 'HAVAL CITY'}
          </Badge>
          {comingSoon && (
            <Badge variant="amber" size="sm">
              скоро в продаже
            </Badge>
          )}
          {unconfirmed && (
            <Badge variant="amber" size="sm">
              вне официального каталога
            </Badge>
          )}
        </div>
        <div className="pointer-events-auto">
          <FavoriteButton modelId={model.id} />
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        {/* Фото модели (кликабельная зона) */}
        <Link
          to={`/models/${model.slug}`}
          className="relative block h-44 w-full overflow-hidden bg-[#0B0C0E] sm:h-52"
          aria-label={`${model.name} — подробнее`}
        >
          <ModelImage
            model={model}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#181B1F] via-transparent to-transparent"
            aria-hidden="true"
          />
        </Link>

        <div className="flex flex-1 flex-col gap-3 p-4 md:p-5">
          {/* Название */}
          <div className="flex items-start justify-between gap-2">
            <Link to={`/models/${model.slug}`} className="min-w-0">
              <h3 className="truncate text-lg font-bold tracking-tight text-[#F4F5F6] group-hover:text-white">
                {model.name}
              </h3>
              <p className="mt-0.5 line-clamp-1 text-xs text-[#A2A7AF]">{model.bodyType}</p>
            </Link>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[#A2A7AF] transition-all group-hover:translate-x-0.5 group-hover:text-[#FF334B]" />
          </div>

          {/* Спецификации-пилюли (реальные данные) */}
          <div className="grid grid-cols-3 gap-2 border-y border-[#2B3037]/60 py-2 text-xs">
            <div className="flex flex-col">
              <span className="flex items-center gap-1 text-[10px] text-[#747B85]">
                <Gauge className="h-3 w-3 text-[#FF334B]" /> Мощность
              </span>
              <span className="mt-0.5 font-mono font-semibold tabular-nums text-[#F4F5F6]">
                {summary?.powerRange ?? 'нет данных'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="flex items-center gap-1 text-[10px] text-[#747B85]">
                <Layers3 className="h-3 w-3 text-[#3B82F6]" /> Комплектаций
              </span>
              <span className="mt-0.5 font-mono font-semibold tabular-nums text-[#F4F5F6]">
                {summary ? summary.trims.length : '—'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="flex items-center gap-1 text-[10px] text-[#747B85]">
                <Car className="h-3 w-3 text-[#10B981]" /> Тип кузова
              </span>
              <span className="mt-0.5 truncate font-semibold text-[#F4F5F6]" title={model.bodyType}>
                {model.bodyType}
              </span>
            </div>
          </div>

          {/* Цена и платёж */}
          <div className="flex items-end justify-between pt-1">
            <div>
              <div className="text-[11px] text-[#747B85]">
                {comingSoon || !minTrim?.basePrice ? 'Цена' : 'Цена от · прайс-лист'}
              </div>
              <div className="font-mono text-xl font-extrabold tabular-nums tracking-tight text-[#F4F5F6]">
                {comingSoon || !minTrim?.basePrice ? 'нет подтверждённых данных' : fmtMoney(minTrim.basePrice)}
              </div>
            </div>
            {estimate && (
              <div className="text-right">
                <div className="text-[10px] font-medium text-emerald-400">в кредит от</div>
                <div className="font-mono text-sm font-bold tabular-nums text-emerald-400">
                  {fmtMoney(estimate.monthly)}/мес
                </div>
              </div>
            )}
          </div>

          {/* Действия */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={openCalculator}>
              Кредит
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<ArrowRight className="h-3.5 w-3.5" />}
              iconPosition="right"
              onClick={() => navigate(`/models/${model.slug}`)}
            >
              Выбрать
            </Button>
          </div>
        </div>
      </div>
    </article>
  )
}
