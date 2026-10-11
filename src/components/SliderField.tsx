import React from 'react'
import { fmtMoney } from '../utils/format'

interface SliderFieldProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  suffix?: string
  onChange: (val: number) => void
  quickPresets?: { label: string; value: number }[]
  helperText?: string
  disabled?: boolean
}

/**
 * Числовое поле со слайдером — перенесено из HavalDesign (SliderField.tsx).
 * Форматирование сумм использует существующий fmtMoney приложения.
 */
export const SliderField: React.FC<SliderFieldProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '₽',
  suffix,
  onChange,
  quickPresets,
  helperText,
  disabled = false,
}) => {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-[#A2A7AF]">{label}</label>
        <div className="flex items-center gap-1.5 rounded-lg border border-[#2B3037] bg-[#111316] px-3 py-1.5 transition-colors focus-within:border-[#FF334B]">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            disabled={disabled}
            onChange={(e) => {
              const num = Number(e.target.value)
              if (!isNaN(num)) {
                onChange(Math.min(max * 2, Math.max(0, num)))
              }
            }}
            className="w-28 bg-transparent text-right font-mono text-sm font-bold tabular-nums text-[#F4F5F6] focus:outline-none"
          />
          <span className="text-xs font-medium text-[#747B85]">{unit}</span>
        </div>
      </div>

      <div className="relative pb-1 pt-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[#20242A]"
          style={{
            background: `linear-gradient(to right, #FF334B 0%, #FF334B ${percentage}%, #20242A ${percentage}%, #20242A 100%)`,
            accentColor: '#FF334B',
          }}
          aria-label={label}
        />
        <div className="mt-1 flex justify-between font-mono text-[11px] text-[#747B85]">
          <span>{fmtMoney(min)}</span>
          {suffix && <span className="text-[#A2A7AF]">{suffix}</span>}
          <span>{fmtMoney(max)}</span>
        </div>
      </div>

      {quickPresets && quickPresets.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {quickPresets.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onChange(preset.value)}
              className={`cursor-pointer rounded-md px-2.5 py-1 text-xs transition-colors ${
                value === preset.value
                  ? 'border border-[#FF334B]/40 bg-[#FF334B]/20 font-semibold text-[#FF6B7E]'
                  : 'border border-[#2B3037] bg-[#20242A] text-[#A2A7AF] hover:bg-[#2A3038] hover:text-white'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      {helperText && <p className="text-xs text-[#747B85]">{helperText}</p>}
    </div>
  )
}
