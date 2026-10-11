import {
  forwardRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'
import { cn } from '../utils/cn'

/**
 * Базовые UI-примитивы HAVALGARAGE 3.0 — перенесённая дизайн-система HavalDesign:
 * тёмная тема (#0B0C0E), стеклянные поверхности (#181B1F), фирменный красный
 * акцент #FF334B, моноширинные tabular-цифры, скругления rounded-2xl.
 */

/* ------------------------------------------------------------------ */
/*  Поверхности                                                        */
/* ------------------------------------------------------------------ */

export function Card({
  children,
  className = '',
  style,
  glass = false,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
  /** Стеклянная панель HavalDesign (blur + градиент) */
  glass?: boolean
}) {
  return (
    <div
      style={style}
      className={cn(
        'rounded-2xl border border-[#2B3037] bg-[#181B1F] p-4 text-[#F4F5F6]',
        glass && 'glass-card',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Карточка с фирменным hover-подъёмом и красным свечением HavalDesign */
export function HoverCard({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'glass-card glass-card-hover rounded-2xl p-4 text-[#F4F5F6]',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Кнопки (Button из HavalDesign, API совместимо с приложением)        */
/* ------------------------------------------------------------------ */

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'glow'
  size?: 'sm' | 'md' | 'lg'
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  isLoading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  isLoading = false,
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    'relative inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer select-none rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0C0E] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]'

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5 min-h-[32px]',
    md: 'text-sm px-4 py-2.5 gap-2 min-h-[40px]',
    lg: 'text-base px-6 py-3.5 gap-2.5 min-h-[48px] font-semibold',
  }

  const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary:
      'bg-[#FF334B] hover:bg-[#E5223A] text-white shadow-lg shadow-[#FF334B]/20 hover:shadow-[#FF334B]/40 focus-visible:ring-[#FF334B] border border-[#FF4D61]/30',
    secondary:
      'bg-[#20242A] hover:bg-[#2A3038] text-[#F4F5F6] border border-[#333A44] hover:border-[#4B5563] focus-visible:ring-[#4B5563]',
    outline:
      'bg-transparent hover:bg-white/5 text-[#F4F5F6] border border-[#333A44] hover:border-[#FF334B]/60 focus-visible:ring-[#FF334B]',
    ghost:
      'bg-transparent hover:bg-white/5 text-[#A2A7AF] hover:text-[#F4F5F6] focus-visible:ring-white/20',
    danger: 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 focus-visible:ring-red-500',
    glow: 'bg-gradient-to-r from-[#FF334B] to-[#FF5E74] text-white shadow-[0_0_20px_rgba(255,51,75,0.4)] hover:shadow-[0_0_30px_rgba(255,51,75,0.6)] border border-white/20',
  }

  return (
    <button
      className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="h-4 w-4 animate-spin text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
          <span>{children}</span>
          {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
        </>
      )}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Поля ввода                                                         */
/* ------------------------------------------------------------------ */

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  suffix?: string
  hint?: string
  badge?: string
  highlighted?: boolean
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, suffix, hint, badge, highlighted = false, className = '', ...props },
  ref,
) {
  return (
    <label className={cn('block', className)}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-[#A2A7AF]">{label}</span>
        {badge && (
          <span className="rounded-full border border-[#FF334B]/30 bg-[#FF334B]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#FF6B7E]">
            {badge}
          </span>
        )}
      </div>
      <div className="relative">
        <input
          ref={ref}
          className={cn(
            'min-h-[44px] w-full rounded-xl border bg-[#111316] px-3.5 py-2.5 text-[15px] font-semibold tabular-nums text-[#F4F5F6] outline-none transition-colors duration-160 placeholder:font-normal placeholder:text-[#747B85]',
            highlighted
              ? 'border-[#FF334B] bg-[#FF334B]/10 focus:border-[#FF334B]'
              : 'border-[#2B3037] focus:border-[#FF334B]',
            suffix ? 'pr-13' : '',
          )}
          {...props}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-[13px] font-semibold text-[#747B85]">
            {suffix}
          </span>
        )}
      </div>
      {hint && <span className="mt-1.5 block text-[11.5px] leading-relaxed text-[#A2A7AF]">{hint}</span>}
    </label>
  )
})

/* ------------------------------------------------------------------ */
/*  Подсказки «?»                                                      */
/* ------------------------------------------------------------------ */

function TipButton({ open, title, onClick }: { open: boolean; title: string; onClick(): void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label={open ? `Скрыть пояснение: ${title}` : `Что это: ${title}`}
      title={`Что это: ${title}`}
      className={cn(
        'inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full border text-[11px] font-bold leading-none transition-colors',
        open
          ? 'border-[#FF334B] bg-[#FF334B]/15 text-[#FF334B]'
          : 'border-[#333A44] text-[#A2A7AF] hover:border-[#A2A7AF] hover:text-[#F4F5F6]',
      )}
    >
      ?
    </button>
  )
}

function TipText({ children }: { children: ReactNode }) {
  return (
    <p className="mt-1.5 w-full rounded-2xl border border-[#2B3037] bg-[#0B0C0E] px-2.5 py-2 text-[11.5px] leading-relaxed text-[#A2A7AF]">
      {children}
    </p>
  )
}

/** Кнопка-подсказка «?»: раскрывает пояснение к термину прямо под строкой. */
export function InfoTip({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <TipButton open={open} title={title} onClick={() => setOpen((v) => !v)} />
      {open && <TipText>{children}</TipText>}
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Заголовки секций                                                   */
/* ------------------------------------------------------------------ */

export function SectionTitle({
  children,
  action,
  tip,
}: {
  children: ReactNode
  action?: ReactNode
  tip?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mb-3 mt-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-4 w-1 shrink-0 rounded-full bg-[#FF334B]" aria-hidden="true" />
          <h2 className="font-display-num truncate text-[16px] font-extrabold uppercase tracking-wide text-[#F4F5F6]">
            {children}
          </h2>
          {tip && (
            <TipButton
              open={open}
              title={typeof children === 'string' ? children : 'раздел'}
              onClick={() => setOpen((v) => !v)}
            />
          )}
        </div>
        {action}
      </div>
      {tip && open && <TipText>{tip}</TipText>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Статусы и состояния                                                */
/* ------------------------------------------------------------------ */

export function Spinner({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <div
      className={cn('animate-spin rounded-full border-[2.5px] border-[#2B3037] border-t-[#FF334B]', className)}
      role="status"
      aria-label="Загрузка"
    />
  )
}

export function EmptyState({
  icon,
  title,
  text,
  action,
  image,
}: {
  icon: ReactNode
  title: string
  text?: string
  action?: ReactNode
  /** Спокойный кадр сверху карточки (например, фото модели) */
  image?: string | null
}) {
  return (
    <div className="glass-card mx-auto my-6 flex max-w-lg flex-col items-center justify-center overflow-hidden rounded-2xl border-[#2B3037] text-center">
      {image && (
        <div className="relative h-28 w-full overflow-hidden border-b border-[#2B3037]/70 bg-[#0B0C0E]">
          <img alt="" loading="lazy" className="h-full w-full object-cover object-center opacity-80" src={image} />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#181B1F] via-transparent to-transparent"
            aria-hidden="true"
          />
        </div>
      )}
      <div className="flex flex-col items-center gap-2.5 px-6 py-8 text-center md:px-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#333A44] bg-[#20242A] text-[#FF334B]">
          {icon}
        </div>
        <p className="text-xl font-bold text-[#F4F5F6]">{title}</p>
        {text && <p className="max-w-[380px] text-sm leading-relaxed text-[#A2A7AF]">{text}</p>}
        {action && <div className="mt-2 flex flex-wrap items-center justify-center gap-3">{action}</div>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Переключатели и выбор                                              */
/* ------------------------------------------------------------------ */

/** Горизонтальный переключатель-табы в эстетике HAVALGARAGE 3.0 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div
      role="tablist"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      className="grid gap-1 rounded-2xl border border-[#2B3037] bg-[#111316] p-1"
    >
      {options.map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative min-h-[40px] cursor-pointer truncate rounded-lg px-2.5 py-2 text-[13px] font-semibold transition-all duration-150',
              active
                ? 'border border-[#333A44] bg-[#20242A] text-white shadow-sm'
                : 'border border-transparent text-[#A2A7AF] hover:bg-white/5 hover:text-[#F4F5F6]',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Select({
  label,
  className = '',
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className={cn('block', className)}>
      {label && <span className="mb-1.5 block text-xs font-medium text-[#A2A7AF]">{label}</span>}
      <select
        className="min-h-[44px] w-full appearance-none rounded-2xl border border-[#2B3037] bg-[#111316] px-3.5 py-2.5 text-[15px] font-semibold text-[#F4F5F6] outline-none transition-colors focus:border-[#FF334B]"
        {...props}
      >
        {children}
      </select>
    </label>
  )
}

/* ------------------------------------------------------------------ */
/*  Бейджи                                                             */
/* ------------------------------------------------------------------ */

type BadgeVariant = 'red' | 'emerald' | 'amber' | 'blue' | 'gray' | 'glass'

const badgeVariants: Record<BadgeVariant, string> = {
  red: 'bg-[#FF334B]/15 text-[#FF6B7E] border border-[#FF334B]/30',
  emerald: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  amber: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  blue: 'bg-sky-500/15 text-sky-400 border border-sky-500/30',
  gray: 'bg-[#20242A] text-[#A2A7AF] border border-[#2B3037]',
  glass: 'bg-white/5 text-[#F4F5F6] border border-white/10 backdrop-blur-md',
}

/** Бейдж HavalDesign (Badge.tsx) — скруглённая пилюля с иконкой */
export function Badge({
  children,
  variant = 'gray',
  size = 'md',
  icon,
  className = '',
}: {
  children: ReactNode
  variant?: BadgeVariant
  size?: 'sm' | 'md'
  icon?: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full tracking-wide',
        size === 'sm' ? 'gap-1 px-2 py-0.5 text-[11px] font-medium' : 'gap-1.5 px-2.5 py-1 text-xs font-medium',
        badgeVariants[variant],
        className,
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  )
}

/** Бейдж-табличка «технадпись» — тот же язык, что и Badge, компактный формат */
export function Tag({
  children,
  tone = 'default',
}: {
  children: ReactNode
  tone?: 'default' | 'warn' | 'success' | 'accent'
}) {
  const tones = {
    default: badgeVariants.gray,
    warn: badgeVariants.amber,
    success: badgeVariants.emerald,
    accent: badgeVariants.red,
  } as const
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider',
        tones[tone],
      )}
    >
      {children}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Выноски и плитки                                                    */
/* ------------------------------------------------------------------ */

/** Информационная выноска (info / warn / danger / success) */
export function Callout({
  tone = 'info',
  title,
  children,
  className = '',
}: {
  tone?: 'info' | 'warn' | 'danger' | 'success'
  title?: ReactNode
  children: ReactNode
  className?: string
}) {
  const tones = {
    info: 'border-[#2B3037] bg-[#181B1F]/80 text-[#A2A7AF]',
    warn: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
    danger: 'border-red-500/40 bg-red-600/10 text-red-400',
    success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
  } as const
  return (
    <div className={cn('rounded-xl border px-3.5 py-3 text-[12px] leading-relaxed', tones[tone], className)}>
      {title && <p className="mb-1 text-[12.5px] font-bold">{title}</p>}
      <div className="[&_a]:underline [&_a]:underline-offset-2">{children}</div>
    </div>
  )
}

/** Плитка показателя: подпись, крупное моноширинное значение, пояснение */
export function StatTile({
  label,
  value,
  hint,
  tone = 'default',
  className = '',
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: 'default' | 'accent' | 'success' | 'warn'
  className?: string
}) {
  const valueTone = {
    default: 'text-[#F4F5F6]',
    accent: 'text-[#FF6B7E]',
    success: 'text-emerald-400',
    warn: 'text-amber-400',
  }[tone]
  return (
    <div className={cn('rounded-xl border border-[#242930] bg-[#111316] px-3.5 py-3', className)}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#747B85]">{label}</p>
      <p className={cn('mt-1 font-mono text-[19px] font-bold leading-none tabular-nums', valueTone)}>{value}</p>
      {hint && <p className="mt-1.5 text-[10.5px] leading-relaxed text-[#747B85]">{hint}</p>}
    </div>
  )
}

export function Checkbox({
  label,
  checked,
  onChange,
  disabled,
  hint,
}: {
  label: ReactNode
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  hint?: string
}) {
  return (
    <label
      className={cn(
        'flex min-h-[40px] cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2 text-[12.5px] transition-colors',
        checked
          ? 'border-[#FF334B]/50 bg-[#FF334B]/10 text-[#F4F5F6]'
          : 'border-[#2B3037] bg-[#111316] text-[#A2A7AF] hover:border-[#333A44] hover:text-[#F4F5F6]',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 accent-[#FF334B]"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        {label}
        {hint && <span className="mt-0.5 block text-[10.5px] text-[#747B85]">{hint}</span>}
      </span>
    </label>
  )
}

/**
 * Адаптивная таблица: на узких экранах скроллится внутри контейнера,
 * горизонтальный скролл страницы не появляется.
 */
export function DataTable({
  head,
  children,
  firstColumnSticky = true,
  className = '',
}: {
  head: ReactNode[]
  children: ReactNode
  firstColumnSticky?: boolean
  className?: string
}) {
  return (
    <div className={cn('overflow-x-auto rounded-2xl border border-[#2B3037]', className)}>
      <table className="w-full min-w-[520px] border-collapse text-left text-[12px]">
        <thead className="bg-[#111316]">
          <tr>
            {head.map((cell, i) => (
              <th
                key={i}
                scope="col"
                className={cn(
                  'whitespace-nowrap px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#747B85]',
                  firstColumnSticky && i === 0 ? 'sticky left-0 z-10 bg-[#111316]' : '',
                )}
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#242930] bg-[#181B1F]">{children}</tbody>
      </table>
    </div>
  )
}

export function TableCell({
  children,
  sticky = false,
  strong = false,
  className = '',
}: {
  children: ReactNode
  sticky?: boolean
  strong?: boolean
  className?: string
}) {
  return (
    <td
      className={cn(
        'px-3 py-2.5 align-top text-[#A2A7AF]',
        strong ? 'font-bold text-[#F4F5F6]' : '',
        sticky ? 'sticky left-0 z-10 bg-[#181B1F] font-semibold text-[#F4F5F6]' : '',
        className,
      )}
    >
      {children}
    </td>
  )
}

/** Раскрывающийся блок (доступен с клавиатуры, без скрытого контента от скринридера) */
export function Disclosure({
  title,
  defaultOpen = false,
  children,
  badge,
}: {
  title: ReactNode
  defaultOpen?: boolean
  children: ReactNode
  badge?: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="overflow-hidden rounded-2xl border border-[#2B3037] bg-[#181B1F]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-[46px] w-full cursor-pointer items-center justify-between gap-2 px-4 py-3 text-left text-[13px] font-bold text-[#F4F5F6] transition-colors hover:bg-[#20242A]"
      >
        <span className="flex items-center gap-2">
          {title}
          {badge}
        </span>
        <span className={cn('text-[#A2A7AF] transition-transform', open ? 'rotate-180' : '')} aria-hidden="true">
          ▾
        </span>
      </button>
      {open && <div className="animate-fadeIn border-t border-[#242930] px-4 py-3.5">{children}</div>}
    </div>
  )
}

/** Индикатор состояния данных: подтверждено / требует проверки / нет данных */
export function DataStatus({ status }: { status: 'confirmed' | 'needs-check' | 'missing' | 'archived' }) {
  const map = {
    confirmed: { tone: 'success' as const, label: 'подтверждено' },
    'needs-check': { tone: 'warn' as const, label: 'требует проверки' },
    missing: { tone: 'default' as const, label: 'нет данных' },
    archived: { tone: 'warn' as const, label: 'архив' },
  }
  return <Tag tone={map[status].tone}>{map[status].label}</Tag>
}
