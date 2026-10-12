import type { HTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/utils/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Removes padding for tables/lists that manage their own. */
  flush?: boolean
  interactive?: boolean
}

export function Card({ flush, interactive, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-2xl shadow-sm',
        !flush && 'p-5',
        interactive &&
          'cursor-pointer transition-all duration-200 hover:border-brand/35 hover:shadow-card',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

interface SectionCardProps {
  title?: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  icon?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  flush?: boolean
}

export function SectionCard({
  title,
  subtitle,
  action,
  icon,
  children,
  className,
  bodyClassName,
  flush,
}: SectionCardProps) {
  return (
    <section className={cn('bg-surface border border-border rounded-2xl shadow-sm', className)}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div className="flex min-w-0 items-center gap-3">
            {icon && (
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                {icon}
              </span>
            )}
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-ink">{title}</h2>
              {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={cn(!flush && 'px-5 pb-5', flush && 'pb-2', bodyClassName)}>{children}</div>
    </section>
  )
}

export function PageHeader({
  title,
  description,
  action,
  breadcrumb,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  breadcrumb?: ReactNode
}) {
  return (
    <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {breadcrumb && <div className="mb-1.5 text-xs font-medium text-muted">{breadcrumb}</div>}
        <h1 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </header>
  )
}

export function StatTile({
  label,
  value,
  hint,
  icon,
  tone = 'brand',
  href,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: ReactNode
  tone?: 'brand' | 'success' | 'warn' | 'danger' | 'info' | 'gold'
  href?: string
}) {
  const tones = {
    brand: 'bg-brand-soft text-brand',
    success: 'bg-success-soft text-success',
    warn: 'bg-warn-soft text-warn',
    danger: 'bg-danger-soft text-danger',
    info: 'bg-info-soft text-info',
    gold: 'bg-warn-soft text-gold',
  } as const

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted">{label}</p>
        {icon && (
          <span className={cn('grid size-8 place-items-center rounded-lg', tones[tone])}>{icon}</span>
        )}
      </div>
      <p className="tabular mt-1.5 text-2xl font-extrabold text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted">{hint}</p>}
    </>
  )

  const cls = cn(
    'bg-surface border border-border rounded-2xl p-4 shadow-sm',
    href && 'transition hover:border-brand/35 hover:shadow-card'
  )

  return href ? (
    <Link to={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  )
}
