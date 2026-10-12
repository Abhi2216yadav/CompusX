import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, ChevronRight, Clock, FileQuestion, Lock, Play, RotateCcw, Trophy } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { COLLECTIONS } from '@/services/db'
import type { Quiz } from '@/services/types'
import { useCollection } from '@/hooks/useCollection'
import { useSchoolData, subjectOptions } from '@/hooks/useSchoolData'
import { useDebounced } from '@/hooks/useUi'
import { PageHeader, StatTile } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Input'
import { Tabs } from '@/components/ui/Disclosure'
import { EmptyState, LoadingState } from '@/components/ui/Feedback'
import { formatDate, formatDuration } from '@/utils/date'

export default function QuizList() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { subjects, subjectById } = useSchoolData(profile?.schoolId)

  const [tab, setTab] = useState<'available' | 'attempted'>('available')
  const [subjectId, setSubjectId] = useState('all')
  const [query, setQuery] = useState('')
  const debounced = useDebounced(query)

  const quizzes = useCollection<Quiz>(
    COLLECTIONS.quizzes,
    {
      where: [
        { field: 'schoolId', op: '==', value: profile?.schoolId ?? '' },
        { field: 'classLevel', op: '==', value: profile?.classLevel ?? 10 },
        { field: 'isPublished', op: '==', value: true },
      ],
    },
    [profile?.schoolId, profile?.classLevel]
  )

  const attempts = useCollection<{ id: string; refId: string; percentage: number; submittedAt: unknown }>(
    COLLECTIONS.testAttempts,
    {
      where: [
        { field: 'schoolId', op: '==', value: profile?.schoolId ?? '' },
        { field: 'studentId', op: '==', value: profile?.id ?? '' },
        { field: 'kind', op: '==', value: 'quiz' },
      ],
      orderBy: [{ field: 'submittedAt', dir: 'desc' }],
    },
    [profile?.schoolId, profile?.id]
  )

  /** Latest attempt per quiz, so a retake is allowed only when the teacher permits it. */
  const latestByQuiz = useMemo(() => {
    const map = new Map<string, { id: string; percentage: number; submittedAt: unknown }>()
    for (const a of attempts.data) if (!map.has(a.refId)) map.set(a.refId, a)
    return map
  }, [attempts.data])

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase()
    return quizzes.data
      .filter((quiz) => (subjectId === 'all' ? true : quiz.subjectId === subjectId))
      .filter((quiz) => (tab === 'attempted' ? latestByQuiz.has(quiz.id) : !latestByQuiz.has(quiz.id)))
      .filter(
        (quiz) =>
          !q ||
          quiz.title.toLowerCase().includes(q) ||
          (quiz.description ?? '').toLowerCase().includes(q)
      )
      .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
  }, [quizzes.data, subjectId, tab, debounced, latestByQuiz])

  const attemptedCount = quizzes.data.filter((q) => latestByQuiz.has(q.id)).length

  if (quizzes.loading) return <LoadingState label="Loading quizzes…" rows={4} />

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Quizzes"
        description="Short question sets from your teachers. Each attempt is graded immediately."
        action={
          <Link
            to="/pyq"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
          >
            Practise PYQs instead
            <ChevronRight className="size-3.5" aria-hidden />
          </Link>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3">
        <StatTile label="Available" value={quizzes.data.length - attemptedCount} tone="brand" icon={<FileQuestion className="size-4" />} />
        <StatTile label="Attempted" value={attemptedCount} tone="success" icon={<Trophy className="size-4" />} />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-56">
          <Select
            label="Subject"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            options={subjectOptions(subjects)}
          />
        </div>
        <div className="flex-1" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search quizzes…"
          aria-label="Search quizzes"
          className="cx-input h-9 w-full text-sm sm:w-52"
        />
      </div>

      <div className="mb-4">
        <Tabs
          value={tab}
          onChange={(v) => setTab(v as typeof tab)}
          items={[
            { value: 'available', label: 'Not attempted', count: quizzes.data.length - attemptedCount },
            { value: 'attempted', label: 'Attempted', count: attemptedCount },
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={tab === 'available' ? 'No pending quizzes' : 'Nothing attempted yet'}
          description={
            tab === 'available'
              ? 'You have attempted every published quiz for this class. New quizzes appear here when teachers publish them.'
              : 'Attempt a quiz and your result will show up here.'
          }
          icon={<BookOpen className="size-6" />}
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {filtered.map((quiz) => {
            const attempt = latestByQuiz.get(quiz.id)
            const canRetry = !attempt || quiz.allowRetry
            return (
              <li
                key={quiz.id}
                className="flex flex-col rounded-2xl border border-border bg-surface p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">{subjectById.get(quiz.subjectId)?.name ?? 'General'}</Badge>
                  <Badge tone={quiz.difficulty === 'hard' ? 'danger' : quiz.difficulty === 'easy' ? 'success' : 'warn'}>
                    {quiz.difficulty}
                  </Badge>
                  {attempt && <Badge tone="brand">Scored {Math.round(attempt.percentage)}%</Badge>}
                </div>

                <h3 className="mt-2.5 text-sm font-bold text-ink">{quiz.title}</h3>
                {quiz.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted">{quiz.description}</p>
                )}

                <div className="mt-3 flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <FileQuestion className="size-3.5" aria-hidden />
                    {quiz.questionCount} questions
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="size-3.5" aria-hidden />
                    {quiz.timeLimitSec ? formatDuration(quiz.timeLimitSec) : 'Untimed'}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Trophy className="size-3.5" aria-hidden />
                    {quiz.marksPerQuestion}m each
                  </span>
                </div>

                <p className="mt-1.5 text-[11px] text-muted">Set by {quiz.createdByName} · {formatDate(quiz.createdAt)}</p>

                <div className="mt-auto pt-4">
                  {attempt && !canRetry ? (
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/quiz/result/${attempt.id}`}
                        className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-xs font-bold text-ink transition hover:bg-surface-3"
                      >
                        Review answers
                      </Link>
                      <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-surface-2 px-3 text-xs font-semibold text-muted">
                        <Lock className="size-3" aria-hidden />
                        Retakes closed
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate(`/quiz/${quiz.id}`)}
                      className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-xs font-bold text-white shadow-sm transition hover:bg-brand-hover"
                    >
                      {attempt ? (
                        <>
                          <RotateCcw className="size-3.5" aria-hidden />
                          Retake quiz
                        </>
                      ) : (
                        <>
                          <Play className="size-3.5" aria-hidden />
                          Start quiz
                        </>
                      )}
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}