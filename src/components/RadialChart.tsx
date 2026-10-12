import React from 'react'

interface Segment {
  label: string
  value: number
  color: string
  formattedValue?: string
}

interface RadialChartProps {
  centerLabel: string
  centerValue: string
  centerSubvalue?: string
  segments: Segment[]
  size?: number
  strokeWidth?: number
  glow?: boolean
}

/**
 * Радиальная диаграмма структуры затрат — перенесена из дизайн-проекта
 * HavalDesign (RadialChart.tsx) без изменений композиции. Данные передаёт
 * приложение (TVO, план покупки); компонент ничего не считает сам.
 */
export const RadialChart: React.FC<RadialChartProps> = ({
  centerLabel,
  centerValue,
  centerSubvalue,
  segments,
  size = 240,
  strokeWidth = 22,
  glow = true,
}) => {
  // уникальный id фильтра: несколько диаграмм на странице не должны делить один <filter>
  const filterId = `radial-glow-${React.useId().replace(/:/g, '')}`
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2

  let currentOffset = 0

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90" role="img" aria-label={`${centerLabel}: ${centerValue}`}>
          {/* Фоновая дорожка */}
          <circle cx={center} cy={center} r={radius} fill="transparent" stroke="#181B1F" strokeWidth={strokeWidth} />

          {glow && (
            <defs>
              <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
          )}

          {/* Сегменты */}
          {total > 0 &&
            segments.map((seg, idx) => {
              const segFraction = Math.max(0, seg.value) / total
              const strokeDasharray = `${segFraction * circumference} ${circumference}`
              const strokeDashoffset = -currentOffset
              currentOffset += segFraction * circumference

              return (
                <circle
                  key={idx}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  filter={glow ? `url(#${filterId})` : undefined}
                  className="transition-all duration-700 ease-out"
                />
              )
            })}
        </svg>

        {/* Центр */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A919B]">{centerLabel}</span>
          <span className="mt-0.5 max-w-full font-mono text-xl font-extrabold tabular-nums tracking-tight break-words text-[#F4F5F6] md:text-2xl">
            {centerValue}
          </span>
          {centerSubvalue && <span className="mt-0.5 text-xs font-medium text-[#A2A7AF]">{centerSubvalue}</span>}
        </div>
      </div>

      {/* Легенда */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
        {segments.map((seg, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm" style={{ backgroundColor: seg.color }} />
            <span className="text-[#A2A7AF]">{seg.label}:</span>
            <span className="font-mono font-semibold text-[#F4F5F6]">{seg.formattedValue || seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
