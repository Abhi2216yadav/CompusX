import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useClickOutside, useEscape } from '@/hooks/useUi'

/* ── Tabs ───────────────────────────────────────────────────────────────── */

export interface TabItem {
  value: string
  label: string
  icon?: ReactNode
  count?: number
}

export function Tabs({
  items,
  value,
  onChange,
  className,
  variant = 'pill',
}: {
  items: TabItem[]
  value: string
  onChange: (v: string) => void
  className?: string
  variant?: 'pill' | 'underline'
}) {
  if (variant === 'underline') {
    return (
      <div className={cn('no-scrollbar flex gap-1 overflow-x-auto border-b border-border', className)} role="tablist">
        {items.map((item) => {
          const active = item.value === value
          return (
            <button
              key={item.value}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(item.value)}
              className={cn(
                'relative flex shrink-0 items-center gap-2 px-3.5 py-2.5 text-sm font-semibold transition',
                active ? 'text-brand' : 'text-muted hover:text-ink'
              )}
            >
              {item.icon}
              {item.label}
              {item.count != null && (
                <span className={cn('tabular rounded-full px-1.5 py-0.5 text-[10px]', active ? 'bg-brand-soft text-brand' : 'bg-surface-2 text-muted')}>
                  {item.count}
                </span>
              )}
              {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" />}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className={cn('inline-flex gap-1 rounded-xl bg-surface-2 p-1', className)} role="tablist">
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition',
              active ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
            )}
          >
            {item.icon}
            <span className="hidden sm:inline">{item.label}</span>
            {item.count != null && (
              <span className={cn('tabular rounded-full px-1.5 text-[10px]', active ? 'bg-brand-soft text-brand' : 'bg-surface-3 text-muted')}>
                {item.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/* ── Accordion ──────────────────────────────────────────────────────────── */

export function Accordion({
  title,
  subtitle,
  children,
  defaultOpen = false,
  badge,
}: {
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  badge?: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-surface-2"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-ink">{title}</span>
          {subtitle && <span className="block text-xs text-muted">{subtitle}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {badge}
          <ChevronDown className={cn('size-4 text-muted transition-transform', open && 'rotate-180')} />
        </span>
      </button>
      {open && <div className="border-t border-border px-4 py-3.5 text-sm text-ink-2">{children}</div>}
    </div>
  )
}

/* ── Dropdown ───────────────────────────────────────────────────────────── */

export interface MenuItem {
  label: string
  icon?: ReactNode
  onClick?: () => void
  href?: string
  tone?: 'default' | 'danger'
  divider?: boolean
  disabled?: boolean
}

export function Dropdown({
  trigger,
  items,
  align = 'right',
  className,
}: {
  trigger: ReactNode
  items: MenuItem[]
  align?: 'left' | 'right'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useClickOutside<HTMLDivElement>(open, () => setOpen(false))
  useEscape(open, () => setOpen(false))

  const run = (item: MenuItem) => {
    setOpen(false)
    item.onClick?.()
  }

  return (
    <div ref={ref} className={cn('relative', className)}>
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <div
          className={cn(
            'absolute top-full z-40 mt-1.5 min-w-52 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-lg animate-in-up',
            align === 'right' ? 'right-0' : 'left-0'
          )}
          role="menu"
        >
          {items.map((item, i) =>
            item.divider ? (
              <div key={i} className="my-1 h-px bg-border" />
            ) : (
              <button
                key={i}
                role="menuitem"
                disabled={item.disabled}
                onClick={() => run(item)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition disabled:opacity-50',
                  item.tone === 'danger'
                    ? 'text-danger hover:bg-danger-soft'
                    : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
                )}
              >
                {item.icon}
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}

/* ── Sheet (mobile drawer) ──────────────────────────────────────────────── */

export function Sheet({
  open,
  onClose,
  title,
  children,
  side = 'left',
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  side?: 'left' | 'right'
}) {
  useEscape(open, onClose)
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink/45 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <aside
        className={cn(
          'absolute inset-y-0 w-[85vw] max-w-xs border-border bg-surface shadow-lg',
          side === 'left' ? 'left-0 border-r' : 'right-0 border-l',
          'flex flex-col animate-in-up'
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-bold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2"
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </aside>
    </div>,
    document.body
  )
}

