import { useMemo, useState } from 'react'
import { Bell, Megaphone, Pin, TriangleAlert } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { COLLECTIONS } from '@/services/db'
import type { Notice } from '@/services/types'
import { useCollection } from '@/hooks/useCollection'
import { useDebounced } from '@/hooks/useUi'
import { PageHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState, LoadingState } from '@/components/ui/Feedback'
import { formatDate, toMillis } from '@/utils/date'

const PRIORITY_TONE = {
  normal: 'neutral',
  important: 'warn',
  urgent: 'danger',
} as const

const CATEGORY_LABEL: Record<string, string> = {
  exam: 'Exams',
  holiday: 'Holiday',
  circular: 'Circular',
  competition: 'Competition',
  deadline: 'Deadline',
  class: 'Class',
}

/** Notices addressed to this student's level/section, or to the whole school. */
function targetedToStudent(notice: Notice, level?: number, section?: string): boolean {
  if (!notice.targetClassLevels?.length && !notice.targetSections?.length) return true
  if (notice.targetClassLevels?.length && level != null && !notice.targetClassLevels.includes(level)) return false
  if (notice.targetSections?.length && section && !notice.targetSections.includes(section)) return false
  return true
}

export default function NoticesPage() {
  const { profile } = useAuth()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [showExpired, setShowExpired] = useState(false)
  const debounced = useDebounced(query)

  const notices = useCollection<Notice>(
    COLLECTIONS.notices,
    {
      where: [{ field: 'schoolId', op: '==', value: profile?.schoolId ?? '' }],
      orderBy: [{ field: 'createdAt', dir: 'desc' }],
    },
    [profile?.schoolId]
  )

  const visible = useMemo(() => {
    const now = Date.now()
    const q = debounced.trim().toLowerCase()
    return notices.data
      .filter((n) => targetedToStudent(n, profile?.classLevel, profile?.section))
      .filter((n) => showExpired || !n.expiresAt || toMillis(n.expiresAt) >= now)
      .filter((n) => category === 'all' || n.category === category)
      .filter(
        (n) =>
          !q ||
          n.title.toLowerCase().includes(q) ||
          n.body.toLowerCase().includes(q) ||
          n.authorName.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
        return toMillis(b.publishAt) - toMillis(a.publishAt)
      })
  }, [notices.data, debounced, category, showExpired, profile?.classLevel, profile?.section])

  const categories = useMemo(
    () => ['all', ...new Set(notices.data.map((n) => n.category))],
    [notices.data]
  )

  if (notices.loading) return <LoadingState label="Loading notices…" rows={4} />

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader
        title="Notices"
        description="Announcements from your teachers and the school office."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notices…"
          aria-label="Search notices"
          className="cx-input h-9 min-w-0 flex-1 text-sm sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
              className={
                category === c
                  ? 'rounded-lg bg-brand-soft px-2.5 py-1.5 text-xs font-bold text-brand'
                  : 'rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:bg-surface-2'
              }
            >
              {c === 'all' ? 'All' : CATEGORY_LABEL[c] ?? c}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-xs font-semibold text-muted">
          <input
            type="checkbox"
            checked={showExpired}
            onChange={(e) => setShowExpired(e.target.checked)}
            className="size-3.5 accent-[var(--cx-brand)]"
          />
          Show expired
        </label>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="No notices"
          description="New announcements from your teachers will appear here."
          icon={<Megaphone className="size-6" />}
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((notice) => {
            const expired = notice.expiresAt ? toMillis(notice.expiresAt) < Date.now() : false
            return (
              <li
                key={notice.id}
                className={
                  notice.pinned
                    ? 'rounded-2xl border border-brand/35 bg-surface p-4 shadow-sm'
                    : 'rounded-2xl border border-border bg-surface p-4 shadow-sm'
                }
              >
                <div className="flex flex-wrap items-center gap-2">
                  {notice.pinned && (
                    <Badge tone="brand" icon={<Pin className="size-3" />}>
                      Pinned
                    </Badge>
                  )}
                  <Badge tone={PRIORITY_TONE[notice.priority]}>{notice.priority}</Badge>
                  <Badge tone="neutral">{CATEGORY_LABEL[notice.category] ?? notice.category}</Badge>
                  {expired && <Badge tone="neutral">Expired</Badge>}
                  {notice.priority === 'urgent' && (
                    <TriangleAlert className="ml-auto size-4 text-danger" aria-label="Urgent" />
                  )}
                </div>

                <h2 className="mt-2.5 text-base font-bold text-ink">{notice.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-line text-ink-2">{notice.body}</p>

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  <span>{notice.authorName}</span>
                  <span aria-hidden>·</span>
                  <span>{formatDate(notice.publishAt)}</span>
                  {notice.targetClassLevels?.length > 0 && (
                    <>
                      <span aria-hidden>·</span>
                      <span>
                        Class {notice.targetClassLevels.join(', ')}
                        {notice.targetSections.length > 0 ? ` · Section ${notice.targetSections.join(', ')}` : ''}
                      </span>
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted">
        <Bell className="size-3.5" aria-hidden />
        Urgent notices also arrive as a notification.
      </p>
    </div>
  )
}