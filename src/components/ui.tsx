import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { cn } from '../utils/cn'

/**
 * Базовые UI-примитивы HAVALGARAGE 3.0 — перенесённая дизайн-система HavalDesign:
 * тёмная тема (#0B0C0E), стеклянные поверхности (#181B1F), фирменный красный
 * акцент #FF334B, моноширинные tabular-цифры, скругления rounded-2xl.
 *
 * Типографика — целые пиксели не меньше 11px (шкала описана в src/index.css).
 * Поля ввода на телефонах — 16px: при меньшем кегле iOS Safari увеличивает
 * страницу при фокусе и не возвращает масштаб обратно.
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

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'glow'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  isLoading?: boolean
}

const BUTTON_BASE =
  'relative inline-flex items-center justify-center text-center font-medium transition-all duration-200 cursor-pointer select-none rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0C0E] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]'

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'text-xs px-3 py-1.5 gap-1.5 min-h-[32px]',
  md: 'text-sm px-4 py-2.5 gap-2 min-h-[40px]',
  lg: 'text-base px-6 py-3.5 gap-2.5 min-h-[48px] font-semibold',
}

// Фон с белым текстом — не светлее #E5223A: иначе контраст ниже WCAG AA 4,5:1
// (на фирменном #FF334B белый текст даёт 3,6:1). Неоновое свечение — тенью.
const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-[#E11D38] hover:bg-[#C8172F] text-white shadow-lg shadow-[#FF334B]/20 hover:shadow-[#FF334B]/40 focus-visible:ring-[#FF334B] border border-[#FF4D61]/30',
  secondary:
    'bg-[#20242A] hover:bg-[#2A3038] text-[#F4F5F6] border border-[#333A44] hover:border-[#4B5563] focus-visible:ring-[#4B5563]',
  outline:
    'bg-transparent hover:bg-white/5 text-[#F4F5F6] border border-[#333A44] hover:border-[#FF334B]/60 focus-visible:ring-[#FF334B]',
  ghost: 'bg-transparent hover:bg-white/5 text-[#A2A7AF] hover:text-[#F4F5F6] focus-visible:ring-white/20',
  danger: 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 focus-visible:ring-red-500',
  glow: 'bg-gradient-to-r from-[#D91A33] to-[#E5223A] text-white shadow-[0_0_20px_rgba(255,51,75,0.4)] hover:shadow-[0_0_30px_rgba(255,51,75,0.6)] border border-white/20',
}

/**
 * Обёртка подписи кнопки. Строчный flex с унаследованным gap: иконка,
 * переданная прямо в children (<Button><Icon /> Текст</Button>), стоит в
 * строку с текстом. Без этого preflight Tailwind (svg { display: block })
 * переносил иконку на отдельную строку над подписью.
 */
const BUTTON_LABEL = 'inline-flex min-w-0 items-center gap-[inherit] [&>svg]:shrink-0'

/** Классы кнопки — общие для <Button> и ссылки-кнопки <ButtonLink> */
function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className = ''): string {
  return cn(BUTTON_BASE, BUTTON_SIZES[size], BUTTON_VARIANTS[variant], className)
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
  return (
    <button className={buttonClasses(variant, size, className)} disabled={disabled || isLoading} {...props}>
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
          <span className={BUTTON_LABEL}>{children}</span>
          {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
        </>
      )}
    </button>
  )
}

/**
 * Ссылка с видом кнопки. Заменяет конструкцию <Link><Button/></Link>:
 * кнопка внутри ссылки — недопустимая разметка (два фокуса подряд,
 * скринридер объявляет «ссылка, кнопка»).
 */
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  className = '',
  children,
  ...props
}: LinkProps & {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
}) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...props}>
      {icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
      <span className={BUTTON_LABEL}>{children}</span>
      {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/*  Поля ввода                                                         */
/* ------------------------------------------------------------------ */

/** Кегль полей: 16px на телефонах (без автозума iOS), 15px с планшета */
const INPUT_TEXT = 'text-base sm:text-[15px]'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Подпись поля. Пустая строка допустима только вместе с aria-label */
  label: string
  suffix?: string
  hint?: string
  badge?: string
  highlighted?: boolean
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, suffix, hint, badge, highlighted = false, className = '', 'aria-describedby': describedBy, ...props },
  ref,
) {
  const hintId = useId()
  // Подсказка — вне <label>: иначе она входит в доступное имя поля и
  // скринридер зачитывает её целиком при каждом фокусе. Связь — через
  // aria-describedby (описание читается после имени, с паузой).
  const ariaDescribedBy = [describedBy, hint ? hintId : null].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('block', className)}>
      <label className="block">
        {(label || badge) && (
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            {label && <span className="text-xs font-medium text-[#A2A7AF]">{label}</span>}
            {badge && (
              <span className="ml-auto rounded-full border border-[#FF334B]/30 bg-[#FF334B]/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#FF6B7E]">
                {badge}
              </span>
            )}
          </div>
        )}
        <div className="relative">
          <input
            ref={ref}
            className={cn(
              'min-h-[44px] w-full rounded-xl border bg-[#111316] px-3.5 py-2.5 font-semibold tabular-nums text-[#F4F5F6] outline-none transition-colors duration-150 placeholder:font-normal placeholder:text-[#8A919B] focus:ring-1 focus:ring-[#FF334B]',
              INPUT_TEXT,
              highlighted
                ? 'border-[#FF334B] bg-[#FF334B]/10 focus:border-[#FF334B]'
                : 'border-[#2B3037] focus:border-[#FF334B]',
              suffix ? 'pr-13' : '',
            )}
            aria-describedby={ariaDescribedBy}
            {...props}
          />
          {suffix && (
            <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-[13px] font-semibold text-[#8A919B]">
              {suffix}
            </span>
          )}
        </div>
      </label>
      {hint && (
        <span id={hintId} className="mt-1.5 block text-xs leading-relaxed text-[#A2A7AF]">
          {hint}
        </span>
      )}
    </div>
  )
})

