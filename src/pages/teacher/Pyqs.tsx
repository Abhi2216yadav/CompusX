import { useState } from 'react'
import { Archive, Pencil, Trash2 } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { COLLECTIONS } from '@/services/db'
import type { Difficulty, Level, Pyq, QuestionType } from '@/services/types'
import { useCollection } from '@/hooks/useCollection'
import { useSchoolData, subjectOptions, useSaver } from '@/hooks/useSchoolData'
import { CrudModal, useCrudModal, useRowSearch, type Draft } from '@/components/crud/CrudShell'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageHeader, StatTile } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { ConfirmDialog } from '@/components/ui/Modal'
import { LoadingState } from '@/components/ui/Feedback'
import { titleCase, truncate } from '@/utils/format'

const LEVELS: Level[] = [6, 7, 8, 9, 10, 11, 12]
const TYPES: QuestionType[] = ['mcq', 'truefalse']
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']
const OPTION_LABELS = ['A', 'B', 'C', 'D']
const BLANK_OPTIONS = ['', '', '', '']

const TYPE_LABEL: Record<QuestionType, string> = {
  mcq: 'Multiple choice',
  truefalse: 'True / false',
}

const DIFFICULTY_TONE: Record<Difficulty, 'success' | 'warn' | 'danger'> = {
  easy: 'success',
  medium: 'warn',
  hard: 'danger',
}

const PYQ_FIELDS = (p: Pyq): string[] => [
  p.question,
  p.explanation,
  p.examName ?? '',
  p.board ?? '',
  String(p.year ?? ''),
  ...(p.tags ?? []),
]

function readOptions(draft: Draft): string[] {
  const raw = Array.isArray(draft.options)
    ? (draft.options as unknown[]).map((o) => String(o))
    : BLANK_OPTIONS
  return BLANK_OPTIONS.map((_, i) => raw[i] ?? '')
}

function optionCount(type: QuestionType): number {
  return type === 'truefalse' ? 2 : 4
}

