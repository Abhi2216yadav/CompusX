import { useMemo, useState } from 'react'
import { CalendarDays, Megaphone, Pencil, Pin, Trash2 } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { COLLECTIONS } from '@/services/db'
import type { Level, Notice, NoticeCategory, NoticePriority } from '@/services/types'
import { useCollection } from '@/hooks/useCollection'
import { useNotifier, useSaver } from '@/hooks/useSchoolData'
import { CrudModal, useCrudModal, type Draft } from '@/components/crud/CrudShell'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageHeader, StatTile } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Checkbox, Input, Select, Textarea } from '@/components/ui/Input'
import { ConfirmDialog } from '@/components/ui/Modal'
import { LoadingState } from '@/components/ui/Feedback'
import { formatDateTime } from '@/utils/date'

const CATEGORIES: NoticeCategory[] = ['exam', 'holiday', 'circular', 'competition', 'deadline', 'class']
const PRIORITIES: NoticePriority[] = ['normal', 'important', 'urgent']
const LEVELS: Level[] = [6, 7, 8, 9, 10, 11, 12]

const CATEGORY_TONE: Record<NoticeCategory, 'brand' | 'info' | 'warn' | 'danger' | 'gold' | 'success'> = {
  exam: 'danger',
  holiday: 'success',
  circular: 'info',
  competition: 'gold',
  deadline: 'warn',
  class: 'brand',
}

const PRIORITY_TONE: Record<NoticePriority, 'neutral' | 'warn' | 'danger'> = {
  normal: 'neutral',
  important: 'warn',
  urgent: 'danger',
}

/**
 * Shared notice composer for teachers (their own notices) and admins (school
 * wide notices). Both publish straight to students, so the flow is identical.
 */