/**
 * Слайдер с заливкой пройденной части трека. Вид и зона касания (24px)
 * заданы в src/index.css; компонент только передаёт долю заполнения.
 */
export function RangeInput({
  value,
  min,
  max,
  style,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'min' | 'max'> & {
  value: number
  min: number
  max: number
}) {
  const clamped = Math.min(max, Math.max(min, value))
  const fill = max > min ? ((clamped - min) / (max - min)) * 100 : 0
  return (
    <input
      type="range"
      min={min}
      max={max}
      value={clamped}
      style={{ ...style, '--range-fill': `${fill}%` } as CSSProperties}
      {...props}
    />
  )
}

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
          ? 'border-[#FF334B] bg-[#FF334B]/15 text-[#FF6B7E]'
          : 'border-[#333A44] text-[#A2A7AF] hover:border-[#A2A7AF] hover:text-[#F4F5F6]',
      )}
    >
      ?
    </button>
  )
}

function TipText({ children }: { children: ReactNode }) {
  return (
    <p className="mt-1.5 w-full rounded-2xl border border-[#2B3037] bg-[#0B0C0E] px-2.5 py-2 text-xs leading-relaxed text-[#A2A7AF]">
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
      {/* Длинный заголовок переносится, а не обрезается многоточием;
          действие справа уходит на новую строку, если не помещается */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-start gap-2">
          <span className="mt-[3px] h-4 w-1 shrink-0 rounded-full bg-[#FF334B]" aria-hidden="true" />
          <h2 className="font-display-num min-w-0 text-[15px] font-extrabold uppercase leading-snug tracking-wide text-balance break-words text-[#F4F5F6] sm:text-[16px]">
            {children}
          </h2>
          {tip && (
            <span className="mt-px shrink-0">
              <TipButton
                open={open}
                title={typeof children === 'string' ? children : 'раздел'}
                onClick={() => setOpen((v) => !v)}
              />
            </span>
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
  titleAs: TitleTag = 'p',
}: {
  icon: ReactNode
  title: string
  text?: string
  action?: ReactNode
  /** Спокойный кадр сверху карточки (например, фото модели) */
  image?: string | null
  /** Элемент заголовка: h1 — когда пустое состояние и есть вся страница (404) */
  titleAs?: 'p' | 'h1' | 'h2' | 'h3'
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
        <TitleTag className="text-xl font-bold text-[#F4F5F6]">{title}</TitleTag>
        {text && <p className="max-w-[380px] text-sm leading-relaxed text-[#A2A7AF]">{text}</p>}
        {action && <div className="mt-2 flex flex-wrap items-center justify-center gap-3">{action}</div>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Переключатели и выбор                                              */
/* ------------------------------------------------------------------ */

/**
 * Горизонтальный переключатель-табы в эстетике HAVALGARAGE 3.0.
 * Пункты делят ширину поровну, но не сжимаются меньше своей подписи:
 * на узком экране ряд прокручивается, а не обрезает текст многоточием.
 * Клавиатура: стрелки влево/вправо, Home и End (паттерн WAI-ARIA tabs).
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (v: T) => void
  /** Доступное имя группы табов */
  label?: string
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = options.length - 1
    const next =
      e.key === 'ArrowRight'
        ? (index + 1) % options.length
        : e.key === 'ArrowLeft'
          ? (index - 1 + options.length) % options.length
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : null
    if (next === null) return
    e.preventDefault()
    onChange(options[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex gap-1 overflow-x-auto rounded-2xl border border-[#2B3037] bg-[#111316] p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {options.map((o, i) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'relative min-h-[40px] min-w-fit flex-1 basis-0 cursor-pointer whitespace-nowrap rounded-lg px-2 py-2 text-xs font-semibold transition-all duration-150 sm:px-3 sm:text-[13px]',
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
      <span className="relative block">
        <select
          className={cn(
            'min-h-[44px] w-full cursor-pointer appearance-none rounded-xl border border-[#2B3037] bg-[#111316] py-2.5 pl-3.5 pr-10 font-semibold text-[#F4F5F6] outline-none transition-colors focus:border-[#FF334B] focus:ring-1 focus:ring-[#FF334B] disabled:cursor-not-allowed disabled:opacity-60',
            INPUT_TEXT,
          )}
          {...props}
        >
          {children}
        </select>
        {/* appearance-none убирает системную стрелку — рисуем свою */}
        <ChevronDown
          className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A919B]"
          aria-hidden="true"
        />
      </span>
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
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider',
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
    <div className={cn('rounded-xl border px-3.5 py-3 text-xs leading-relaxed', tones[tone], className)}>
      {title && <p className="mb-1 text-[13px] font-bold">{title}</p>}
      <div className="[&_a]:underline [&_a]:underline-offset-2">{children}</div>
    </div>
  )
}

/**
 * Плитка показателя: подпись, крупное моноширинное значение, пояснение.
 * Кегль значения подстраивается под ширину самой плитки (container query):
 * «4 499 000 ₽» помещается и в узкой колонке из четырёх плиток, и на телефоне.
 */
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
    <div className={cn('@container min-w-0 rounded-xl border border-[#242930] bg-[#111316] px-3.5 py-3', className)}>
      <p className="text-[11px] font-semibold uppercase leading-snug tracking-wider text-[#8A919B]">{label}</p>
      <p
        className={cn(
          'mt-1 font-mono text-[length:clamp(14px,12.5cqi,19px)] font-bold leading-tight tabular-nums break-words',
          valueTone,
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1.5 text-[11px] leading-relaxed text-[#8A919B]">{hint}</p>}
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
  const id = useId()
  return (
    <label
      className={cn(
        'flex min-h-[40px] cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2 text-[13px] transition-colors',
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
        // Подсказка остаётся внутри кликабельной карточки, но в имя не входит
        aria-labelledby={`${id}-label`}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      <span>
        <span id={`${id}-label`}>{label}</span>
        {hint && (
          <span id={`${id}-hint`} className="mt-0.5 block text-[11px] text-[#8A919B]">
            {hint}
          </span>
        )}
      </span>
    </label>
  )
}

/**
 * Контейнер с горизонтальной прокруткой (широкие таблицы на телефоне).
 * Когда содержимое действительно не помещается, контейнер получает
 * tabIndex=0 и role="region" с подписью: без этого прокрутить таблицу с
 * клавиатуры нельзя (WCAG 2.1.1). Пока прокрутки нет, лишней остановки
 * при переходе табом не появляется.
 */
export function ScrollRegion({
  label,
  className = '',
  children,
}: {
  label: string
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [scrollable, setScrollable] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setScrollable(el.scrollWidth > el.clientWidth + 1)
    update()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(update)
    observer.observe(el)
    if (el.firstElementChild) observer.observe(el.firstElementChild)
    return () => observer.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      className={cn('overflow-x-auto', className)}
      {...(scrollable ? { tabIndex: 0, role: 'region', 'aria-label': `${label} (прокручивается по горизонтали)` } : {})}
    >
      {children}
    </div>
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
  label,
}: {
  head: ReactNode[]
  children: ReactNode
  firstColumnSticky?: boolean
  className?: string
  /** Подпись области прокрутки; по умолчанию — из заголовков столбцов */
  label?: string
}) {
  const columns = head.filter((h): h is string => typeof h === 'string')
  const regionLabel = label ?? `Таблица: ${columns.slice(0, 3).join(', ')}${columns.length > 3 ? '…' : ''}`
  return (
    <ScrollRegion label={regionLabel} className={cn('rounded-2xl border border-[#2B3037]', className)}>
      <table className="w-full min-w-[520px] border-collapse text-left text-xs">
        <thead className="bg-[#111316]">
          <tr>
            {head.map((cell, i) => (
              <th
                key={i}
                scope="col"
                className={cn(
                  'whitespace-nowrap px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#8A919B]',
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
    </ScrollRegion>
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
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          {title}
          {badge}
        </span>
        {/* Иконка вместо символа «▾»: его нет в Manrope, и строчный span не поворачивался */}
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-[#A2A7AF] transition-transform duration-200', open && 'rotate-180')}
          aria-hidden="true"
        />
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
