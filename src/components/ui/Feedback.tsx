import type { ReactNode } from 'react'
import { AlertTriangle, Inbox, Loader2, RefreshCw, WifiOff } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from './Button'

/* ── Loading ────────────────────────────────────────────────────────────── */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('cx-skeleton rounded-lg', className)} />
}

export function LoadingState({ label = 'Loading…', rows = 3 }: { label?: string; rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-live="polite" aria-label={label}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-2.5 w-3/5" />
          </div>
        </div>
      ))}
      <span className="sr-only">{label}</span>
    </div>
  )
}

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted">
      <Loader2 className={cn('size-4 animate-spin', className)} aria-hidden />
      {label}
    </span>
  )
}

/* ── Empty ──────────────────────────────────────────────────────────────── */

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface-2/50 text-center',
        compact ? 'px-5 py-8' : 'px-6 py-14'
      )}
    >
      <span className="grid size-12 place-items-center rounded-2xl bg-surface-3 text-muted">
        {icon ?? <Inbox className="size-6" aria-hidden />}
      </span>
      <h3 className="mt-3.5 text-sm font-bold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/* ── Error ──────────────────────────────────────────────────────────────── */

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  offline,
}: {
  title?: string
  message?: string
  onRetry?: () => void
  offline?: boolean
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-danger/25 bg-danger-soft px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-danger/12 text-danger">
        {offline ? <WifiOff className="size-6" aria-hidden /> : <AlertTriangle className="size-6" aria-hidden />}
      </span>
      <h3 className="mt-3.5 text-sm font-bold text-ink">{title}</h3>
      {message && <p className="mt-1 max-w-md text-sm text-muted">{message}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" icon={<RefreshCw className="size-3.5" />} onClick={onRetry} className="mt-4">
          Try again
        </Button>
      )}
    </div>
  )
}

/** Inline error strip for form-level failures. */
export function InlineError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-sm text-danger"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  )
}

export function InlineSuccess({ message }: { message?: string }) {
  if (!message) return null
  return (
    <div className="flex items-start gap-2 rounded-xl border border-success/25 bg-success-soft px-3.5 py-2.5 text-sm text-success">
      <span aria-hidden>✓</span>
      <span>{message}</span>
    </div>
  )
}

/* ── Progress ───────────────────────────────────────────────────────────── */

export function Progress({
  value,
  className,
  tone = 'brand',
  showLabel,
  size = 'md',
}: {
  /** 0-100 */
  value: number
  className?: string
  tone?: 'brand' | 'success' | 'warn' | 'danger' | 'info' | 'gold'
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  const pct = Math.max(0, Math.min(100, value))
  const heights = { sm: 'h-1.5', md: 'h-2', lg: 'h-3' }
  const colors = {
    brand: 'bg-brand',
    success: 'bg-success',
    warn: 'bg-warn',
    danger: 'bg-danger',
    info: 'bg-info',
    gold: 'bg-gold',
  }
  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn('w-full overflow-hidden rounded-full bg-surface-3', heights[size])}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-500 ease-out', colors[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <div className="mt-1 flex justify-between text-[11px] font-medium text-muted">
          <span>{Math.round(pct)}%</span>
        </div>
      )}
    </div>
  )
}

/** Horizontal subject bar used on progress pages. */
export function MasteryBar({
  label,
  value,
  color,
  trailing,
}: {
  label: string
  value: number
  color?: string
  trailing?: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-sm font-medium text-ink">{label}</span>
        <span className="tabular shrink-0 text-sm font-bold text-ink">{Math.round(value)}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${Math.max(2, Math.min(100, value))}%`, backgroundColor: color ?? 'var(--cx-brand)' }}
        />
      </div>
      {trailing}
    </div>
  )
}
