import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, CalendarDays, ClipboardList, FileQuestion, Loader2, Search, X } from 'lucide-react'
import type { SearchHit, SearchKind } from '@/services/search'
import { globalSearch } from '@/services'
import { useAuth } from '@/context/AuthContext'
import { useDebounced } from '@/hooks/useUi'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/utils/cn'
import { SEARCH_KIND_LABEL } from '@/services/search'

const KIND_ICON: Record<SearchKind, typeof BookOpen> = {
  material: BookOpen,
  subject: BookOpen,
  chapter: BookOpen,
  task: ClipboardList,
  question: FileQuestion,
  pyq: ClipboardList,
  quiz: FileQuestion,
  notice: CalendarDays,
  event: CalendarDays,
}

const FILTERS: { value: SearchKind | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'material', label: 'Materials' },
  { value: 'question', label: 'Questions' },
  { value: 'pyq', label: 'PYQs' },
  { value: 'task', label: 'Homework' },
  { value: 'notice', label: 'Notices' },
  { value: 'event', label: 'Events' },
]

/**
 * Global search across notes, homework, questions, PYQs, events and notices.
 * ⌘K / Ctrl+K opens it from anywhere.
 */
export function GlobalSearch({ compact }: { compact?: boolean }) {
  const { profile, school } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<SearchKind | 'all'>('all')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const debounced = useDebounced(query, 260)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === '/' && !open) {
        const el = document.activeElement
        if (el?.tagName !== 'INPUT' && el?.tagName !== 'TEXTAREA') {
          e.preventDefault()
          setOpen(true)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 40)
  }, [open])

  useEffect(() => {
    let active = true
    if (debounced.trim().length < 2 || !profile) {
      setHits([])
      return
    }
    setSearching(true)
    globalSearch(profile.schoolId, debounced, {
      kinds: kind === 'all' ? 'all' : [kind],
    })
      .then((res) => {
        if (!active) return
        setHits(res.hits)
        setActiveIndex(0)
      })
      .finally(() => active && setSearching(false))
    return () => {
      active = false
    }
  }, [debounced, kind, profile])

  const go = (hit: SearchHit) => {
    setOpen(false)
    setQuery('')
    navigate(hit.href)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, hits.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && hits[activeIndex]) {
      e.preventDefault()
      go(hits[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search CampusX"
        className={cn(
          'group flex items-center gap-2.5 rounded-xl border border-border bg-surface-2 px-3 text-sm text-muted transition hover:bg-surface hover:text-ink',
          compact ? 'h-9 w-9 justify-center' : 'h-10 w-full max-w-sm'
        )}
      >
        <Search className="size-4 shrink-0" />
        {!compact && (
          <>
            <span className="flex-1 text-left">Search notes, PYQs, homework…</span>
            <kbd className="hidden rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-muted sm:block">
              ⌘K
            </kbd>
          </>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[8vh]">
          <div className="absolute inset-0 bg-ink/45 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Search"
            className="relative flex max-h-[78vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-lg"
          >
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search className="size-4 shrink-0 text-muted" aria-hidden />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search study materials, chapters, PYQs, homework, notices, events…"
                className="h-13 flex-1 bg-transparent py-4 text-sm text-ink placeholder:text-muted focus:outline-none"
                aria-label="Search query"
              />
              {searching && <Loader2 className="size-4 shrink-0 animate-spin text-muted" />}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close search"
                className="grid size-7 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <div className="no-scrollbar flex gap-1.5 overflow-x-auto border-b border-border px-3 py-2">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setKind(f.value)}
                  className={cn(
                    'shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition',
                    kind === f.value ? 'bg-brand text-white' : 'bg-surface-2 text-muted hover:text-ink'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-2">
              {query.trim().length < 2 ? (
                <p className="px-3 py-8 text-center text-sm text-muted">
                  Type at least 2 characters to search across {school?.name ?? 'your school'}.
                </p>
              ) : hits.length === 0 && !searching ? (
                <p className="px-3 py-8 text-center text-sm text-muted">
                  No results for “{query}”. Try a subject, chapter or year.
                </p>
              ) : (
                hits.map((hit, i) => {
                  const Icon = KIND_ICON[hit.kind]
                  return (
                    <button
                      key={`${hit.kind}-${hit.id}`}
                      type="button"
                      data-active={i === activeIndex}
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => go(hit)}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition',
                        i === activeIndex ? 'bg-brand-soft' : 'hover:bg-surface-2'
                      )}
                    >
                      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-1 block text-sm font-semibold text-ink">{hit.title}</span>
                        <span className="line-clamp-1 block text-xs text-muted">{hit.snippet}</span>
                      </span>
                      <Badge tone="neutral">{SEARCH_KIND_LABEL[hit.kind] ?? hit.kind}</Badge>
                    </button>
                  )
                })
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border bg-surface-2 px-4 py-2 text-[11px] text-muted">
              <span>↑↓ to navigate · ↵ to open · Esc to close</span>
              {query.trim().length >= 2 && <span>{hits.length} results</span>}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
