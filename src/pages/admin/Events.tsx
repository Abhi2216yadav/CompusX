import { useMemo, useState } from 'react'
import { CalendarDays, Users, Pencil, Trash2 } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { COLLECTIONS } from '@/services/db'
import type { EventCategory, Level, SchoolEvent } from '@/services/types'
import { useCollection } from '@/hooks/useCollection'
import { useNotifier, useSaver } from '@/hooks/useSchoolData'
import { CrudModal, useCrudModal, type Draft } from '@/components/crud/CrudShell'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageHeader, StatTile } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { ConfirmDialog } from '@/components/ui/Modal'
import { LoadingState, Progress } from '@/components/ui/Feedback'
import { formatDateTime, toMillis } from '@/utils/date'
import { titleCase } from '@/utils/format'

const LEVELS: Level[] = [6, 7, 8, 9, 10, 11, 12]
const CATEGORIES: EventCategory[] = ['sports', 'cultural', 'science', 'technology', 'quiz', 'workshop', 'competition', 'club']

const CATEGORY_TONE: Record<EventCategory, 'brand' | 'success' | 'warn' | 'info' | 'gold' | 'danger'> = {
  sports: 'success',
  cultural: 'gold',
  science: 'info',
  technology: 'brand',
  quiz: 'warn',
  workshop: 'brand',
  competition: 'gold',
  club: 'info',
}

