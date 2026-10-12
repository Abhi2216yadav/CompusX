import { useState } from 'react'
import { Library, Pencil, Trash2 } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { COLLECTIONS } from '@/services/db'
import type { Difficulty, Level, Question, QuestionType } from '@/services/types'
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

const DIFFICULTY_TONE: Record<Difficulty, 'success' | 'warn' | 'danger'> = {
  easy: 'success',
  medium: 'warn',
  hard: 'danger',
}

const TYPE_LABEL: Record<QuestionType, string> = {
  mcq: 'Multiple choice',
  truefalse: 'True / false',
}

const QUESTION_FIELDS = (q: Question): string[] => [q.question, q.explanation, ...(q.tags ?? [])]

/** Always exposes four slots so the option inputs stay stable while typing. */
function readOptions(draft: Draft): string[] {
  const raw = Array.isArray(draft.options)
    ? (draft.options as unknown[]).map((o) => String(o))
    : BLANK_OPTIONS
  return BLANK_OPTIONS.map((_, i) => raw[i] ?? '')
}

function optionCount(type: QuestionType): number {
  return type === 'truefalse' ? 2 : 4
}

export default function TeacherQuestions() {
  const { profile } = useAuth()
  const schoolId = profile?.schoolId ?? ''
  const { subjects, subjectById, chapters } = useSchoolData(schoolId)
  const { remove } = useSaver()
  const crud = useCrudModal<Question>()

  const [subjectFilter, setSubjectFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState('all')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const questions = useCollection<Question>(
    COLLECTIONS.questions,
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

  const search = useRowSearch(questions.data, QUESTION_FIELDS)
  const rows = search.filtered

  const activeCount = questions.data.filter((q) => q.isActive).length
  const totalMarks = questions.data.reduce((sum, q) => sum + (Number(q.marks) || 0), 0)

  function buildQuestion(draft: Draft): Record<string, unknown> {
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
      academicYear: profile?.academicYear ?? '2026-27',
      question: String(draft.question ?? '').trim(),
      options: type === 'truefalse' ? ['True', 'False'] : BLANK_OPTIONS.map((_, i) => String(raw[i] ?? '').trim()),
      correctIndex: Math.max(0, Math.min(slots - 1, Number(draft.correctIndex ?? 0))),
      explanation: String(draft.explanation ?? '').trim(),
      marks: Number(draft.marks ?? 1) || 1,
      type,
      difficulty: String(draft.difficulty ?? 'medium') as Difficulty,
      tags: String(draft.tags ?? '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      createdBy: profile?.id ?? '',
      createdByName: profile?.name ?? '',
      isActive: true,
      ...(isNew ? { createdAt: Date.now() } : {}),
    }
  }

  const columns: Column<Question>[] = [
    {
      key: 'question',
      header: 'Question',
      cell: (q) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{truncate(q.question, 96)}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge tone={DIFFICULTY_TONE[q.difficulty] ?? 'neutral'}>{titleCase(q.difficulty)}</Badge>
            {!q.isActive && <Badge tone="neutral">Inactive</Badge>}
          </div>
        </div>
      ),
    },
    {
      key: 'subject',
      header: 'Subject',
      hideBelow: 'md',
      cell: (q) => subjectById.get(q.subjectId)?.name ?? '—',
    },
    {
      key: 'class',
      header: 'Class',
      hideBelow: 'lg',
      cell: (q) => `Class ${q.classLevel}`,
    },
    {
      key: 'marks',
      header: 'Marks',
      align: 'right',
      hideBelow: 'sm',
      cell: (q) => <span className="tabular">{q.marks}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      hideBelow: 'lg',
      cell: (q) => <Badge tone="info">{q.type === 'truefalse' ? 'T/F' : 'MCQ'}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'right',
      hideBelow: 'sm',
      cell: (q) => (
        <Badge tone={q.isActive ? 'success' : 'neutral'}>{q.isActive ? 'Active' : 'Inactive'}</Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (q) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            aria-label={`Edit ${truncate(q.question, 40)}`}
            onClick={() => crud.edit(q)}
            className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-surface-2"
          >
            <Pencil className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label={`Delete ${truncate(q.question, 40)}`}
            onClick={() => setConfirmId(q.id)}
            className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      ),
    },
  ]

  if (questions.loading) return <LoadingState label="Loading question bank…" rows={5} />

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Question Bank"
        description="Author MCQs and true/false items. Quizzes draw from this pool at random."
        action={
          <Button size="sm" onClick={crud.create}>
            New question
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatTile label="Questions" value={questions.data.length} icon={<Library className="size-4" />} />
        <StatTile label="Active" value={activeCount} tone="success" />
        <StatTile label="Total marks in bank" value={totalMarks} tone="gold" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1 sm:max-w-xs">
          <Input
            value={search.query}
            onChange={(e) => search.setQuery(e.target.value)}
            placeholder="Search question, explanation or tag…"
            aria-label="Search questions"
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
        rowKey={(q) => q.id}
        onRowClick={(q) => crud.edit(q)}
        empty={{
          title: search.query ? 'No questions match' : 'No questions yet',
          description: search.query
            ? 'Try a different keyword or clear the filters.'
            : 'Add your first MCQ and it becomes available to every quiz in this subject.',
        }}
      />

      <CrudModal<Question>
        open={crud.open}
        editing={crud.editing}
        title={crud.editing ? 'Edit question' : 'New question'}
        description="Pick the right answer, then explain why — students see the explanation after submitting."
        size="xl"
        collection={COLLECTIONS.questions}
        deleteLabel="question"
        build={buildQuestion}
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
                <p className="mt-1.5 text-xs text-muted">
                  Click the active letter again to clear it.
                </p>
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
                hint="Comma separated, e.g. algebra, revision, class 10"
                value={Array.isArray(d.tags) ? (d.tags as string[]).join(', ') : String(d.tags ?? '')}
                onChange={(e) => set({ tags: e.target.value })}
                placeholder="algebra, chapter 3"
              />
            </>
          )
        }}
        onClose={crud.close}
      />

      <ConfirmDialog
        open={Boolean(confirmId)}
        title="Delete this question?"
        message="Any quiz pool that includes it will serve one question fewer."
        loading={busy}
        onCancel={() => setConfirmId(null)}
        onConfirm={async () => {
          if (!confirmId) return
          setBusy(true)
          try {
            await remove(COLLECTIONS.questions, confirmId, 'Question')
            setConfirmId(null)
          } finally {
            setBusy(false)
          }
        }}
      />
    </div>
  )
}
