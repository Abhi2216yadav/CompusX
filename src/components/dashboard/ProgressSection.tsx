import { useMemo } from 'react'
import {
  ClipboardList,
  Flame,
  GraduationCap,
  Target,
  Timer,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { reputationLevel } from '@/services/ranking'
import type { StudentMetrics, Subject, TestAttempt } from '@/services/types'
import { SectionCard, StatTile } from '@/components/ui/Card'
import { EmptyState, ErrorState, LoadingState, MasteryBar, Progress } from '@/components/ui/Feedback'
import { pluralize } from '@/utils/format'

interface AttemptStats {
  total: number
  best: number
  average: number
  quizTests: number
  mcqQuestions: number
  pyqTests: number
  pyqQuestions: number
  mockTests: number
}

function computeAttemptStats(attempts: TestAttempt[]): AttemptStats {
  const quiz = attempts.filter((a) => a.kind === 'quiz')
  const pyq = attempts.filter((a) => a.kind === 'pyq')
  const mock = attempts.filter((a) => a.kind === 'mock')
  const sum = (rows: TestAttempt[], pick: (a: TestAttempt) => number) =>
    rows.reduce((s, a) => s + pick(a), 0)
  const scored = attempts.filter((a) => a.totalQuestions > 0)
  return {
    total: attempts.length,
    best: attempts.reduce((m, a) => Math.max(m, a.percentage), 0),
    average: scored.length ? sum(scored, (a) => a.percentage) / scored.length : 0,
    quizTests: quiz.length,
    mcqQuestions: sum(quiz, (a) => a.totalQuestions),
    pyqTests: pyq.length,
    pyqQuestions: sum(pyq, (a) => a.totalQuestions),
    mockTests: mock.length,
  }
}

export function ProgressSection({
  metrics,
  streakWeeks,
  attempts,
  chaptersTotal,
  subjectById,
  loading,
  error,
  onRetry,
}: {
  metrics: StudentMetrics | null
  streakWeeks: number
  attempts: TestAttempt[]
  chaptersTotal: number
  subjectById: Map<string, Subject>
  loading: boolean
  error: Error | null
  onRetry: () => void
}) {
  const stats = useMemo(() => computeAttemptStats(attempts), [attempts])

  const all = metrics?.periods.all
  const progress = Math.round(all?.progressPercentage ?? 0)
  const overallScore = all?.overallScore ?? 0
  const questionsAttempted = all?.questionsAttempted ?? 0
  const questionsCorrect = all?.questionsCorrect ?? 0

  const topics = useMemo(() => {
    const mastery = Object.values(metrics?.chapterMastery ?? {})
    const practised = mastery.filter((m) => m.attempted > 0).length
    const mastered = mastery.filter((m) => m.attempted > 0 && m.percentage >= 75).length
    return { practised, mastered }
  }, [metrics])

  const subjectRows = useMemo(() => {
    return Object.entries(metrics?.subjectMastery ?? {})
      .filter(([, m]) => m.attempted > 0)
      .map(([subjectId, m]) => ({
        subjectId,
        name: subjectById.get(subjectId)?.name ?? 'Subject',
        color: subjectById.get(subjectId)?.color,
        percentage: m.percentage,
        attempted: m.attempted,
      }))
      .sort((a, b) => b.percentage - a.percentage)
  }, [metrics, subjectById])

  if (loading) return <LoadingState label="Loading your progress…" rows={4} />
  if (error) return <ErrorState title="Could not load your progress" message={error.message} onRetry={onRetry} />

  return (
    <SectionCard
      title="Your progress"
      subtitle="Accuracy, coverage and streaks across every module"
      icon={<Target className="size-4" />}
      action={
        <Link to="/leaderboard/me" className="text-xs font-bold text-brand hover:underline">
          Full report
        </Link>
      }
    >
      {/* Overall study progress */}
      <div className="rounded-2xl border border-border bg-surface-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink">Overall study progress</p>
            <p className="mt-0.5 text-xs text-muted">
              {questionsAttempted > 0
                ? `${questionsCorrect} of ${questionsAttempted} questions correct`
                : 'Answer your first question to start tracking progress'}
            </p>
          </div>
          <p className="tabular shrink-0 text-3xl font-black text-ink">{progress}%</p>
        </div>
        <Progress value={progress} size="lg" className="mt-3" />
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
          <span>Overall score: <span className="font-bold text-ink">{overallScore.toFixed(1)}/100</span></span>
          <span>·</span>
          <span>
            Study streak:{' '}
            <span className="font-bold text-ink">{streakWeeks > 0 ? pluralize(streakWeeks, 'week') : 'none yet'}</span>
          </span>
        </p>
      </div>

      {/* Headline progress tiles */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile
          label="MCQs attempted"
          value={stats.mcqQuestions}
          hint={stats.quizTests > 0 ? `${pluralize(stats.quizTests, 'quiz', 'quizzes')} taken` : 'not yet'}
          icon={<ClipboardList className="size-4" />}
          tone="info"
          href="/quiz"
        />
        <StatTile
          label="PYQs completed"
          value={stats.pyqTests}
          hint={stats.pyqQuestions > 0 ? `${pluralize(stats.pyqQuestions, 'question')} solved` : 'not yet'}
          icon={<GraduationCap className="size-4" />}
          tone="gold"
          href="/pyq"
        />
        <StatTile
          label="Mock tests attempted"
          value={stats.mockTests}
          hint={stats.mockTests > 0 ? 'timed papers' : 'not yet'}
          icon={<Timer className="size-4" />}
          tone="brand"
          href="/tests"
        />
        <StatTile
          label="Average score"
          value={stats.total > 0 ? `${stats.average.toFixed(0)}%` : '—'}
          hint={stats.total > 0 ? `best ${stats.best.toFixed(0)}%` : 'complete a test'}
          icon={<TrendingUp className="size-4" />}
          tone="success"
          href="/results"
        />
        <StatTile
          label="Study streak"
          value={streakWeeks > 0 ? `${streakWeeks}w` : '—'}
          hint="rolling 7-day streak"
          icon={<Flame className="size-4" />}
          tone="warn"
        />
        <StatTile
          label="XP earned"
          value={metrics?.activityPoints ?? 0}
          hint={`Reputation: ${reputationLevel(metrics?.contributionPoints ?? 0)}`}
          icon={<Zap className="size-4" />}
          tone="warn"
          href="/leaderboard/me"
        />
      </div>

      {/* Topics + subjects */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border p-4">
          <p className="text-xs font-bold tracking-wide text-muted uppercase">Topics covered</p>
          <p className="mt-2 text-2xl font-extrabold text-ink">
            {topics.practised}
            <span className="text-sm font-semibold text-muted"> / {chaptersTotal || '—'} chapters</span>
          </p>
          <p className="mt-0.5 text-[11px] text-muted">Practised at least once in a quiz, PYQ or mock test</p>
          <Progress
            value={chaptersTotal > 0 ? (topics.practised / chaptersTotal) * 100 : 0}
            tone="success"
            className="mt-3"
            showLabel
          />
          <p className="mt-2 text-[11px] text-muted">
            <span className="font-bold text-ink">{topics.mastered}</span> mastered (75% or better)
          </p>
        </div>

        <div className="rounded-2xl border border-border p-4">
          <p className="text-xs font-bold tracking-wide text-muted uppercase">Subject-wise progress</p>
          {subjectRows.length === 0 ? (
            <EmptyState
              compact
              title="No subject data yet"
              description="Practise a few questions and your subject breakdown appears here."
            />
          ) : (
            <div className="mt-3 space-y-4">
              {subjectRows.map((row) => (
                <MasteryBar
                  key={row.subjectId}
                  label={row.name}
                  value={row.percentage}
                  color={row.color}
                  trailing={
                    <p className="text-[11px] text-muted">{pluralize(row.attempted, 'question')} attempted</p>
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  )
}
