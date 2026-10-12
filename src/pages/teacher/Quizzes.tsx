import { useState } from 'react'
import { ListChecks, Pencil, Send, Trash2, X } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { COLLECTIONS } from '@/services/db'
import type { Difficulty, Level, Question, Quiz } from '@/services/types'
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
import { titleCase, truncate } from '@/utils/format'

const LEVELS: Level[] = [6, 7, 8, 9, 10, 11, 12]
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']
const QUIZ_DIFFICULTIES = [...DIFFICULTIES, 'mixed'] as const

type QuizDifficulty = Difficulty | 'mixed'

/**
 * Eligible pool for a quiz: active questions in the chosen subject and class,
 * with the requested difficulty floated to the front. `mixed` keeps stored order.
 */
function eligibleQuestionIds(
  pool: Question[],
  subjectId: string,
  classLevel: number,
  difficulty: QuizDifficulty,
  count: number
): string[] {
  const scoped = pool.filter(
    (q) => q.isActive && q.subjectId === subjectId && Number(q.classLevel) === classLevel
  )
  const rank = (q: Question) => (difficulty === 'mixed' || q.difficulty === difficulty ? 0 : 1)
  const ordered = difficulty === 'mixed' ? scoped : [...scoped].sort((a, b) => rank(a) - rank(b))
  return ordered.slice(0, Math.max(0, count)).map((q) => q.id)
}

