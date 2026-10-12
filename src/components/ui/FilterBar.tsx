import type { ReactNode } from 'react'
import { Plus, Search, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { cn } from '@/utils/cn'

export interface Facet {
  key: string
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}

/**
 * Shared toolbar above lists and tables: free-text search plus any number of
 * dropdown facets, with an optional primary action. Facets collapse into a
 * disclosure on narrow viewports.
 */
export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  facets = [],
  action,
  className,
}: {
  search?: string
  onSearchChange?: (v: string) => void
  searchPlaceholder?: string
  facets?: Facet[]
  action?: ReactNode
  className?: string
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const activeCount = facets.filter((f) => f.value && f.value !== 'all').length

  return (
    <div className={cn('mb-4', className)}>
      <div className="flex flex-wrap items-center gap-2">
        {onSearchChange && (
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input
              value={search ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="h-9 pl-9"
            />
          </div>
        )}

        <div className="hidden flex-wrap items-center gap-2 md:flex">
          {facets.map((f) => (
            <FacetField key={f.key} facet={f} />
          ))}
        </div>

        {facets.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            className="md:hidden"
            icon={<SlidersHorizontal className="size-3.5" />}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((o) => !o)}
          >
            Filters{activeCount > 0 ? ` (${activeCount})` : ''}
          </Button>
        )}

        {action && <div className="ml-auto flex items-center gap-2">{action}</div>}
      </div>

      {mobileOpen && facets.length > 0 && (
        <div className="mt-2 space-y-2 rounded-xl border border-border bg-surface p-3 md:hidden">
          {facets.map((f) => (
            <FacetField key={f.key} facet={f} />
          ))}
        </div>
      )}
    </div>
  )
}

function FacetField({ facet }: { facet: Facet }) {
  return (
    <Select
      aria-label={facet.label}
      value={facet.value}
      onChange={(e) => facet.onChange(e.target.value)}
      options={facet.options}
      className="h-9 w-auto min-w-32 text-xs font-semibold"
    />
  )
}

/** Add-button used by every "create" toolbar so the look stays identical. */
export function AddButton({ onClick, children = 'Add' }: { onClick: () => void; children?: ReactNode }) {
  return (
    <Button size="sm" icon={<Plus className="size-4" />} onClick={onClick}>
      {children}
    </Button>
  )
}