import { Link, useNavigate } from 'react-router-dom'
import {
  Award,
  BarChart3,
  CheckCircle2,
  CircleSlash,
  Clock,
  Flag,
  Home,
  RotateCcw,
  Share2,
  Target,
  Trophy,
  XCircle,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { COLLECTIONS } from '@/services/db'
import { db } from '@/services'
import { clearSession } from '@/services/attempts'
import type { Pyq, Question, TestAttempt } from '@/services/types'
import { useAsync } from '@/hooks/useCollection'
import { PageHeader, SectionCard, StatTile } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Accordion } from '@/components/ui/Disclosure'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Feedback'
import { formatDateTime, formatDuration } from '@/utils/date'
import { cn } from '@/utils/cn'

export interface AttemptResultProps {
  attemptId: string
  kind: 'quiz' | 'pyq' | 'mock'
  /** Route to return to when the student retakes the test. */
  retryTo: string
  backTo: string
  allowRetry?: boolean
}

/**
 * One result view shared by quizzes, PYQ practice and mock tests so scoring,
 * explanations and the leaderboard hand-off stay identical everywhere.
 */
export default function AttemptResult({
  attemptId,
  kind,
  retryTo,
  backTo,
  allowRetry = true,
}: AttemptResultProps) {
  const navigate = useNavigate()

  const loader = useAsync<{ attempt: TestAttempt; questions: (Question | Pyq)[] } | null>(
    async () => {
      if (!attemptId) return null
      const attempt = await db.get<TestAttempt>(COLLECTIONS.testAttempts, attemptId)
      if (!attempt) return null

      // Explanations live on the question bank, so fetch them by id. A mock
      // paper mixes PYQs and practice questions, so both banks are needed.
      const ids = attempt.results.map((r) => r.questionId)
      const banks =
        kind === 'mock'
          ? await Promise.all([
              db.list<Pyq>(COLLECTIONS.pyqs, {
                where: [
                  { field: 'schoolId', op: '==', value: attempt.schoolId },
                  { field: 'isActive', op: '==', value: true },
                ],
              }),
              db.list<Question>(COLLECTIONS.questions, {
                where: [
                  { field: 'schoolId', op: '==', value: attempt.schoolId },
                  { field: 'isActive', op: '==', value: true },
                ],
              }),
            ]).then(([pyqs, practice]) => [...pyqs, ...practice] as (Question | Pyq)[])
          : kind === 'pyq'
            ? await db.list<Pyq>(COLLECTIONS.pyqs, {
                where: [
                  { field: 'schoolId', op: '==', value: attempt.schoolId },
                  { field: 'isActive', op: '==', value: true },
                ],
              })
            : await db.list<Question>(COLLECTIONS.questions, {
                where: [
                  { field: 'schoolId', op: '==', value: attempt.schoolId },
                  { field: 'isActive', op: '==', value: true },
                ],
              })

      const byId = new Map(banks.map((q) => [q.id, q]))
      return { attempt, questions: ids.map((id) => byId.get(id)).filter(Boolean) as (Question | Pyq)[] }
    },
    [attemptId, kind]
  )

  if (loader.loading) return <LoadingState label="Scoring your paper…" rows={6} />
  if (loader.error) return <ErrorState message={loader.error.message} onRetry={loader.reload} />
  if (!loader.data) {
    return (
      <EmptyState
        title="Result not found"
        description="We could not find this attempt. It may have been removed."
        action={
          <Link to={backTo}>
            <Button>Go back</Button>
          </Link>
        }
      />
    )
  }

  const { attempt, questions } = loader.data
  const passed = attempt.percentage >= 40
  const questionById = new Map(questions.map((q) => [q.id, q]))

  const breakdown = [
    { name: 'Correct', value: attempt.correctCount, fill: 'var(--cx-success)' },
    { name: 'Wrong', value: attempt.wrongCount, fill: 'var(--cx-danger)' },
    { name: 'Skipped', value: attempt.unattemptedCount, fill: 'var(--cx-border-strong)' },
  ].filter((row) => row.value > 0)

  function restart() {
    clearSession(attemptId)
    navigate(retryTo)
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader
        title="Your result"
        breadcrumb={
          <Link to={backTo} className="font-semibold text-muted hover:text-brand">
            ← Back
          </Link>
        }
        action={
          <>
            <Button
              variant="secondary"
              icon={<Share2 className="size-4" />}
              onClick={() => {
                void navigator.clipboard
                  ?.writeText(
                    `I scored ${attempt!.percentage.toFixed(1)}% on "${attempt!.refTitle}" in CampusX!`
                  )
              }}
            >
              Share
            </Button>
            {allowRetry && (
              <Button onClick={restart} icon={<RotateCcw className="size-4" />}>
                Try again
              </Button>
            )}
            <Link to="/dashboard">
              <Button variant="ghost" icon={<Home className="size-4" />}>
                Dashboard
              </Button>
            </Link>
          </>
        }
      />

      {/* Score hero */}
      <div
        className={cn(
          'mb-4 rounded-2xl border p-6 text-center shadow-sm',
          passed ? 'border-success/30 bg-success-soft' : 'border-danger/30 bg-danger-soft'
        )}
      >
        <span
          className={cn(
            'mx-auto mb-3 grid size-14 place-items-center rounded-2xl text-white',
            passed ? 'bg-success' : 'bg-danger'
          )}
        >
          {passed ? <Trophy className="size-7" /> : <Target className="size-7" />}
        </span>
        <p className="text-sm font-semibold text-muted">{attempt.refTitle}</p>
        <p
          className={cn(
            'tabular mt-1 text-5xl font-black',
            passed ? 'text-success' : 'text-danger'
          )}
        >
          {attempt.percentage.toFixed(1)}%
        </p>
        <p className="mt-1 text-sm font-bold text-ink">
          {attempt.scoredMarks} / {attempt.totalMarks} marks
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <Badge tone={passed ? 'success' : 'danger'} size="md">
            {passed ? 'Passed' : 'Keep practising'}
          </Badge>
          {attempt.autoSubmitted && (
            <Badge tone="warn" size="md">
              Auto-submitted
            </Badge>
          )}
          <Badge tone="neutral" size="md">
            {attempt.subjectName}
          </Badge>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Correct"
          value={attempt.correctCount}
          hint={`of ${attempt.totalQuestions}`}
          icon={<CheckCircle2 className="size-4" />}
          tone="success"
        />
        <StatTile
          label="Incorrect"
          value={attempt.wrongCount}
          icon={<XCircle className="size-4" />}
          tone="danger"
        />
        <StatTile
          label="Skipped"
          value={attempt.unattemptedCount}
          icon={<CircleSlash className="size-4" />}
          tone="info"
        />
        <StatTile
          label="Time taken"
          value={formatDuration(attempt.timeSpentSec)}
          icon={<Clock className="size-4" />}
          tone="info"
        />
      </div>

      {breakdown.length > 0 && (
        <SectionCard
          className="mb-4"
          title="Answer breakdown"
          subtitle={`Submitted ${formatDateTime(attempt.submittedAt)}`}
          icon={<BarChart3 className="size-4" />}
        >
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={breakdown} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--cx-border)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: 'var(--cx-muted)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: 'var(--cx-muted)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'var(--cx-surface-2)' }}
                  contentStyle={{
                    background: 'var(--cx-surface)',
                    border: '1px solid var(--cx-border)',
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {breakdown.map((row) => (
                    <Cell key={row.name} fill={row.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      )}

      {/* Question-by-question review */}
      <SectionCard
        title="Review with explanations"
        subtitle="Expand a question to see why each answer was right or wrong"
        icon={<Award className="size-4" />}
      >
        <div className="space-y-2">
          {attempt.results.map((row, i) => {
            const question = questionById.get(row.questionId)
            const unanswered = row.chosen === null
            return (
              <Accordion
                key={row.questionId}
                title={
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn(
                        'grid size-6 shrink-0 place-items-center rounded-md text-[10px] font-black text-white',
                        row.isCorrect ? 'bg-success' : unanswered ? 'bg-muted' : 'bg-danger'
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {question?.question ?? `Question ${i + 1}`}
                      </span>
                      <span
                        className={cn(
                          'text-[11px] font-bold',
                          row.isCorrect ? 'text-success' : unanswered ? 'text-muted' : 'text-danger'
                        )}
                      >
                        {row.isCorrect ? 'Correct' : unanswered ? 'Skipped' : 'Incorrect'}
                      </span>
                    </span>
                  </span>
                }
                badge={
                  <span className="flex shrink-0 items-center gap-1 text-[10px] text-muted">
                    <Flag className="size-3" aria-hidden />
                    {row.timeSpentSec}s
                  </span>
                }
              >
                {question ? (
                  <div className="space-y-3">
                    <p className="text-sm leading-relaxed font-medium text-ink">{question.question}</p>

                    <ul className="space-y-1.5">
                      {question.options.map((option, oi) => {
                        const isCorrect = oi === row.correct
                        const isChosen = oi === row.chosen
                        return (
                          <li
                            key={oi}
                            className={cn(
                              'flex items-start gap-2.5 rounded-lg border px-3 py-2 text-sm',
                              isCorrect
                                ? 'border-success/40 bg-success-soft'
                                : isChosen
                                  ? 'border-danger/40 bg-danger-soft'
                                  : 'border-border'
                            )}
                          >
                            <span
                              className={cn(
                                'mt-0.5 grid size-5 shrink-0 place-items-center rounded text-[10px] font-bold',
                                isCorrect ? 'bg-success text-white' : isChosen ? 'bg-danger text-white' : 'text-muted'
                              )}
                            >
                              {String.fromCharCode(65 + oi)}
                            </span>
                            <span className="flex-1 text-ink-2">{option}</span>
                            {isCorrect && <Badge tone="success">Correct answer</Badge>}
                            {isChosen && !isCorrect && <Badge tone="danger">Your answer</Badge>}
                          </li>
                        )
                      })}
                    </ul>

                    {question.explanation && (
                      <div className="rounded-lg border-l-2 border-brand bg-surface-2 px-3 py-2.5">
                        <p className="text-xs font-bold tracking-wide text-brand uppercase">Explanation</p>
                        <p className="mt-1 text-sm leading-relaxed text-ink-2">{question.explanation}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted">
                    The source question is no longer available, but your answer was recorded as{' '}
                    {unanswered ? 'skipped' : row.isCorrect ? 'correct' : 'incorrect'}.
                  </p>
                )}
              </Accordion>
            )
          })}
        </div>
      </SectionCard>

      <Card className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">
          This attempt is recorded and your leaderboard metrics have been refreshed.
        </p>
        <Link to="/leaderboard/me">
          <Button variant="secondary" size="sm">
            See my progress
          </Button>
        </Link>
      </Card>
    </div>
  )
}