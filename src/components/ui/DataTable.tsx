import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { EmptyState } from '@/components/ui/Feedback'

export interface Column<T> {
  key: string
  header: ReactNode
  /** Cell renderer. */
  cell: (row: T) => ReactNode
  /** Column is hidden below `sm` on small screens. */
  hideBelow?: 'sm' | 'md' | 'lg'
  className?: string
  headClassName?: string
  align?: 'left' | 'right' | 'center'
}

const HIDE: Record<string, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
}

const ALIGN = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
} as const

/**
 * Responsive table. Below the `hideBelow` breakpoint each row switches to a
 * stacked label/value list, which keeps admin tables usable on phones without
 * a separate mobile implementation.
 */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  empty,
  caption,
  className,
}: {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  empty?: { title: string; description?: string; action?: ReactNode }
  caption?: ReactNode
  className?: string
}) {
  if (!rows.length) {
    return empty ? <EmptyState title={empty.title} description={empty.description} action={empty.action} /> : null
  }

  return (
    <div className={cn('overflow-hidden rounded-2xl border border-border bg-surface shadow-sm', className)}>
      {caption && (
        <div className="border-b border-border px-4 py-3 text-xs font-semibold text-muted">{caption}</div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-full border-collapse text-sm">
          <thead className="bg-surface-2">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    'whitespace-nowrap px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-muted',
                    ALIGN[c.align ?? 'left'],
                    c.hideBelow && HIDE[c.hideBelow],
                    c.headClassName
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'align-middle transition',
                  onRowClick ? 'cursor-pointer hover:bg-surface-2' : 'hover:bg-surface-2/60'
                )}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn('px-4 py-3 text-ink-2', ALIGN[c.align ?? 'left'], c.hideBelow && HIDE[c.hideBelow], c.className)}
                  >
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stacked layout for narrow viewports */}
      <ul className="divide-y divide-border md:hidden">
        {rows.map((row) => {
          const primary = columns[0]
          const rest = columns.slice(1)
          return (
            <li key={rowKey(row)} className={cn('px-4 py-3.5', onRowClick && 'cursor-pointer')} onClick={onRowClick ? () => onRowClick(row) : undefined}>
              <div className="text-sm font-semibold text-ink">{primary.cell(row)}</div>
              <dl className="mt-2 space-y-1">
                {rest.map((c) => (
                  <div key={c.key} className="flex items-baseline justify-between gap-3">
                    <dt className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted">{c.header}</dt>
                    <dd className="min-w-0 text-right text-xs text-ink-2">{c.cell(row)}</dd>
                  </div>
                ))}
              </dl>
            </li>
          )
        })}
      </ul>
    </div>
  )
}