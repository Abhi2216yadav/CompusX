import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Award,
  BookOpen,
  Flame,
  Target,
  Trophy,
  Zap,
} from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { getMyRank, getStudentProgress } from '@/services/leaderboard'
import { nextLevelInfo, reputationLevel } from '@/services/ranking'
import { leaderboardFiltersFor } from '@/services/attempts'
import type { StudentProgressDetail } from '@/services/types'
import { useAsync } from '@/hooks/useCollection'
import { PageHeader, SectionCard, StatTile } from '@/components/ui/Card'
import { Avatar, Badge } from '@/components/ui/Badge'
import { Progress, EmptyState, ErrorState, LoadingState } from '@/components/ui/Feedback'
import { formatDate } from '@/utils/date'
import { cn } from '@/utils/cn'

export default function MyProgress() {
  const { profile, school } = useAuth()

  const loader = useAsync<{
    rank: ReturnType<typeof getMyRank> extends Promise<infer T> ? T : never
    detail: StudentProgressDetail | null
  }>(async () => {
    if (!profile) return { rank: null, detail: null }
    const filters = {
      ...leaderboardFiltersFor('overall'),
      academicYear: profile.academicYear ?? school?.currentAcademicYear ?? '2026-27',
    }
    const [rank, detail] = await Promise.all([
      getMyRank(profile.schoolId, profile.id, filters),
      getStudentProgress(profile.schoolId, profile.id, filters),
    ])
    return { rank, detail }
  }, [profile?.id])

  if (loader.loading) return <LoadingState label="Building your report…" rows={6} />
  if (loader.error) return <ErrorState message={loader.error.message} onRetry={loader.reload} />

  const rank = loader.data?.rank
  const detail = loader.data?.detail
  const level = nextLevelInfo(detail?.student.contributionPoints ?? 0)

  if (!rank || !detail) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={<Trophy className="size-6" />}
          title="Complete a test to unlock your report"
          description="Your progress report fills in automatically after your first quiz, PYQ practice set or mock test."
          action={
            <Link
              to="/quiz"
              className="rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-95"
            >
              Browse quizzes
            </Link>
          }
        />
      </div>
    )
  }

  const bandConfig = {
    chasing: { label: 'Chasing the top', tone: 'gold' as const, advice: 'Push your mock test average higher — it carries the most weight.' },
    rising: { label: 'Rising fast', tone: 'success' as const, advice: 'Great trajectory. Keep the weekly streak going.' },
    steady: { label: 'Steady performer', tone: 'info' as const, advice: 'Add PYQ practice to break into the top ranks.' },
    needsPractice: { label: 'Needs practice', tone: 'warn' as const, advice: 'Focus on your weakest chapters listed below.' },
  }[detail.student.band]

  return (
    <div className="mx-auto w-full max-w-5xl">
      <Link
        to="/leaderboard"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-brand"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Back to leaderboard
      </Link>

      <PageHeader
        title="My Progress Report"
        description="All-time academic performance and contribution history."
      />

      {/* Rank hero */}
      <div className="bg-surface border-border mb-4 overflow-hidden rounded-2xl border shadow-sm">
        <div className="flex flex-col items-center gap-4 bg-gradient-to-br from-brand to-accent px-5 py-7 text-center text-white sm:flex-row sm:text-left">
          <Avatar
            name={profile?.name ?? 'Student'}
            src={profile?.photoUrl}
            size={72}
            className="ring-4 ring-white/25"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h2 className="text-xl font-extrabold">{profile?.name}</h2>
              <Badge tone="accent">{reputationLevel(detail.student.contributionPoints)}</Badge>
            </div>
            <p className="mt-1 text-sm text-white/80">
              Rank #{rank.rank} of {rank.totalStudents} · Class {detail.student.classLabel}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              <Badge tone="gold">{bandConfig.label}</Badge>
              {detail.student.consistency >= 70 && (
                <Badge tone="accent" icon={<Flame className="size-3" />}>
                  Consistent
                </Badge>
              )}
            </div>
          </div>
          <div className="shrink-0 text-center sm:text-right">
            <p className="tabular text-4xl font-black">{rank.score.toFixed(1)}%</p>
            <p className="text-xs font-semibold text-white/75">overall score</p>
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-muted">Course progress</span>
            <span className="tabular text-ink">{detail.student.progressPercentage.toFixed(0)}%</span>
          </div>
          <Progress value={detail.student.progressPercentage} size="lg" className="mt-2" />
          <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2.5 text-sm font-medium text-ink-2">
            <Target className="mr-1.5 inline size-3.5 text-brand" aria-hidden />
            {bandConfig.advice}
          </p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Quiz average" value={`${detail.student.quizAverage.toFixed(1)}%`} icon={<BookOpen className="size-4" />} />
        <StatTile label="PYQ accuracy" value={`${detail.student.pyqAccuracy.toFixed(1)}%`} icon={<Award className="size-4" />} tone="gold" />
        <StatTile label="Mock average" value={`${detail.student.mockTestAverage.toFixed(1)}%`} icon={<Trophy className="size-4" />} tone="success" />
        <StatTile label="Contribution" value={`${detail.student.contributionPoints} pts`} icon={<Zap className="size-4" />} tone="info" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Subject mastery" subtitle="Accuracy across every subject you have practised">
          {detail.subjectBreakdown.length === 0 ? (
            <EmptyState compact title="No subject data yet" />
          ) : (
            <ul className="space-y-3">
              {detail.subjectBreakdown.map((s) => (
                <li key={s.subjectId}>
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-ink">{s.name}</span>
                    <span className="tabular shrink-0 text-xs font-bold text-ink-2">{s.percentage.toFixed(0)}%</span>
                  </div>
                  <Progress
                    value={s.percentage}
                    size="sm"
                    tone={s.percentage >= 75 ? 'success' : s.percentage >= 50 ? 'brand' : 'danger'}
                  />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Where to focus" subtitle="Chapters below 65% accuracy">
          {detail.chapterWeak.length === 0 ? (
            <EmptyState compact title="You're on top of it" description="No weak chapters detected." />
          ) : (
            <ul className="space-y-3">
              {detail.chapterWeak.map((c) => (
                <li key={c.chapterId} className="rounded-xl border border-border p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-ink">{c.name}</span>
                    <span
                      className={cn(
                        'tabular shrink-0 text-xs font-bold',
                        c.percentage < 40 ? 'text-danger' : 'text-warn'
                      )}
                    >
                      {c.percentage.toFixed(0)}%
                    </span>
                  </div>
                  <p className="mb-1.5 text-[11px] text-muted">{c.subjectName}</p>
                  <Progress value={c.percentage} size="sm" tone={c.percentage < 40 ? 'danger' : 'warn'} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard
        className="mt-4"
        title="Test history"
        subtitle="Your last 12 submissions"
      >
        {detail.quizHistory.length === 0 ? (
          <EmptyState compact title="Nothing here yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px]">
              <thead>
                <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-muted uppercase">
                  <th className="pb-2">Test</th>
                  <th className="pb-2">Subject</th>
                  <th className="pb-2 text-right">Score</th>
                  <th className="pb-2 text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {detail.quizHistory.map((h) => (
                  <tr key={h.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 text-sm font-semibold text-ink">{h.title}</td>
                    <td className="py-2.5 text-xs text-muted">{h.subjectName}</td>
                    <td className="tabular py-2.5 text-right text-sm font-bold text-ink">{h.percentage.toFixed(0)}%</td>
                    <td className="py-2.5 text-right text-xs text-muted">{formatDate(h.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <div className="mt-4 rounded-2xl border border-border bg-surface px-5 py-4 text-center">
        <p className="text-sm font-semibold text-ink">
          {level.next
            ? `${level.pointsToNext} points to reach ${level.next}`
            : 'You have reached the highest reputation level'}
        </p>
        <Progress value={level.progress} size="sm" className="mx-auto mt-2 max-w-xs" />
      </div>
    </div>
  )
}