export default function TeacherQuizzes() {
  const { profile } = useAuth()
  const schoolId = profile?.schoolId ?? ''
  const { subjects, subjectById, chapters } = useSchoolData(schoolId)
  const { save, remove } = useSaver()
  const crud = useCrudModal<Quiz>()

  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const quizzes = useCollection<Quiz>(
    COLLECTIONS.quizzes,
    {
      where: [
        { field: 'schoolId', op: '==', value: schoolId },
        { field: 'createdBy', op: '==', value: profile?.id ?? '' },
      ],
      orderBy: [{ field: 'createdAt', dir: 'desc' }],
    },
    [schoolId, profile?.id]
  )

  const pool = useCollection<Question>(
    COLLECTIONS.questions,
    {
      where: [
        { field: 'schoolId', op: '==', value: schoolId },
        { field: 'isActive', op: '==', value: true },
      ],
    },
    [schoolId]
  )

  const published = quizzes.data.filter((q) => q.isPublished).length
  const questionsServed = quizzes.data.reduce((sum, q) => sum + (Number(q.questionCount) || 0), 0)

  function buildQuiz(draft: Draft): Record<string, unknown> {
    const isNew = !crud.editing
    const subjectId = String(draft.subjectId ?? '')
    const classLevel = Number(draft.classLevel ?? 10)
    const difficulty = String(draft.difficulty ?? 'medium') as QuizDifficulty
    const questionCount = Math.max(1, Number(draft.questionCount ?? 10) || 10)

    return {
      ...(crud.editing ?? {}),
      schoolId,
      title: String(draft.title ?? '').trim(),
      description: String(draft.description ?? '').trim() || undefined,
      subjectId,
      chapterId: String(draft.chapterId ?? '') || undefined,
      classLevel: classLevel as Level,
      academicYear: profile?.academicYear ?? '2026-27',
      difficulty,
      questionCount,
      questionIds: eligibleQuestionIds(pool.data, subjectId, classLevel, difficulty, questionCount),
      timeLimitSec: Math.max(1, Number(draft.timeLimitSec ?? 15) || 15) * 60,
      marksPerQuestion: Math.max(1, Number(draft.marksPerQuestion ?? 1) || 1),
      isPublished: Boolean(draft.isPublished),
      allowRetry: Boolean(draft.allowRetry),
      createdBy: profile?.id ?? '',
      createdByName: profile?.name ?? '',
      ...(isNew ? { createdAt: Date.now() } : {}),
    }
  }

  const columns: Column<Quiz>[] = [
    {
      key: 'title',
      header: 'Quiz',
      cell: (q) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{truncate(q.title, 70)}</p>
          {q.description && <p className="truncate text-[11px] text-muted">{q.description}</p>}
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
      key: 'questions',
      header: 'Questions',
      align: 'right',
      hideBelow: 'sm',
      cell: (q) => <span className="tabular">{q.questionCount}</span>,
    },
    {
      key: 'duration',
      header: 'Duration',
      align: 'right',
      hideBelow: 'sm',
      cell: (q) => <span className="tabular">{Math.round((q.timeLimitSec ?? 0) / 60)}m</span>,
    },
    {
      key: 'marks',
      header: 'Marks',
      align: 'right',
      hideBelow: 'lg',
      cell: (q) => (
        <span className="tabular">{(q.questionCount ?? 0) * (q.marksPerQuestion ?? 0)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'right',
      hideBelow: 'sm',
      cell: (q) => (
        <Badge tone={q.isPublished ? 'success' : 'neutral'}>{q.isPublished ? 'Published' : 'Draft'}</Badge>
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
            aria-label={q.isPublished ? `Unpublish ${q.title}` : `Publish ${q.title}`}
            onClick={() =>
              void save(
                COLLECTIONS.quizzes,
                { ...q, isPublished: !q.isPublished },
                { id: q.id, success: q.isPublished ? 'Quiz unpublished' : 'Quiz published' }
              )
            }
            className={`grid size-8 place-items-center rounded-lg transition ${
              q.isPublished ? 'text-success hover:bg-success-soft' : 'text-muted hover:bg-surface-2'
            }`}
          >
            {q.isPublished ? <X className="size-4" aria-hidden /> : <Send className="size-4" aria-hidden />}
          </button>
          <button
            type="button"
            aria-label={`Edit ${q.title}`}
            onClick={() => crud.edit(q)}
            className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-surface-2"
          >
            <Pencil className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label={`Delete ${q.title}`}
            onClick={() => setConfirmId(q.id)}
            className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      ),
    },
  ]

  if (quizzes.loading) return <LoadingState label="Loading quizzes…" rows={5} />

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Quizzes"
        description="Build timed quizzes. Students get a fresh random set of questions on every attempt."
        action={
          <Button size="sm" onClick={crud.create}>
            New quiz
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatTile label="Quizzes" value={quizzes.data.length} icon={<ListChecks className="size-4" />} />
        <StatTile label="Published" value={published} tone="success" />
        <StatTile label="Questions served" value={questionsServed} tone="gold" />
      </div>

      <DataTable
        rows={quizzes.data}
        columns={columns}
        rowKey={(q) => q.id}
        onRowClick={(q) => crud.edit(q)}
        empty={{
          title: 'No quizzes yet',
          description: 'Create one and pick how many questions students should attempt.',
        }}
      />

      <CrudModal<Quiz>
        open={crud.open}
        editing={crud.editing}
        title={crud.editing ? 'Edit quiz' : 'New quiz'}
        description="Questions are sampled from the eligible bank for this subject and class at attempt time."
        collection={COLLECTIONS.quizzes}
        deleteLabel="quiz"
        build={buildQuiz}
        fields={(d, set) => {
          const subjectId = String(d.subjectId ?? '')
          const classLevel = Number(d.classLevel ?? 10)
          const difficulty = String(d.difficulty ?? 'medium') as QuizDifficulty
          const questionCount = Math.max(1, Number(d.questionCount ?? 10) || 10)
          const chapterChoices = chapters
            .filter((c) => c.subjectId === subjectId && Number(c.classLevel) === classLevel)
            .map((c) => ({ value: c.id, label: `Ch ${c.order} · ${c.name}` }))
          const poolSize = eligibleQuestionIds(
            pool.data,
            subjectId,
            classLevel,
            difficulty,
            Number.MAX_SAFE_INTEGER
          ).length

          return (
            <>
              <Input
                label="Title"
                required
                value={String(d.title ?? '')}
                onChange={(e) => set({ title: e.target.value })}
                placeholder="Photosynthesis — chapter revision"
              />
              <Textarea
                label="Description"
                rows={3}
                value={String(d.description ?? '')}
                onChange={(e) => set({ description: e.target.value })}
                placeholder="What this quiz covers."
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
                  label="Difficulty"
                  value={difficulty}
                  onChange={(e) => set({ difficulty: e.target.value })}
                  options={QUIZ_DIFFICULTIES.map((x) => ({
                    value: x,
                    label: x === 'mixed' ? 'Mixed' : titleCase(x),
                  }))}
                />
                <Input
                  label="Questions per attempt"
                  type="number"
                  min={1}
                  hint={
                    poolSize > 0 && poolSize !== questionCount
                      ? `${poolSize} eligible in the bank — fewer will be served if a student runs out.`
                      : poolSize === 0
                        ? 'No eligible questions for this subject and class yet.'
                        : undefined
                  }
                  value={String(d.questionCount ?? 10)}
                  onChange={(e) => set({ questionCount: Number(e.target.value) })}
                />
                <Input
                  label="Time limit (minutes)"
                  type="number"
                  min={1}
                  value={String(d.timeLimitSec ?? 15)}
                  onChange={(e) => set({ timeLimitSec: Number(e.target.value) })}
                />
                <Input
                  label="Marks per question"
                  type="number"
                  min={1}
                  hint={`Total: ${questionCount * (Math.max(1, Number(d.marksPerQuestion ?? 1) || 1))} marks`}
                  value={String(d.marksPerQuestion ?? 1)}
                  onChange={(e) => set({ marksPerQuestion: Number(e.target.value) })}
                />
              </div>
              <Switch
                checked={Boolean(d.allowRetry)}
                onChange={(v) => set({ allowRetry: v })}
                label="Allow retakes"
                description="Students can attempt this quiz more than once and keep the best score."
              />
              <Switch
                checked={Boolean(d.isPublished)}
                onChange={(v) => set({ isPublished: v })}
                label="Publish to students"
                description="Draft quizzes stay hidden until you publish them."
              />
            </>
          )
        }}
        onClose={crud.close}
      />

      <ConfirmDialog
        open={Boolean(confirmId)}
        title="Delete this quiz?"
        message="Attempts already submitted stay in the leaderboard, but students cannot take it again."
        loading={busy}
        onCancel={() => setConfirmId(null)}
        onConfirm={async () => {
          if (!confirmId) return
          setBusy(true)
          try {
            await remove(COLLECTIONS.quizzes, confirmId, 'Quiz')
            setConfirmId(null)
          } finally {
            setBusy(false)
          }
        }}
      />
    </div>
  )
}
