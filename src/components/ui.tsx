import {
  forwardRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'

/** Базовые UI-примитивы дизайн-системы HAVAL Garage
 *  (тёмная тема, акцент — фирменный красный HAVAL #E4002B). */

export function Card({
  children,
  className = '',
  style,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <div
      style={style}
      className={`rounded-[10px] border border-[#363B43]/85 bg-[#1A1D22] p-4 text-[#F3F4F4] ${className}`}
    >
      {children}
    </div>
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  const styles: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary:
      'bg-[#E4002B] text-[#F3F4F4] border border-[#E4002B] hover:bg-[#B80023] hover:border-[#B80023] disabled:opacity-45',
    secondary:
      'bg-[#23272D] text-[#F3F4F4] border border-[#363B43] hover:border-[#A9AFB7]/60 hover:bg-[#2B3038] disabled:opacity-45',
    ghost:
      'bg-transparent text-[#A9AFB7] border border-transparent hover:bg-[#23272D] hover:text-[#F3F4F4] disabled:opacity-45',
    danger:
      'bg-[#EF4444]/12 text-[#EF4444] border border-[#EF4444]/35 hover:bg-[#EF4444]/20 disabled:opacity-45',
  }
  return (
    <button
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] px-4 py-2.5 text-[13.5px] font-semibold tracking-tight transition-all duration-180 active:translate-y-[1px] disabled:pointer-events-none ${styles[variant]} ${className}`}
      {...props}
    />
  )
}

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
    <label className={`block ${className}`}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-semibold text-[#A9AFB7]">{label}</span>
        {badge && (
          <span className="rounded-[6px] border border-[#E4002B]/45 bg-[#E4002B]/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#F3F4F4]">
            {badge}
          </span>
        )}
      </div>
      <div className="relative">
        <input
          ref={ref}
          className={`min-h-[46px] w-full rounded-[10px] border px-3.5 py-2.5 text-[15px] font-semibold text-[#F3F4F4] outline-none transition-colors duration-160 placeholder:font-normal placeholder:text-[#A9AFB7]/40 ${
            highlighted
              ? 'border-[#E4002B] bg-[#E4002B]/10 focus:border-[#E4002B]'
              : 'border-[#363B43] bg-[#23272D] focus:border-[#E4002B]'
          } ${suffix ? 'pr-13' : ''}`}
          {...props}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-[13px] font-semibold text-[#A9AFB7]">
            {suffix}
          </span>
        )}
      </div>
      {hint && <span className="mt-1.5 block text-[11.5px] leading-relaxed text-[#A9AFB7]">{hint}</span>}
    </label>
  )
})

/** Кружок «?» — одинаковый для подсказок в карточках и в заголовках секций */
function TipButton({ open, title, onClick }: { open: boolean; title: string; onClick(): void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label={open ? `Скрыть пояснение: ${title}` : `Что это: ${title}`}
      title={`Что это: ${title}`}
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold leading-none transition-colors ${
        open
          ? 'border-[#E4002B] bg-[#E4002B]/15 text-[#E4002B]'
          : 'border-[#4A5058] text-[#A9AFB7] hover:border-[#A9AFB7] hover:text-[#F3F4F4]'
      }`}
    >
      ?
    </button>
  )
}

function TipText({ children }: { children: ReactNode }) {
  return (
    <p className="mt-1.5 w-full rounded-[8px] border border-[#363B43] bg-[#0E1013] px-2.5 py-2 text-[11.5px] leading-relaxed text-[#A9AFB7]">
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
    <div className="mb-2.5 mt-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-4 w-1 shrink-0 rounded-full bg-[#E4002B]" aria-hidden="true" />
          <h2 className="font-display-num truncate text-[16px] font-semibold uppercase tracking-wide text-[#F3F4F4]">
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

export function Spinner({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <div
      className={`animate-spin rounded-full border-[2.5px] border-[#363B43] border-t-[#E4002B] ${className}`}
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
    <div className="overflow-hidden rounded-[10px] border border-[#363B43] bg-[#1A1D22]">
      {image && (
        <div className="relative h-28 w-full overflow-hidden border-b border-[#363B43]/70 bg-[#0E1013]">
          <img alt="" loading="lazy" className="h-full w-full object-cover object-center opacity-80" src={image} />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1A1D22] via-transparent to-transparent"
            aria-hidden="true"
          />
        </div>
      )}
      <div className="flex flex-col items-center gap-2.5 px-5 py-7 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-[#363B43] bg-[#23272D] text-[#E4002B]">
          {icon}
        </div>
        <p className="text-[15px] font-bold text-[#F3F4F4]">{title}</p>
        {text && <p className="max-w-[340px] text-[13px] leading-relaxed text-[#A9AFB7]">{text}</p>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  )
}

/** Горизонтальный переключатель-табы в эстетике исходного проекта */
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
      className="grid gap-1 rounded-[10px] border border-[#363B43] bg-[#1A1D22] p-1"
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
            className={`relative min-h-[44px] truncate rounded-[8px] px-2.5 py-2 text-[13px] font-bold transition-all duration-180 ${
              active
                ? 'bg-[#23272D] text-[#F3F4F4] shadow-[inset_0_-2px_0_0_#E4002B]'
                : 'text-[#A9AFB7] hover:text-[#F3F4F4]'
            }`}
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
    <label className={`block ${className}`}>
      {label && <span className="mb-1.5 block text-[12.5px] font-semibold text-[#A9AFB7]">{label}</span>}
      <select
        className="min-h-[46px] w-full appearance-none rounded-[10px] border border-[#363B43] bg-[#23272D] px-3.5 py-2.5 text-[15px] font-semibold text-[#F3F4F4] outline-none transition-colors focus:border-[#E4002B]"
        {...props}
      >
        {children}
      </select>
    </label>
  )
}

