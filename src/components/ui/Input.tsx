import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { AlertCircle, ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'

/* ── Field wrapper ──────────────────────────────────────────────────────── */

interface FieldProps {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  children: ReactNode
  className?: string
}

export function Field({ label, hint, error, required, children, className }: FieldProps) {
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="cx-label">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-danger">
          <AlertCircle className="size-3.5" aria-hidden /> {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  )
}

/* ── Input ──────────────────────────────────────────────────────────────── */

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  icon?: ReactNode
  suffix?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, icon, suffix, className, id, required, ...rest },
  ref
) {
  const generated = useId()
  const inputId = id ?? generated
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className}>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={Boolean(error)}
          className={cn(
            'cx-input',
            icon && 'pl-10',
            suffix && 'pr-10',
            error && 'border-danger focus:border-danger focus:ring-danger/20'
          )}
          {...rest}
        />
        {suffix && (
          <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-muted">
            {suffix}
          </span>
        )}
      </div>
    </Field>
  )
})

/* ── Textarea ───────────────────────────────────────────────────────────── */

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, id, required, rows = 4, ...rest },
  ref
) {
  const generated = useId()
  const fieldId = id ?? generated
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className}>
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        required={required}
        aria-invalid={Boolean(error)}
        className={cn('cx-input resize-y leading-relaxed', error && 'border-danger')}
        {...rest}
      />
    </Field>
  )
})

/* ── Select ─────────────────────────────────────────────────────────────── */

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: string
  error?: string
  options: { value: string; label: string; disabled?: boolean }[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, options, placeholder, className, id, required, ...rest },
  ref
) {
  const generated = useId()
  const selectId = id ?? generated
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className}>
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          required={required}
          className={cn('cx-input appearance-none pr-9', error && 'border-danger')}
          {...rest}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
      </div>
    </Field>
  )
})

/* ── Checkbox / switch ──────────────────────────────────────────────────── */

export function Checkbox({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: ReactNode
  description?: string
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface-2 p-3',
        'transition hover:bg-surface-3',
        disabled && 'cursor-not-allowed opacity-60'
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-[var(--cx-brand)]"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </span>
    </label>
  )
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label?: ReactNode
  description?: string
  disabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      {label && (
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">{label}</p>
          {description && <p className="text-xs text-muted">{description}</p>}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={typeof label === 'string' ? label : 'Toggle'}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors',
          checked ? 'bg-brand' : 'bg-border-strong',
          disabled && 'cursor-not-allowed opacity-60'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-5.5' : 'translate-x-0.5'
          )}
        />
      </button>
    </div>
  )
}

/* ── Radio card group ───────────────────────────────────────────────────── */

export function RadioCards<T extends string>({
  options,
  value,
  onChange,
  name,
  columns = 2,
}: {
  options: { value: T; label: string; description?: string; icon?: ReactNode }[]
  value: T | ''
  onChange: (v: T) => void
  name: string
  columns?: 1 | 2 | 3 | 4
}) {
  const grid = { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' }[columns]
  return (
    <div className={cn('grid grid-cols-1 gap-2', grid)} role="radiogroup">
      {options.map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            name={name}
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex items-center gap-2.5 rounded-xl border p-3 text-left transition',
              active
                ? 'border-brand bg-brand-soft ring-2 ring-brand/25'
                : 'border-border bg-surface-2 hover:border-border-strong'
            )}
          >
            {o.icon && <span className={cn('grid size-8 place-items-center rounded-lg', active ? 'bg-brand text-white' : 'bg-surface-3 text-muted')}>{o.icon}</span>}
            <span className="min-w-0">
              <span className={cn('block text-sm font-semibold', active ? 'text-brand' : 'text-ink')}>
                {o.label}
              </span>
              {o.description && <span className="block text-xs text-muted">{o.description}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}