export default function AdminEvents() {
  const { profile } = useAuth()
  const schoolId = profile?.schoolId ?? ''
  const { remove } = useSaver()
  const notify = useNotifier()
  const crud = useCrudModal<SchoolEvent>()

  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pendingEvent, setPendingEvent] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const events = useCollection<SchoolEvent>(
    COLLECTIONS.events,
    {
      where: [{ field: 'schoolId', op: '==', value: schoolId }],
      orderBy: [{ field: 'startsAt', dir: 'asc' }],
    },
    [schoolId]
  )

  const rows = useMemo(() => {
    if (categoryFilter === 'all') return events.data
    return events.data.filter((e) => e.category === (categoryFilter as EventCategory))
  }, [events.data, categoryFilter])

  const counts = useMemo(() => {
    const now = Date.now()
    const upcoming = events.data.filter((e) => toMillis(e.startsAt) >= now).length
    const registrations = events.data.reduce((sum, e) => sum + (e.attendeeIds?.length ?? 0), 0)
    return { total: events.data.length, upcoming, registrations }
  }, [events.data])

  function buildEvent(draft: Draft): Record<string, unknown> {
    const isNew = !crud.editing
    const name = String(draft.name ?? '').trim()
    if (isNew) setPendingEvent(name)

    return {
      ...(crud.editing ?? {}),
      schoolId,
      name,
      description: String(draft.description ?? '').trim(),
      category: String(draft.category ?? 'cultural') as EventCategory,
      startsAt: toMillis(draft.startsAt) || Date.now(),
      endsAt: draft.endsAt ? toMillis(draft.endsAt) : undefined,
      venue: String(draft.venue ?? '').trim(),
      registrationDeadline: draft.registrationDeadline ? toMillis(draft.registrationDeadline) : undefined,
      imageUrl: String(draft.imageUrl ?? '').trim() || undefined,
      capacity: draft.capacity ? Number(draft.capacity) : undefined,
      classLevels: Array.isArray(draft.classLevels) ? (draft.classLevels as Level[]) : [],
      organiserId: profile?.id ?? '',
      organiserName: profile?.name ?? '',
      ...(isNew ? { attendeeIds: [] as string[], createdAt: Date.now() } : {}),
    }
  }

  const columns: Column<SchoolEvent>[] = [
    {
      key: 'name',
      header: 'Event',
      cell: (e) => (
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={CATEGORY_TONE[e.category] ?? 'neutral'}>{titleCase(e.category)}</Badge>
            <p className="truncate text-sm font-semibold text-ink">{e.name}</p>
          </div>
          <p className="line-clamp-2 text-[11px] text-muted">{e.description}</p>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      hideBelow: 'sm',
      cell: (e) => (
        <span className="text-xs">
          {formatDateTime(e.startsAt)}
          {e.endsAt ? <span className="block text-[11px] text-muted">to {formatDateTime(e.endsAt)}</span> : null}
        </span>
      ),
    },
    {
      key: 'venue',
      header: 'Venue',
      hideBelow: 'lg',
      cell: (e) => e.venue,
    },
    {
      key: 'registrations',
      header: 'Registrations',
      align: 'right',
      cell: (e) => {
        const joined = e.attendeeIds?.length ?? 0
        const pct = e.capacity ? Math.min(100, (joined / e.capacity) * 100) : 0
        return (
          <div className="min-w-24">
            <span className="tabular text-xs font-semibold text-ink">
              {joined}
              {e.capacity ? ` / ${e.capacity}` : ''}
            </span>
            {e.capacity ? <Progress value={pct} size="sm" className="mt-1" tone={joined >= e.capacity ? 'danger' : 'brand'} /> : null}
          </div>
        )
      },
    },
    {
      key: 'audience',
      header: 'Audience',
      hideBelow: 'md',
      cell: (e) => (e.classLevels?.length ? `Class ${e.classLevels.join(', ')}` : 'Whole school'),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (e) => (
        <div className="flex items-center justify-end gap-1">
          <button type="button" aria-label={`Edit ${e.name}`} onClick={() => crud.edit(e)} className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-surface-2">
            <Pencil className="size-4" />
          </button>
          <button type="button" aria-label={`Delete ${e.name}`} onClick={() => setConfirmId(e.id)} className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-danger-soft hover:text-danger">
            <Trash2 className="size-4" />
          </button>
        </div>
      ),
    },
  ]

  if (events.loading) return <LoadingState label="Loading events…" rows={5} />

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Events"
        description="Plan school events. Students can register from their events page."
        action={
          <Button size="sm" onClick={crud.create}>
            New event
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatTile label="Total" value={counts.total} icon={<CalendarDays className="size-4" />} />
        <StatTile label="Upcoming" value={counts.upcoming} tone="info" />
        <StatTile label="Registrations" value={counts.registrations} icon={<Users className="size-4" />} tone="success" />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Select
          label="Category"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          options={[{ value: 'all', label: 'All categories' }, ...CATEGORIES.map((c) => ({ value: c, label: titleCase(c) }))]}
          className="h-9 w-auto min-w-32 text-xs font-semibold"
        />
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(e) => e.id}
        empty={{
          title: 'No events yet',
          description: 'Create one and every targeted class sees it straight away.',
        }}
      />

      <CrudModal<SchoolEvent>
        open={crud.open}
        editing={crud.editing}
        title={crud.editing ? 'Edit event' : 'New event'}
        description="Leave every class unselected to open this to the whole school."
        collection={COLLECTIONS.events}
        deleteLabel="event"
        build={buildEvent}
        fields={(d, set) => {
          const levels = Array.isArray(d.classLevels) ? (d.classLevels as Level[]) : []
          return (
            <>
              <Input label="Event name" required value={String(d.name ?? '')} onChange={(e) => set({ name: e.target.value })} placeholder="Annual Sports Day" />
              <Textarea label="Description" rows={4} required value={String(d.description ?? '')} onChange={(e) => set({ description: e.target.value })} placeholder="What happens, who should come and what to bring." />
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Select label="Category" value={String(d.category ?? 'cultural')} onChange={(e) => set({ category: e.target.value })} options={CATEGORIES.map((c) => ({ value: c, label: titleCase(c) }))} />
                <Input label="Venue" required value={String(d.venue ?? '')} onChange={(e) => set({ venue: e.target.value })} placeholder="Main ground" />
                <Input label="Starts" type="datetime-local" required value={toLocalInput(d.startsAt)} onChange={(e) => set({ startsAt: e.target.value ? new Date(e.target.value).getTime() : undefined })} />
                <Input label="Ends (optional)" type="datetime-local" value={d.endsAt ? toLocalInput(d.endsAt) : ''} onChange={(e) => set({ endsAt: e.target.value ? new Date(e.target.value).getTime() : undefined })} />
                <Input label="Registration deadline (optional)" type="datetime-local" value={d.registrationDeadline ? toLocalInput(d.registrationDeadline) : ''} onChange={(e) => set({ registrationDeadline: e.target.value ? new Date(e.target.value).getTime() : undefined })} />
                <Input label="Capacity (optional)" type="number" min={1} value={String(d.capacity ?? '')} onChange={(e) => set({ capacity: e.target.value ? Number(e.target.value) : undefined })} placeholder="Unlimited" />
              </div>
              <Input label="Cover image URL (optional)" value={String(d.imageUrl ?? '')} onChange={(e) => set({ imageUrl: e.target.value })} placeholder="https://…" />
              <fieldset>
                <legend className="cx-label">Open to classes</legend>
                <p className="mb-2 text-xs text-muted">Nothing selected means the whole school.</p>
                <div className="flex flex-wrap gap-2">
                  {LEVELS.map((l) => {
                    const active = levels.includes(l)
                    return (
                      <button key={l} type="button" onClick={() => set({ classLevels: active ? levels.filter((x) => x !== l) : [...levels, l] })} className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${active ? 'bg-brand text-white' : 'bg-surface-2 text-muted hover:text-ink'}`}>
                        Class {l}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            </>
          )
        }}
        onClose={crud.close}
        onSaved={async () => {
          const name = pendingEvent
          setPendingEvent('')
          if (crud.editing || !profile || !name) return
          await notify({
            schoolId: profile.schoolId,
            role: 'student',
            type: 'event',
            title: `New event: ${name}`,
            body: 'Open the events page to see the details and register.',
            link: '/events',
          })
        }}
      />

      <ConfirmDialog
        open={Boolean(confirmId)}
        title="Delete this event?"
        message="Every registration for it is dropped as well."
        loading={busy}
        onCancel={() => setConfirmId(null)}
        onConfirm={async () => {
          if (!confirmId) return
          setBusy(true)
          try {
            await remove(COLLECTIONS.events, confirmId, 'Event')
            setConfirmId(null)
          } finally {
            setBusy(false)
          }
        }}
      />
    </div>
  )
}

function toLocalInput(at: unknown): string {
  const d = new Date(toMillis(at) || Date.now())
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