export default function NoticeManager({ scope = 'mine' }: { scope?: 'mine' | 'school' }) {
  const { profile } = useAuth()
  const { save, remove } = useSaver()
  const notify = useNotifier()
  const crud = useCrudModal<Notice>()

  const [tab, setTab] = useState<'all' | 'pinned'>('all')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const notices = useCollection<Notice>(
    COLLECTIONS.notices,
    {
      where: [
        { field: 'schoolId', op: '==', value: profile?.schoolId ?? '' },
        ...(scope === 'mine' && profile?.role === 'teacher'
          ? [{ field: 'authorId' as const, op: '==' as const, value: profile.id }]
          : []),
      ],
      orderBy: [{ field: 'createdAt', dir: 'desc' }],
    },
    [profile?.schoolId, profile?.id, scope]
  )

  const rows = useMemo(
    () => (tab === 'pinned' ? notices.data.filter((n) => n.pinned) : notices.data),
    [notices.data, tab]
  )

  const pinned = notices.data.filter((n) => n.pinned).length
  const urgent = notices.data.filter((n) => n.priority === 'urgent').length

  function buildNotice(draft: Draft): Record<string, unknown> {
    const isNew = !crud.editing
    return {
      ...(crud.editing ?? {}),
      schoolId: profile?.schoolId ?? '',
      title: String(draft.title ?? '').trim(),
      body: String(draft.body ?? '').trim(),
      category: String(draft.category ?? 'circular') as NoticeCategory,
      priority: String(draft.priority ?? 'normal') as NoticePriority,
      targetClassLevels: Array.isArray(draft.targetClassLevels) ? (draft.targetClassLevels as Level[]) : [],
      targetSections: Array.isArray(draft.targetSections) ? (draft.targetSections as string[]) : [],
      pinned: Boolean(draft.pinned),
      publishAt: Number(draft.publishAt ?? Date.now()),
      expiresAt: draft.expiresAt ? new Date(String(draft.expiresAt)).getTime() : undefined,
      ...(isNew
        ? {
            authorId: profile?.id ?? '',
            authorName: profile?.name ?? '',
            createdAt: Date.now(),
          }
        : {}),
    }
  }

  const columns: Column<Notice>[] = [
    {
      key: 'title',
      header: 'Notice',
      cell: (n) => (
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-ink">
            {n.pinned && <Pin className="size-3.5 shrink-0 text-brand" aria-hidden />}
            {n.title}
          </p>
          <p className="line-clamp-2 text-[11px] text-muted">{n.body}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      hideBelow: 'sm',
      cell: (n) => <Badge tone={CATEGORY_TONE[n.category] ?? 'neutral'}>{n.category}</Badge>,
    },
    {
      key: 'priority',
      header: 'Priority',
      cell: (n) => <Badge tone={PRIORITY_TONE[n.priority] ?? 'neutral'}>{n.priority}</Badge>,
    },
    {
      key: 'audience',
      header: 'Audience',
      hideBelow: 'lg',
      cell: (n) =>
        n.targetClassLevels.length
          ? `Class ${n.targetClassLevels.join(', ')}${n.targetSections.length ? ` · ${n.targetSections.join('/')}` : ''}`
          : 'Whole school',
    },
    {
      key: 'posted',
      header: 'Posted',
      align: 'right',
      hideBelow: 'md',
      cell: (n) => (
        <span className="text-xs text-muted">
          {n.authorName?.split(' ')[0]} · {formatDateTime(n.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (n) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            aria-label={n.pinned ? `Unpin ${n.title}` : `Pin ${n.title}`}
            onClick={() =>
              void save(COLLECTIONS.notices, { ...n, pinned: !n.pinned }, { id: n.id, success: n.pinned ? 'Unpinned' : 'Pinned' })
            }
            className={`grid size-8 place-items-center rounded-lg transition hover:bg-surface-2 ${n.pinned ? 'text-brand' : 'text-muted'}`}
          >
            <Pin className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label={`Edit ${n.title}`}
            onClick={() => crud.edit(n)}
            className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-surface-2"
          >
            <Pencil className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label={`Delete ${n.title}`}
            onClick={() => setConfirmId(n.id)}
            className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      ),
    },
  ]

  if (notices.loading) return <LoadingState label="Loading notices…" rows={4} />

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Notices"
        description="Broadcast an update to students. Pinned notices stay at the top of their feed."
        action={
          <Button size="sm" onClick={crud.create}>
            New notice
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatTile label="Notices" value={notices.data.length} tone="brand" />
        <StatTile label="Pinned" value={pinned} tone="info" />
        <StatTile label="Urgent" value={urgent} tone={urgent > 0 ? 'danger' : 'info'} />
      </div>

      <div className="mb-4 inline-flex rounded-xl bg-surface-2 p-1">
        {(['all', 'pinned'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
              tab === t ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(n) => n.id}
        empty={{
          title: 'No notices yet',
          description: 'Publish one and every targeted student sees it on their dashboard.',
        }}
      />

      <CrudModal<Notice>
        open={crud.open}
        editing={crud.editing}
        title={crud.editing ? 'Edit notice' : 'New notice'}
        description="Leave every class unselected to send this to the whole school."
        collection={COLLECTIONS.notices}
        deleteLabel="notice"
        build={buildNotice}
        fields={(d, set) => (
          <>
            <Input
              label="Title"
              required
              value={String(d.title ?? '')}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="Sports day on Friday"
            />
            <Textarea
              label="Message"
              rows={6}
              required
              value={String(d.body ?? '')}
              onChange={(e) => set({ body: e.target.value })}
              placeholder="Tell students what to expect and what to bring."
            />
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Select
                label="Category"
                value={String(d.category ?? 'circular')}
                onChange={(e) => set({ category: e.target.value })}
                options={CATEGORIES.map((c) => ({ value: c, label: capitalise(c) }))}
              />
              <Select
                label="Priority"
                value={String(d.priority ?? 'normal')}
                onChange={(e) => set({ priority: e.target.value })}
                options={PRIORITIES.map((p) => ({ value: p, label: capitalise(p) }))}
              />
              <Input
                label="Publish from"
                type="datetime-local"
                value={toLocalInput(d.publishAt)}
                onChange={(e) => set({ publishAt: new Date(e.target.value).getTime() })}
              />
              <Input
                label="Expires (optional)"
                type="datetime-local"
                value={d.expiresAt ? toLocalInput(d.expiresAt) : ''}
                onChange={(e) => set({ expiresAt: e.target.value ? new Date(e.target.value).getTime() : undefined })}
              />
            </div>

            <fieldset>
              <legend className="cx-label">Target classes</legend>
              <p className="mb-2 text-xs text-muted">Nothing selected means the whole school.</p>
              <div className="flex flex-wrap gap-2">
                {LEVELS.map((l) => {
                  const active = ((d.targetClassLevels as Level[] | undefined) ?? []).includes(l)
                  return (
                    <button
                      key={l}
                      type="button"
                      onClick={() =>
                        set({
                          targetClassLevels: active
                            ? ((d.targetClassLevels as Level[]) ?? []).filter((x) => x !== l)
                            : [...((d.targetClassLevels as Level[]) ?? []), l],
                        })
                      }
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                        active ? 'bg-brand text-white' : 'bg-surface-2 text-muted hover:text-ink'
                      }`}
                    >
                      Class {l}
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <Checkbox
              label="Pin to the top of the feed"
              checked={Boolean(d.pinned)}
              onChange={(v) => set({ pinned: v })}
            />
          </>
        )}
        onClose={crud.close}
        onSaved={() => {
          if (crud.editing || !profile) return
          void notify({
            schoolId: profile.schoolId,
            role: 'student',
            type: 'notice',
            title: 'New notice',
            body: 'Open the notices page to read it.',
            link: '/notices',
          })
        }}
      />

      <ConfirmDialog
        open={Boolean(confirmId)}
        title="Delete this notice?"
        message="It disappears from every student's feed straight away."
        loading={busy}
        onCancel={() => setConfirmId(null)}
        onConfirm={async () => {
          if (!confirmId) return
          setBusy(true)
          try {
            await remove(COLLECTIONS.notices, confirmId, 'Notice')
            setConfirmId(null)
          } finally {
            setBusy(false)
          }
        }}
      />
    </div>
  )
}

/** `yyyy-MM-ddTHH:mm` in local time, the shape `datetime-local` expects. */
function toLocalInput(at: unknown): string {
  const d = new Date(Number(at) || Date.now())
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export { CalendarDays, Megaphone }