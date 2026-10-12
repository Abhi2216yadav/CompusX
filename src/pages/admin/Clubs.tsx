import { useMemo, useState } from 'react'
import { Users, Pencil, Trash2, Plus } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { COLLECTIONS } from '@/services/db'
import type { Club, UserProfile } from '@/services/types'
import { useCollection } from '@/hooks/useCollection'
import { useSaver } from '@/hooks/useSchoolData'
import { CrudModal, useCrudModal, type Draft } from '@/components/crud/CrudShell'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageHeader, StatTile } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { LoadingState } from '@/components/ui/Feedback'
import { formatDateTime } from '@/utils/date'
import { makeId } from '@/utils/id'

export default function AdminClubs() {
  const { profile } = useAuth()
  const schoolId = profile?.schoolId ?? ''
  const { save, remove } = useSaver()
  const crud = useCrudModal<Club>()

  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [posting, setPosting] = useState(false)

  const clubs = useCollection<Club>(
    COLLECTIONS.clubs,
    { where: [{ field: 'schoolId', op: '==', value: schoolId }] },
    [schoolId]
  )

  const people = useCollection<UserProfile>(
    COLLECTIONS.users,
    { where: [{ field: 'schoolId', op: '==', value: schoolId }] },
    [schoolId]
  )

  const peopleById = useMemo(() => new Map(people.data.map((p) => [p.id, p])), [people.data])

  const coordinatorOptions = useMemo(
    () => [
      { value: '', label: 'No coordinator' },
      ...people.data
        .filter((p) => p.role !== 'admin')
        .map((p) => ({ value: p.id, label: `${p.name} (${p.role})` })),
    ],
    [people.data]
  )

  const stats = useMemo(() => {
    const totalMembers = clubs.data.reduce((sum, c) => sum + (c.memberIds?.length ?? 0), 0)
    const activeCoordinators = clubs.data.filter((c) => Boolean(c.coordinatorId)).length
    return { totalMembers, activeCoordinators }
  }, [clubs.data])

  const detail = useMemo(
    () => (detailId ? (clubs.data.find((c) => c.id === detailId) ?? null) : null),
    [clubs.data, detailId]
  )

  function buildClub(draft: Draft): Record<string, unknown> {
    const editing = crud.editing as Club | null
    const isNew = !editing
    const coordinatorId = String(draft.coordinatorId ?? '')

    return {
      ...(editing ?? {}),
      schoolId,
      name: String(draft.name ?? '').trim(),
      description: String(draft.description ?? '').trim(),
      icon: String(draft.icon ?? '').trim(),
      color: String(draft.color ?? '#6366f1'),
      coordinatorId,
      coordinatorName: coordinatorId ? (peopleById.get(coordinatorId)?.name ?? '') : '',
      activities:
        typeof draft.activities === 'string'
          ? draft.activities
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
          : Array.isArray(draft.activities)
            ? (draft.activities as string[])
            : [],
      ...(isNew
        ? {
            memberIds: [] as string[],
            announcements: [],
            gallery: [],
            createdAt: Date.now(),
          }
        : {}),
    }
  }

  const columns: Column<Club>[] = [
    {
      key: 'club',
      header: 'Club',
      cell: (c) => (
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-xl text-lg"
            style={{ backgroundColor: `${c.color}22`, color: c.color }}
            aria-hidden
          >
            {c.icon || '🏛'}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
            <p className="line-clamp-1 text-[11px] text-muted">{c.description}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'coordinator',
      header: 'Coordinator',
      hideBelow: 'md',
      cell: (c) => c.coordinatorName || <span className="text-muted">Unassigned</span>,
    },
    {
      key: 'members',
      header: 'Members',
      align: 'right',
      cell: (c) => <span className="tabular text-sm font-semibold">{c.memberIds?.length ?? 0}</span>,
    },
    {
      key: 'activities',
      header: 'Activities',
      align: 'right',
      hideBelow: 'lg',
      cell: (c) => <span className="tabular text-sm text-ink-2">{c.activities?.length ?? 0}</span>,
    },
    {
      key: 'created',
      header: 'Created',
      align: 'right',
      hideBelow: 'md',
      cell: (c) => <span className="text-xs text-muted">{formatDateTime(c.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (c) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            aria-label={`Edit ${c.name}`}
            onClick={() => crud.edit(c)}
            className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-surface-2"
          >
            <Pencil className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label={`Delete ${c.name}`}
            onClick={() => setConfirmId(c.id)}
            className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      ),
    },
  ]

  if (clubs.loading) return <LoadingState label="Loading clubs…" rows={5} />

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Clubs"
        description="Run the school's clubs, keep their activities fresh and post announcements."
        action={
          <Button size="sm" onClick={crud.create}>
            New club
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatTile label="Clubs" value={clubs.data.length} tone="brand" />
        <StatTile label="Total members" value={stats.totalMembers} tone="success" icon={<Users className="size-4" />} />
        <StatTile label="Active coordinators" value={stats.activeCoordinators} tone="info" />
      </div>

      <DataTable
        rows={clubs.data}
        columns={columns}
        rowKey={(c) => c.id}
        onRowClick={(c) => setDetailId(c.id)}
        empty={{
          title: 'No clubs yet',
          description: 'Create the first club and students can join it from their dashboard.',
        }}
        caption="Open a club to post an announcement."
      />

      <CrudModal<Club>
        open={crud.open}
        editing={crud.editing}
        title={crud.editing ? 'Edit club' : 'New club'}
        collection={COLLECTIONS.clubs}
        deleteLabel="club"
        build={buildClub}
        fields={(d, set) => (
          <>
            <Input
              label="Club name"
              required
              value={String(d.name ?? '')}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="Robotics Club"
            />
            <Textarea
              label="Description"
              rows={3}
              value={String(d.description ?? '')}
              onChange={(e) => set({ description: e.target.value })}
              placeholder="What the club does and who it is for."
            />
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Input
                label="Icon"
                value={String(d.icon ?? '')}
                onChange={(e) => set({ icon: e.target.value })}
                placeholder="🤖"
                hint="An emoji or a one-word mark."
              />
              <div className="-mt-1 flex items-center gap-2 text-xs text-muted">
                Preview
                <span
                  className="grid size-8 place-items-center rounded-xl text-base"
                  style={{ backgroundColor: `${String(d.color ?? '#6366f1')}22` }}
                  aria-hidden
                >
                  {String(d.icon ?? '') || '🏛'}
                </span>
              </div>
              <Input
                label="Colour"
                type="color"
                value={String(d.color ?? '#6366f1')}
                onChange={(e) => set({ color: e.target.value })}
              />
            </div>
            <Select
              label="Coordinator"
              value={String(d.coordinatorId ?? '')}
              onChange={(e) => set({ coordinatorId: e.target.value })}
              options={coordinatorOptions}
            />
            <Textarea
              label="Activities"
              rows={5}
              hint="One activity per line."
              value={Array.isArray(d.activities) ? (d.activities as string[]).join('\n') : String(d.activities ?? '')}
              onChange={(e) => set({ activities: e.target.value })}
              placeholder={'Weekly build session\nInter-school competition'}
            />
          </>
        )}
        onClose={crud.close}
      />

      <ConfirmDialog
        open={Boolean(confirmId)}
        title="Delete this club?"
        message="Its activities and announcements are removed for every member."
        loading={busy}
        onCancel={() => setConfirmId(null)}
        onConfirm={async () => {
          if (!confirmId) return
          setBusy(true)
          try {
            await remove(COLLECTIONS.clubs, confirmId, 'Club')
            setConfirmId(null)
            setDetailId(null)
          } finally {
            setBusy(false)
          }
        }}
      />

      <Modal
        open={Boolean(detail)}
        onClose={() => {
          setDetailId(null)
          setAnnouncement('')
        }}
        size="lg"
        title={detail ? `${detail.icon || ''} ${detail.name}`.trim() : 'Club'}
        description={detail ? `${detail.memberIds?.length ?? 0} members · coordinated by ${detail.coordinatorName || 'nobody yet'}` : undefined}
      >
        {detail && (
          <div className="space-y-5">
            <p className="text-sm text-ink-2">{detail.description || 'No description yet.'}</p>

            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Activities</h3>
              {detail.activities?.length ? (
                <ul className="space-y-1.5">
                  {detail.activities.map((a) => (
                    <li key={a} className="flex items-start gap-2 text-sm text-ink-2">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full" style={{ backgroundColor: detail.color }} aria-hidden />
                      {a}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">No activities listed yet.</p>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Announcements</h3>
              {detail.announcements?.length ? (
                <ul className="space-y-2">
                  {detail.announcements.map((ann) => (
                    <li key={ann.id} className="rounded-xl bg-surface-2 p-3">
                      <p className="text-sm text-ink">{ann.body}</p>
                      <p className="mt-1 text-[11px] text-muted">
                        {ann.authorName} · {formatDateTime(ann.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Nothing posted yet.</p>
              )}

              <Textarea
                className="mt-3"
                rows={3}
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
                placeholder="Practice on Saturday at 9 AM in the lab."
              />
              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  icon={<Plus className="size-4" />}
                  loading={posting}
                  disabled={!announcement.trim()}
                  onClick={async () => {
                    const body = announcement.trim()
                    if (!body || !profile) return
                    setPosting(true)
                    await save(
                      COLLECTIONS.clubs,
                      {
                        ...detail,
                        announcements: [
                          ...(detail.announcements ?? []),
                          { id: makeId('ann'), body, authorName: profile.name, createdAt: Date.now() },
                        ],
                      },
                      { id: detail.id, success: 'Announcement posted' }
                    )
                    setAnnouncement('')
                    setPosting(false)
                  }}
                >
                  Add announcement
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}