export default function TeacherPyqs() {
  const { profile } = useAuth()
  const schoolId = profile?.schoolId ?? ''
  const { subjects, subjectById, chapters } = useSchoolData(schoolId)
  const { remove } = useSaver()
  const crud = useCrudModal<Pyq>()

  const [subjectFilter, setSubjectFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState('all')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const pyqs = useCollection<Pyq>(
    COLLECTIONS.pyqs,
    {
      where: [
        { field: 'schoolId', op: '==', value: schoolId },
        ...(subjectFilter !== 'all'
          ? [{ field: 'subjectId', op: '==' as const, value: subjectFilter }]
          : []),
        ...(levelFilter !== 'all'
          ? [{ field: 'classLevel', op: '==' as const, value: Number(levelFilter) }]
          : []),
      ],
      orderBy: [{ field: 'createdAt', dir: 'desc' }],
    },
    [schoolId, subjectFilter, levelFilter]
  )

  const search = useRowSearch(pyqs.data, PYQ_FIELDS)
  const rows = search.filtered

  const yearsCovered = new Set(pyqs.data.map((p) => Number(p.year) || 0).filter(Boolean)).size
  const totalMarks = pyqs.data.reduce((sum, p) => sum + (Number(p.marks) || 0), 0)

  function buildPyq(draft: Draft): Record<string, unknown> {
    const isNew = !crud.editing
    const type: QuestionType = String(draft.type ?? 'mcq') === 'truefalse' ? 'truefalse' : 'mcq'
    const slots = optionCount(type)
    const raw = readOptions(draft)

    return {
      ...(crud.editing ?? {}),
      schoolId,
      subjectId: String(draft.subjectId ?? ''),
      chapterId: String(draft.chapterId ?? '') || undefined,
      classLevel: Number(draft.classLevel ?? 10) as Level,
      question: String(draft.question ?? '').trim(),
      options: type === 'truefalse' ? ['True', 'False'] : BLANK_OPTIONS.map((_, i) => String(raw[i] ?? '').trim()),
      correctIndex: Math.max(0, Math.min(slots - 1, Number(draft.correctIndex ?? 0))),
      explanation: String(draft.explanation ?? '').trim(),
      marks: Number(draft.marks ?? 1) || 1,
      examName: String(draft.examName ?? '').trim(),
      year: Number(draft.year ?? new Date().getFullYear()) || new Date().getFullYear(),
      board: String(draft.board ?? '').trim() || undefined,
      type,
      difficulty: String(draft.difficulty ?? 'medium') as Difficulty,
      tags: String(draft.tags ?? '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      createdBy: profile?.id ?? '',
      isActive: true,
      ...(isNew ? { createdAt: Date.now() } : {}),
    }
  }

  const columns: Column<Pyq>[] = [
    {
      key: 'question',
      header: 'Question',
      cell: (p) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{truncate(p.question, 96)}</p>
          <Badge tone={DIFFICULTY_TONE[p.difficulty] ?? 'neutral'} className="mt-1">
            {titleCase(p.difficulty)}
          </Badge>
        </div>
      ),
    },
    {
      key: 'exam',
      header: 'Exam',
      hideBelow: 'sm',
      cell: (p) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-ink-2">{p.examName || '—'}</p>
          <p className="tabular text-[11px] text-muted">
            {p.year}
            {p.board ? ` · ${p.board}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'subject',
      header: 'Subject',
      hideBelow: 'md',
      cell: (p) => subjectById.get(p.subjectId)?.name ?? '—',
    },
    {
      key: 'class',
      header: 'Class',
      hideBelow: 'lg',
      cell: (p) => `Class ${p.classLevel}`,
    },
    {
      key: 'marks',
      header: 'Marks',
      align: 'right',
      hideBelow: 'sm',
      cell: (p) => <span className="tabular">{p.marks}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (p) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            aria-label={`Edit ${truncate(p.question, 40)}`}
            onClick={() => crud.edit(p)}
            className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-surface-2"
          >
            <Pencil className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label={`Delete ${truncate(p.question, 40)}`}
            onClick={() => setConfirmId(p.id)}
            className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      ),
    },
  ]

  if (pyqs.loading) return <LoadingState label="Loading PYQ bank…" rows={5} />

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="PYQ Bank"
        description="Previous-year questions students can practise, tagged by exam and year."
        action={
          <Button size="sm" onClick={crud.create}>
            New PYQ
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatTile label="PYQs" value={pyqs.data.length} icon={<Archive className="size-4" />} />
        <StatTile label="Years covered" value={yearsCovered} tone="info" />
        <StatTile label="Marks" value={totalMarks} tone="gold" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1 sm:max-w-xs">
          <Input
            value={search.query}
            onChange={(e) => search.setQuery(e.target.value)}
            placeholder="Search question, exam or board…"
            aria-label="Search PYQs"
            className="h-9"
          />
        </div>
        <Select
          aria-label="Filter by subject"
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          options={subjectOptions(subjects)}
          className="h-9 w-auto min-w-32 text-xs font-semibold"
        />
        <Select
          aria-label="Filter by class"
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All classes' },
            ...LEVELS.map((l) => ({ value: String(l), label: `Class ${l}` })),
          ]}
          className="h-9 w-auto min-w-32 text-xs font-semibold"
        />
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(p) => p.id}
        onRowClick={(p) => crud.edit(p)}
        empty={{
          title: search.query ? 'No PYQs match' : 'No PYQs yet',
          description: search.query
            ? 'Try a different keyword or clear the filters.'
            : 'Add past board questions so students can revise from real papers.',
        }}
      />

      <CrudModal<Pyq>
        open={crud.open}
        editing={crud.editing}
        title={crud.editing ? 'Edit PYQ' : 'New PYQ'}
        description="Tag every paper with its exam name and year so students can browse by year."
        size="xl"
        collection={COLLECTIONS.pyqs}
        deleteLabel="PYQ"
        build={buildPyq}
        fields={(d, set) => {
          const type: QuestionType = String(d.type ?? 'mcq') === 'truefalse' ? 'truefalse' : 'mcq'
          const slots = optionCount(type)
          const options = readOptions(d)
          const correct = Number(d.correctIndex ?? 0)
          const subjectId = String(d.subjectId ?? '')
          const level = Number(d.classLevel ?? 10)
          const chapterChoices = chapters
            .filter((c) => c.subjectId === subjectId && Number(c.classLevel) === level)
            .map((c) => ({ value: c.id, label: `Ch ${c.order} · ${c.name}` }))

          return (
            <>
              <div className="grid gap-3.5 sm:grid-cols-3">
                <Input
                  label="Exam name"
                  required
                  value={String(d.examName ?? '')}
                  onChange={(e) => set({ examName: e.target.value })}
                  placeholder="Board Exam 2025"
                />
                <Input
                  label="Year"
                  type="number"
                  min={1990}
                  max={2100}
                  value={String(d.year ?? '')}
                  onChange={(e) => set({ year: Number(e.target.value) })}
                />
                <Input
                  label="Board (optional)"
                  value={String(d.board ?? '')}
                  onChange={(e) => set({ board: e.target.value })}
                  placeholder="CBSE"
                />
              </div>

              <Textarea
                label="Question"
                rows={4}
                required
                value={String(d.question ?? '')}
                onChange={(e) => set({ question: e.target.value })}
                placeholder="Which of the following is a prime number?"
              />

              {type === 'truefalse' ? (
                <div className="grid gap-3.5 sm:grid-cols-2">
                  {OPTION_LABELS.slice(0, 2).map((label, i) => (
                    <Input key={label} label={`Option ${label}`} value={i === 0 ? 'True' : 'False'} readOnly />
                  ))}
                </div>
              ) : (
                <div className="grid gap-3.5 sm:grid-cols-2">
                  {OPTION_LABELS.map((label, i) => (
                    <Input
                      key={label}
                      label={`Option ${label}`}
                      value={options[i]}
                      onChange={(e) =>
                        set({ options: options.map((o, j) => (j === i ? e.target.value : o)) })
                      }
                      placeholder={`Option ${label} text`}
                    />
                  ))}
                </div>
              )}

              <fieldset>
                <legend className="cx-label">Correct answer</legend>
                <div className="flex flex-wrap gap-2">
                  {OPTION_LABELS.slice(0, slots).map((label, i) => {
                    const active = correct === i
                    return (
                      <button
                        key={label}
                        type="button"
                        aria-pressed={active}
                        onClick={() => set({ correctIndex: active ? -1 : i })}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                          active ? 'bg-brand text-white' : 'bg-surface-2 text-muted hover:text-ink'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
                <p className="mt-1.5 text-xs text-muted">Click the active letter again to clear it.</p>
              </fieldset>

              <Textarea
                label="Explanation"
                rows={3}
                required
                value={String(d.explanation ?? '')}
                onChange={(e) => set({ explanation: e.target.value })}
                placeholder="Why this is the correct option, in one or two lines."
              />

              <div className="grid gap-3.5 sm:grid-cols-2">
                <Select
                  label="Subject"
                  required
                  value={subjectId}
                  onChange={(e) => set({ subjectId: e.target.value, chapterId: '' })}
                  options={subjectOptions(subjects, false)}
                />
                <Select
                  label="Class"
                  required
                  value={String(d.classLevel ?? 10)}
                  onChange={(e) => set({ classLevel: Number(e.target.value), chapterId: '' })}
                  options={LEVELS.map((l) => ({ value: String(l), label: `Class ${l}` }))}
                />
                <Select
                  label="Chapter"
                  placeholder="Whole subject"
                  value={String(d.chapterId ?? '')}
                  onChange={(e) => set({ chapterId: e.target.value })}
                  options={chapterChoices}
                />
                <Select
                  label="Question type"
                  value={type}
                  onChange={(e) => set({ type: e.target.value, correctIndex: 0 })}
                  options={TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] }))}
                />
                <Select
                  label="Difficulty"
                  value={String(d.difficulty ?? 'medium')}
                  onChange={(e) => set({ difficulty: e.target.value })}
                  options={DIFFICULTIES.map((x) => ({ value: x, label: titleCase(x) }))}
                />
                <Input
                  label="Marks"
                  type="number"
                  min={1}
                  value={String(d.marks ?? 1)}
                  onChange={(e) => set({ marks: Number(e.target.value) })}
                />
              </div>

              <Input
                label="Tags"
                hint="Comma separated, e.g. trigonometry, board 2025"
                value={Array.isArray(d.tags) ? (d.tags as string[]).join(', ') : String(d.tags ?? '')}
                onChange={(e) => set({ tags: e.target.value })}
                placeholder="trigonometry, chapter 8"
              />
            </>
          )
        }}
        onClose={crud.close}
      />

      <ConfirmDialog
        open={Boolean(confirmId)}
        title="Delete this PYQ?"
        message="It disappears from the practice library straight away."
        loading={busy}
        onCancel={() => setConfirmId(null)}
        onConfirm={async () => {
          if (!confirmId) return
          setBusy(true)
          try {
            await remove(COLLECTIONS.pyqs, confirmId, 'PYQ')
            setConfirmId(null)
          } finally {
            setBusy(false)
          }
        }}
      />
    </div>
  )
}
