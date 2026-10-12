import { useState } from 'react'
import { ClipboardList, Pencil, Send, Trash2, X } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { COLLECTIONS } from '@/services/db'
import type { Level, MockTest } from '@/services/types'
import { useCollection } from '@/hooks/useCollection'
import { useSchoolData, subjectOptions, useSaver } from '@/hooks/useSchoolData'
import { CrudModal, useCrudModal, type Draft } from '@/components/crud/CrudShell'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageHeader, StatTile } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input, Select, Switch, Textarea } from '@/components/ui/Input'
import { ConfirmDialog } from '@/components/ui/Modal'
import { LoadingState } from '@/components/ui/Feedback'
import { truncate } from '@/utils/format'

const LEVELS: Level[] = [6, 7, 8, 9, 10, 11, 12]
const MARKS_PER_QUESTION = 10

function toInstructions(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export default function TeacherMockTests() {
  const { profile } = useAuth()
  const schoolId = profile?.schoolId ?? ''
  const { subjects, subjectById } = useSchoolData(schoolId)
  const { save, remove } = useSaver()
  const crud = useCrudModal<MockTest>()

  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const tests = useCollection<MockTest>(
    COLLECTIONS.mockTests,
    {
      where: [
        { field: 'schoolId', op: '==', value: schoolId },
        { field: 'createdBy', op: '==', value: profile?.id ?? '' },
      ],
      orderBy: [{ field: 'createdAt', dir: 'desc' }],
    },
    [schoolId, profile?.id]
  )

  const published = tests.data.filter((t) => t.isPublished).length
  const avgDuration = tests.data.length
    ? Math.round(
        tests.data.reduce((sum, t) => sum + (Number(t.durationMin) || 0), 0) / tests.data.length
      )
    : 0

  function buildTest(draft: Draft): Record<string, unknown> {
    const isNew = !crud.editing
    const pyqCount = Math.max(0, Number(draft.pyqCount ?? 10) || 0)
    const practiceCount = Math.max(0, Number(draft.practiceCount ?? 10) || 0)

    return {
      ...(crud.editing ?? {}),
      schoolId,
      title: String(draft.title ?? '').trim(),
      description: String(draft.description ?? '').trim() || undefined,
      instructions: toInstructions(String(draft.instructions ?? '')),
      subjectId: String(draft.subjectId ?? ''),
      classLevel: Number(draft.classLevel ?? 10) as Level,
      academicYear: profile?.academicYear ?? '2026-27',
      pyqCount,
      practiceCount,
      totalMarks: (pyqCount + practiceCount) * MARKS_PER_QUESTION,
      durationMin: Math.max(1, Number(draft.durationMin ?? 60) || 60),
      isPublished: Boolean(draft.isPublished),
      allowRetry: Boolean(draft.allowRetry),
      createdBy: profile?.id ?? '',
      createdByName: profile?.name ?? '',
      ...(isNew ? { createdAt: Date.now() } : {}),
    }
  }

  const columns: Column<MockTest>[] = [
    {
      key: 'title',
      header: 'Mock test',
      cell: (t) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{truncate(t.title, 70)}</p>
          {t.description && <p className="truncate text-[11px] text-muted">{t.description}</p>}
        </div>
      ),
    },
    {
      key: 'subject',
      header: 'Subject',
      hideBelow: 'md',
      cell: (t) => subjectById.get(t.subjectId)?.name ?? '—',
    },
    {
      key: 'class',
      header: 'Class',
      hideBelow: 'lg',
      cell: (t) => `Class ${t.classLevel}`,
    },
    {
      key: 'mix',
      header: 'Mix',
      hideBelow: 'sm',
      cell: (t) => (
        <span className="tabular text-xs">
          {t.pyqCount} PYQ + {t.practiceCount} practice
        </span>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      align: 'right',
      hideBelow: 'sm',
      cell: (t) => <span className="tabular">{t.durationMin}m</span>,
    },
    {
      key: 'marks',
      header: 'Marks',
      align: 'right',
      hideBelow: 'lg',
      cell: (t) => <span className="tabular">{t.totalMarks}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'right',
      hideBelow: 'sm',
      cell: (t) => (
        <Badge tone={t.isPublished ? 'success' : 'neutral'}>{t.isPublished ? 'Published' : 'Draft'}</Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (t) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            aria-label={t.isPublished ? `Unpublish ${t.title}` : `Publish ${t.title}`}
            onClick={() =>
              void save(
                COLLECTIONS.mockTests,
                { ...t, isPublished: !t.isPublished },
                { id: t.id, success: t.isPublished ? 'Mock test unpublished' : 'Mock test published' }
              )
            }
            className={`grid size-8 place-items-center rounded-lg transition ${
              t.isPublished ? 'text-success hover:bg-success-soft' : 'text-muted hover:bg-surface-2'
            }`}
          >
            {t.isPublished ? <X className="size-4" aria-hidden /> : <Send className="size-4" aria-hidden />}
          </button>
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

  if (tests.loading) return <LoadingState label="Loading mock tests…" rows={5} />

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Mock Tests"
        description="Full-length papers mixing past-year questions with fresh practice for your class."
        action={
          <Button size="sm" onClick={crud.create}>
            New mock test
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatTile label="Mock tests" value={tests.data.length} icon={<ClipboardList className="size-4" />} />
        <StatTile label="Published" value={published} tone="success" />
        <StatTile label="Avg duration" value={`${avgDuration}m`} tone="info" />
      </div>

      <DataTable
        rows={tests.data}
        columns={columns}
        rowKey={(t) => t.id}
        onRowClick={(t) => crud.edit(t)}
        empty={{
          title: 'No mock tests yet',
          description: 'Create one and students can attempt it exactly like a real exam.',
        }}
      />

      <CrudModal<MockTest>
        open={crud.open}
        editing={crud.editing}
        title={crud.editing ? 'Edit mock test' : 'New mock test'}
        description="Each question is worth 10 marks, so the total is derived from your question mix."
        collection={COLLECTIONS.mockTests}
        deleteLabel="mock test"
        build={buildTest}
        fields={(d, set) => {
          const pyqCount = Math.max(0, Number(d.pyqCount ?? 10) || 0)
          const practiceCount = Math.max(0, Number(d.practiceCount ?? 10) || 0)
          const total = (pyqCount + practiceCount) * MARKS_PER_QUESTION

          return (
            <>
              <Input
                label="Title"
                required
                value={String(d.title ?? '')}
                onChange={(e) => set({ title: e.target.value })}
                placeholder="Pre-board full syllabus mock"
              />
              <Textarea
                label="Description"
                rows={3}
                value={String(d.description ?? '')}
                onChange={(e) => set({ description: e.target.value })}
                placeholder="What this paper covers."
              />
              <Textarea
                label="Instructions"
                rows={4}
                hint="One instruction per line. Students read these before starting."
                value={
                  Array.isArray(d.instructions) ? (d.instructions as string[]).join('\n') : String(d.instructions ?? '')
                }
                onChange={(e) => set({ instructions: e.target.value })}
                placeholder={'Answer all questions.\nRough work will not be marked.'}
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
                  label="PYQ questions"
                  type="number"
                  min={0}
                  value={String(d.pyqCount ?? 10)}
                  onChange={(e) => set({ pyqCount: Number(e.target.value) })}
                />
                <Input
                  label="Practice questions"
                  type="number"
                  min={0}
                  value={String(d.practiceCount ?? 10)}
                  onChange={(e) => set({ practiceCount: Number(e.target.value) })}
                />
                <Input
                  label="Duration (minutes)"
                  type="number"
                  min={1}
                  hint={`${total} marks · about ${Math.ceil(total / MARKS_PER_QUESTION / 2)} minutes of work`}
                  value={String(d.durationMin ?? 60)}
                  onChange={(e) => set({ durationMin: Number(e.target.value) })}
                />
              </div>
              <Switch
                checked={Boolean(d.allowRetry)}
                onChange={(v) => set({ allowRetry: v })}
                label="Allow retakes"
                description="Students can sit this paper more than once."
              />
              <Switch
                checked={Boolean(d.isPublished)}
                onChange={(v) => set({ isPublished: v })}
                label="Publish to students"
                description="Draft papers stay hidden until you publish them."
              />
            </>
          )
        }}
        onClose={crud.close}
      />

      <ConfirmDialog
        open={Boolean(confirmId)}
        title="Delete this mock test?"
        message="Students will no longer be able to start it. Past attempts are unaffected."
        loading={busy}
        onCancel={() => setConfirmId(null)}
        onConfirm={async () => {
          if (!confirmId) return
          setBusy(true)
          try {
            await remove(COLLECTIONS.mockTests, confirmId, 'Mock test')
            setConfirmId(null)
          } finally {
            setBusy(false)
          }
        }}
      />
    </div>
  )
}