/** Бейдж-табличка в стиле технадписи */
export function Tag({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'warn' | 'success' | 'accent' }) {
  const tones = {
    default: 'border-[#363B43] bg-[#23272D] text-[#A9AFB7]',
    warn: 'border-[#F5A623]/40 bg-[#F5A623]/10 text-[#F5A623]',
    success: 'border-[#16B374]/40 bg-[#16B374]/10 text-[#16B374]',
    accent: 'border-[#E4002B]/45 bg-[#E4002B]/12 text-[#F3F4F4]',
  } as const
  return (
    <span className={`inline-flex items-center gap-1 rounded-[6px] border px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider ${tones[tone]}`}>
      {children}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Дополнительные примитивы: выноски, плитки, таблицы, чекбоксы        */
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
    info: 'border-[#363B43] bg-[#0E1013] text-[#A9AFB7]',
    warn: 'border-[#F5A623]/45 bg-[#F5A623]/10 text-[#F5A623]',
    danger: 'border-[#EF4444]/45 bg-[#EF4444]/10 text-[#EF4444]',
    success: 'border-[#16B374]/45 bg-[#16B374]/10 text-[#16B374]',
  } as const
  return (
    <div className={`rounded-[10px] border px-3.5 py-3 text-[12px] leading-relaxed ${tones[tone]} ${className}`}>
      {title && <p className="mb-1 text-[12.5px] font-bold">{title}</p>}
      <div className="[&_a]:underline [&_a]:underline-offset-2">{children}</div>
    </div>
  )
}

/** Плитка показателя: подпись, крупное значение, пояснение */
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
    default: 'text-[#F3F4F4]',
    accent: 'text-[#E4002B]',
    success: 'text-[#16B374]',
    warn: 'text-[#F5A623]',
  }[tone]
  return (
    <div className={`rounded-[10px] border border-[#363B43]/85 bg-[#0E1013]/70 px-3.5 py-3 ${className}`}>
      <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#A9AFB7]">{label}</p>
      <p className={`font-display-num mt-1 text-[20px] font-bold leading-none ${valueTone}`}>{value}</p>
      {hint && <p className="mt-1.5 text-[10.5px] leading-relaxed text-[#A9AFB7]">{hint}</p>}
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
      className={`flex min-h-[40px] cursor-pointer items-start gap-2.5 rounded-[8px] border px-3 py-2 text-[12.5px] transition-colors ${
        checked
          ? 'border-[#E4002B]/60 bg-[#E4002B]/10 text-[#F3F4F4]'
          : 'border-[#363B43] bg-[#23272D] text-[#A9AFB7] hover:text-[#F3F4F4]'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 accent-[#E4002B]"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        {label}
        {hint && <span className="mt-0.5 block text-[10.5px] text-[#A9AFB7]">{hint}</span>}
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
    <div className={`overflow-x-auto rounded-[10px] border border-[#363B43]/85 ${className}`}>
      <table className="w-full min-w-[520px] border-collapse text-left text-[12px]">
        <thead className="bg-[#23272D]">
          <tr>
            {head.map((cell, i) => (
              <th
                key={i}
                scope="col"
                className={`whitespace-nowrap px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#A9AFB7] ${
                  firstColumnSticky && i === 0 ? 'sticky left-0 z-10 bg-[#23272D]' : ''
                }`}
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#363B43]/70 bg-[#1A1D22]">{children}</tbody>
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
      className={`px-3 py-2.5 align-top text-[#A9AFB7] ${strong ? 'font-bold text-[#F3F4F4]' : ''} ${
        sticky ? 'sticky left-0 z-10 bg-[#1A1D22] font-semibold text-[#F3F4F4]' : ''
      } ${className}`}
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
    <div className="overflow-hidden rounded-[10px] border border-[#363B43]/85 bg-[#1A1D22]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-[46px] w-full items-center justify-between gap-2 px-4 py-3 text-left text-[13px] font-bold text-[#F3F4F4] transition-colors hover:bg-[#23272D]"
      >
        <span className="flex items-center gap-2">
          {title}
          {badge}
        </span>
        <span className={`text-[#A9AFB7] transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true">
          ▾
        </span>
      </button>
      {open && <div className="border-t border-[#363B43]/70 px-4 py-3.5">{children}</div>}
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
