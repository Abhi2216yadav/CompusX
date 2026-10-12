import { useMemo, useState } from 'react'
import { ExternalLink, Pencil, Trash2, Users } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { COLLECTIONS } from '@/services/db'
import type { Level, Task, TaskKind } from '@/services/types'
import { useCollection } from '@/hooks/useCollection'
import { useSchoolData, subjectOptions, useNotifier, useSaver } from '@/hooks/useSchoolData'
import { CrudModal, useCrudModal, type Draft } from '@/components/crud/CrudShell'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageHeader, StatTile } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { ConfirmDialog } from '@/components/ui/Modal'
import { LoadingState } from '@/components/ui/Feedback'
import { deadlineLabel, formatDateTime, toMillis } from '@/utils/date'

const LEVELS: Level[] = [6, 7, 8, 9, 10, 11, 12]

/**
 * Teacher homework/assignment manager. `AdminNotices` reuses this component
 * with `scope="school"` so an admin can post work for any class.
 */
export default function TaskManager({ kind, scope = 'mine' }: { kind: TaskKind; scope?: 'mine' | 'school' }) {
  const { profile } = useAuth()
  const { subjects, classes, subjectById } = useSchoolData(profile?.schoolId)
  const { remove } = useSaver()
  const notify = useNotifier()
  const crud = useCrudModal<Task>()

  const [classFilter, setClassFilter] = useState('all')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const collection = kind === 'homework' ? COLLECTIONS.homework : COLLECTIONS.assignments

  const tasks = useCollection<Task>(
    collection,
    {
      where: [
        { field: 'schoolId', op: '==', value: profile?.schoolId ?? '' },
        ...(scope === 'mine' && profile?.role === 'teacher'
          ? [{ field: 'teacherId' as const, op: '==' as const, value: profile.id }]
          : []),
      ],
      orderBy: [{ field: 'dueAt', dir: 'asc' }],
    },
    [profile?.schoolId, profile?.id, scope]
  )

  const rosterSize = useMemo(() => {
    // Completion counts need class size; derive from the classes the task targets.
    const byLevel = new Map<Level, number>()
    for (const c of classes) {
      byLevel.set(c.classLevel, (byLevel.get(c.classLevel) ?? 0) + (c.studentCount ?? 0))
    }
    return byLevel
  }, [classes])

  const filtered = useMemo(() => {
    const now = Date.now()
    return tasks.data.filter((t) => {
      if (classFilter !== 'all' && t.classLevel !== Number(classFilter)) return false
      if (subjectFilter !== 'all' && t.subjectId !== subjectFilter) return false
      const done = (t.completedBy?.length ?? 0) > 0
      if (statusFilter === 'open' && done) return false
      if (statusFilter === 'completed' && !done) return false
      if (statusFilter === 'overdue' && (done || toMillis(t.dueAt) >= now)) return false
      return true
    })
  }, [tasks.data, classFilter, subjectFilter, statusFilter])

  const counts = useMemo(() => {
    const now = Date.now()
    let open = 0
    let overdue = 0
    let submissions = 0
    for (const t of tasks.data) {
      const done = (t.completedBy?.length ?? 0) > 0
      if (!done) {
        open += 1
        if (toMillis(t.dueAt) < now) overdue += 1
      }
      submissions += t.completedBy?.length ?? 0
    }
    return { open, overdue, submissions }
  }, [tasks.data])

  const title = kind === 'homework' ? 'Homework' : 'Assignments'

  /** Draft → Task document. Keeps the modal's own save path authoritative. */
  function buildTask(draft: Draft): Record<string, unknown> {
    const isNew = !crud.editing
    const subjectId = String(draft.subjectId ?? '')
    const title = String(draft.title ?? '').trim()
    const dueAt = new Date(String(draft.dueAt)).getTime()

    // Remembered so `afterSaved` can notify students about the new task.
    if (isNew && title) setPendingNotice({ title, subjectId, dueAt })

    return {
      ...(crud.editing ?? {}),
      schoolId: profile?.schoolId ?? '',
      kind,
      subjectId,
      classLevel: Number(draft.classLevel ?? 10),
      academicYear: profile?.academicYear ?? '2026-27',
      title,
      description: String(draft.description ?? '').trim(),
      dueAt,
      attachmentUrl: String(draft.attachmentUrl ?? '').trim() || undefined,
      attachmentName: String(draft.attachmentName ?? '').trim() || undefined,
      maxMarks: Number(draft.maxMarks ?? 20),
      ...(isNew
        ? {
            teacherId: profile?.id ?? '',
            teacherName: profile?.name ?? '',
            assignedAt: Date.now(),
            completedBy: [] as string[],
            createdAt: Date.now(),
          }
        : {}),
    }
  }

  const [pendingNotice, setPendingNotice] = useState<{ title: string; subjectId: string; dueAt: number } | null>(null)

  /** Runs after a successful create so students hear about the new task. */
  async function afterSaved() {
    const notice = pendingNotice
    setPendingNotice(null)
    if (crud.editing || !profile || !notice) return
    await notify({
      schoolId: profile.schoolId,
      role: 'student',
      type: kind,
      title: `New ${kind}: ${notice.title}`,
      body: `${subjectById.get(notice.subjectId)?.name ?? 'Subject'} · due ${deadlineLabel(notice.dueAt)}`,
      link: kind === 'homework' ? '/homework' : '/assignments',
    })
  }

  const columns: Column<Task>[] = [
    {
      key: 'title',
      header: 'Task',
      cell: (t) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{t.title}</p>
          <p className="truncate text-[11px] text-muted">{t.description}</p>
        </div>
      ),
    },
    {
      key: 'subject',
      header: 'Subject',
      hideBelow: 'md',
      cell: (t) => <Badge tone="neutral">{subjectById.get(t.subjectId)?.name ?? '—'}</Badge>,
    },
    {
      key: 'class',
      header: 'Class',
      hideBelow: 'lg',
      cell: (t) => `Class ${t.classLevel}`,
    },
    {
      key: 'due',
      header: 'Due',
      cell: (t) => {
        const overdue = toMillis(t.dueAt) < Date.now()
        const completed = (t.completedBy?.length ?? 0) > 0
        return (
          <span className={overdue && !completed ? 'font-semibold text-danger' : undefined}>
            {deadlineLabel(t.dueAt)}
          </span>
        )
      },
    },
    {
      key: 'marks',
      header: 'Marks',
      align: 'right',
      hideBelow: 'lg',
      cell: (t) => t.maxMarks,
    },
    {
      key: 'completion',
      header: 'Submissions',
      align: 'right',
      cell: (t) => {
        const expected = rosterSize.get(t.classLevel) ?? 0
        const done = t.completedBy?.length ?? 0
        return (
          <span className="tabular">
            {done}
            {expected > 0 ? ` / ${expected}` : ''}
          </span>
        )
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (t) => (
        <div className="flex items-center justify-end gap-1">
          {t.attachmentUrl && (
            <a
              href={t.attachmentUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Open attachment"
              className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-surface-2"
            >
              <ExternalLink className="size-4" aria-hidden />
            </a>
          )}
          <button
            type="button"
            aria-label={`Edit ${t.title}`}
            onClick={() => crud.edit(t)}
            className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-surface-2"
          >
            <Pencil className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label={`Delete ${t.title}`}
            onClick={() => setConfirmId(t.id)}
            className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      ),
    },
  ]

  if (tasks.loading) return <LoadingState label={`Loading ${title.toLowerCase()}…`} rows={5} />

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title={title}
        description={
          scope === 'mine'
            ? 'Set work for a class and track who has completed it. Students are notified the moment you publish.'
            : 'Manage every task in the school.'
        }
        action={
          <Button size="sm" onClick={crud.create}>
            New {kind}
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatTile label="Total" value={tasks.data.length} tone="brand" />
        <StatTile label="Still open" value={counts.open} tone="warn" />
        <StatTile label="Overdue" value={counts.overdue} tone={counts.overdue > 0 ? 'danger' : 'info'} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select
          aria-label="Class"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All classes' },
            ...LEVELS.map((l) => ({ value: String(l), label: `Class ${l}` })),
          ]}
          className="h-9 w-auto min-w-32 text-xs font-semibold"
        />
        <Select
          aria-label="Subject"
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          options={subjectOptions(subjects)}
          className="h-9 w-auto min-w-36 text-xs font-semibold"
        />
        <Select
          aria-label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All status' },
            { value: 'open', label: 'Open' },
            { value: 'completed', label: 'Has submissions' },
            { value: 'overdue', label: 'Overdue' },
          ]}
          className="h-9 w-auto min-w-36 text-xs font-semibold"
        />
        <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted">
          <Users className="size-3.5" aria-hidden />
          {counts.submissions} submissions recorded
        </span>
      </div>

      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(t) => t.id}
        empty={{
          title: `No ${title.toLowerCase()} yet`,
          description: `Set a ${kind} and every student in that class is notified immediately.`,
        }}
      />

      <CrudModal<Task>
        open={crud.open}
        editing={crud.editing}
        title={crud.editing ? `Edit ${kind}` : `New ${kind}`}
        description="Students of the selected class are notified when you publish."
        collection={collection}
        deleteLabel={kind}
        build={buildTask}
        onSaved={() => void afterSaved()}
        fields={(d, set) => (
          <>
            <Input
              label="Title"
              required
              value={String(d.title ?? '')}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="Chapter 4 exercise 4.2"
            />
            <Textarea
              label="Instructions"
              rows={4}
              value={String(d.description ?? '')}
              onChange={(e) => set({ description: e.target.value })}
              placeholder="Complete questions 1 to 8. Show all working."
            />
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Select
                label="Subject"
                required
                value={String(d.subjectId ?? '')}
                onChange={(e) => set({ subjectId: e.target.value })}
                options={subjectOptions(subjects, false)}
              />
              <Select
                label="Class"
                required
                value={String(d.classLevel ?? 10)}
                onChange={(e) => set({ classLevel: Number(e.target.value) })}
                options={LEVELS.map((l) => ({ value: String(l), label: `Class ${l}` }))}
              />
              <Input
                label="Due date"
                type="datetime-local"
                required
                value={String(d.dueAt ?? '')}
                onChange={(e) => set({ dueAt: e.target.value })}
              />
              <Input
                label="Max marks"
                type="number"
                min={1}
                value={String(d.maxMarks ?? 20)}
                onChange={(e) => set({ maxMarks: Number(e.target.value) })}
              />
            </div>
            <Input
              label="Attachment URL (optional)"
              value={String(d.attachmentUrl ?? '')}
              onChange={(e) => set({ attachmentUrl: e.target.value, attachmentName: e.target.value.split('/').pop() ?? '' })}
              placeholder="https://…"
            />
            {crud.editing && (
              <p className="text-xs text-muted">
                Set {formatDateTime(crud.editing.assignedAt)} · submitted by{' '}
                {(crud.editing.completedBy?.length ?? 0)} student(s)
              </p>
            )}
          </>
        )}
        onClose={crud.close}
      />

      <ConfirmDialog
        open={Boolean(confirmId)}
        title="Delete this task?"
        message="Students lose access to it immediately. Their completion records go with it."
        loading={busy}
        onCancel={() => setConfirmId(null)}
        onConfirm={async () => {
          if (!confirmId) return
          setBusy(true)
          try {
            await remove(collection, confirmId, kind)
            setConfirmId(null)
          } finally {
            setBusy(false)
          }
        }}
      />
    </div>
  )
}

