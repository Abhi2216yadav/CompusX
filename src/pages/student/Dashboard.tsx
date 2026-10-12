import { useMemo } from 'react'
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Megaphone,
  Timer,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { useAuth } from '@/context/AuthContext'
import { COLLECTIONS } from '@/services/db'
import { getMyRank } from '@/services/leaderboard'
import { nextLevelInfo, reputationLevel } from '@/services/ranking'
import { leaderboardFiltersFor } from '@/services/attempts'
import type { Notice, SchoolEvent, Task, TestAttempt } from '@/services/types'
import { useAsync, useCollection } from '@/hooks/useCollection'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useSchoolData } from '@/hooks/useSchoolData'
import { ClassTopTen } from '@/components/dashboard/ClassTopTen'
import { LearningModules } from '@/components/dashboard/LearningModules'
import { ProgressSection } from '@/components/dashboard/ProgressSection'
import { LeaderboardMiniCard } from '@/components/leaderboard/LeaderboardViews'
import { SectionCard, StatTile } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Progress, EmptyState, LoadingState } from '@/components/ui/Feedback'
import { daysUntil, formatDate, relativeTime } from '@/utils/date'
import { pluralize } from '@/utils/format'
import { cn } from '@/utils/cn'

const ZERO_COUNTS = { materials: 0, quizzes: 0, pyqs: 0, mockTests: 0 }

export default function Dashboard() {
  const { profile, school } = useAuth()

  const schoolId = profile?.schoolId ?? ''
  const classLevel = profile?.classLevel ?? 10
  const { subjectById, chapters } = useSchoolData(profile?.schoolId)

  const attempts = useCollection<TestAttempt>(
    COLLECTIONS.testAttempts,
    {
      where: [
        { field: 'schoolId', op: '==', value: schoolId },
        { field: 'studentId', op: '==', value: profile?.id ?? '' },
      ],
      orderBy: [{ field: 'submittedAt', dir: 'desc' }],
      // Large enough for the per-module progress stats, still capped for cost.
      limit: 200,
    },
    [schoolId, profile?.id]
  )

  const homework = useCollection<Task>(
    COLLECTIONS.homework,
    {
      where: [
        { field: 'schoolId', op: '==', value: schoolId },
        { field: 'classLevel', op: '==', value: classLevel },
      ],
      orderBy: [{ field: 'dueAt', dir: 'asc' }],
      limit: 5,
    },
    [schoolId, classLevel]
  )

  const notices = useCollection<Notice>(
    COLLECTIONS.notices,
    { where: [{ field: 'schoolId', op: '==', value: schoolId }], orderBy: [{ field: 'createdAt', dir: 'desc' }], limit: 4 },
    [schoolId]
  )

  const events = useCollection<SchoolEvent>(
    COLLECTIONS.events,
    { where: [{ field: 'schoolId', op: '==', value: schoolId }], limit: 3 },
    [schoolId]
  )

  const myRank = useAsync(async () => {
    if (!profile) return null
    return getMyRank(profile.schoolId, profile.id, {
      ...leaderboardFiltersFor('weekly'),
      academicYear: profile.academicYear ?? school?.currentAcademicYear ?? '2026-27',
    })
  }, [profile?.id])

  const stats = useDashboardData(profile)

  const allAttempts = attempts.data
  const totals = useMemo(() => {
    const list = allAttempts
    const best = list.reduce((m, a) => Math.max(m, a.percentage), 0)
    const avg = list.length
      ? list.reduce((s, a) => s + a.percentage, 0) / list.length
      : 0
    const questions = list.reduce((s, a) => s + a.totalQuestions, 0)
    return { count: list.length, best, avg, questions }
  }, [allAttempts])

  const chaptersTotal = useMemo(
    () => chapters.filter((c) => c.classLevel === classLevel).length,
    [chapters, classLevel]
  )

  const pendingTasks = (homework.data ?? []).filter(
    (t) => !t.completedBy.includes(profile?.id ?? '')
  )
  const urgent = pendingTasks.filter((t) => daysUntil(t.dueAt) <= 2)
  const upcomingEvents = (events.data ?? [])
    .filter((e) => Number(e.startsAt) >= Date.now())
    .sort((a, b) => Number(a.startsAt) - Number(b.startsAt))
  const pinnedNotices = (notices.data ?? []).filter((n) => n.pinned)

  const firstName = profile?.name?.split(' ')[0] ?? 'Student'
  const classChip = `Class ${profile?.classLevel ?? '—'}`
  const sectionChip = profile?.section ? `Section ${profile.section}` : 'Section —'
  const streakWeeks = stats.data?.streakWeeks ?? 0
  const xp = stats.data?.metrics?.activityPoints ?? 0
  const overallProgress = Math.round(stats.data?.metrics?.periods.all.progressPercentage ?? 0)

  return (
    <div className="mx-auto w-full max-w-7xl">
      {/* ── Welcome ───────────────────────────────────────────────────── */}
      <header className="mb-4 overflow-hidden rounded-2xl border border-border shadow-sm">
        <div className="relative bg-gradient-to-br from-brand via-brand to-accent px-5 py-5 text-white sm:px-6">
          <div className="absolute -top-16 -right-12 size-48 rounded-full bg-white/10 blur-2xl" aria-hidden />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-widest text-white/70 uppercase">
                {school?.name ?? 'Your school'}
              </p>
              <h1 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">
                Welcome back, {firstName} 👋
              </h1>
              <div className="mt-2.5 flex flex-wrap gap-1.5 text-xs font-semibold">
                <span className="rounded-full bg-white/15 px-2.5 py-1">{classChip}</span>
                <span className="rounded-full bg-white/15 px-2.5 py-1">{sectionChip}</span>
                <span className="rounded-full bg-white/15 px-2.5 py-1">
                  🔥 {streakWeeks > 0 ? pluralize(streakWeeks, 'week streak') : 'No streak yet'}
                </span>
                <span className="rounded-full bg-white/15 px-2.5 py-1">⚡ {xp} XP</span>
              </div>
              <div className="mt-3.5 flex flex-wrap gap-2">
                <Link to="/quiz">
                  <Button
                    size="sm"
                    className="border-0 bg-white text-brand hover:bg-white/90"
                    icon={<ClipboardList className="size-4" />}
                  >
                    Take a quiz
                  </Button>
                </Link>
                <Link to="/leaderboard/me">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="border border-white/45 text-white hover:bg-white/15"
                  >
                    View progress
                  </Button>
                </Link>
              </div>
            </div>

            <div className="w-full shrink-0 rounded-2xl bg-white/15 p-4 backdrop-blur sm:w-60">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[11px] font-semibold tracking-wider text-white/75 uppercase">
                  Overall progress
                </p>
                <p className="tabular text-2xl font-black">{overallProgress}%</p>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/25">
                <div
                  className="h-full rounded-full bg-white transition-[width] duration-500 ease-out"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-white/80">
                {stats.loading
                  ? 'Loading your stats…'
                  : `${pluralize(stats.data?.counts.quizzes ?? 0, 'quiz', 'quizzes')} · ${pluralize(
                      stats.data?.counts.mockTests ?? 0,
                      'mock test'
                    )} ready to take`}
              </p>
            </div>
          </div>
        </div>
      </header>

      {urgent.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3">
          <CalendarClock className="size-4 shrink-0 text-danger" aria-hidden />
          <p className="flex-1 text-sm font-semibold text-ink">
            {urgent.length} homework item{urgent.length === 1 ? '' : 's'} due within 2 days.
          </p>
          <Link to="/homework">
            <Button size="sm" variant="danger">
              View now
            </Button>
          </Link>
        </div>
      )}

      {/* Headline stats */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="My rank (this week)"
          value={myRank.data ? `#${myRank.data.rank}` : '—'}
          hint={myRank.data ? `of ${myRank.data.totalStudents} students` : 'Complete a test to appear'}
          icon={<Trophy className="size-4" />}
          tone="gold"
          href="/leaderboard"
        />
        <StatTile
          label="Tests taken"
          value={totals.count}
          hint={totals.count > 0 ? `avg ${totals.avg.toFixed(0)}%` : 'quiz, PYQ and mock'}
          icon={<ClipboardList className="size-4" />}
          href="/results"
        />
        <StatTile
          label="Best score"
          value={totals.count > 0 ? `${totals.best.toFixed(0)}%` : '—'}
          icon={<TrendingUp className="size-4" />}
          tone="success"
        />
        <StatTile
          label="Pending homework"
          value={pendingTasks.length}
          hint={pendingTasks.length > 0 ? 'keep them moving' : 'all caught up'}
          icon={<CheckCircle2 className="size-4" />}
          tone={pendingTasks.length > 0 ? 'warn' : 'success'}
          href="/homework"
        />
      </div>

      {/* ── Learning modules (Notes · MCQ · PYQ · Mock) ───────────────── */}
      <LearningModules
        counts={stats.data?.counts ?? ZERO_COUNTS}
        recentMaterials={stats.data?.recentMaterials ?? []}
        subjectById={subjectById}
        loading={stats.loading}
        error={stats.error}
        onRetry={stats.reload}
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {/* Progress */}
          <ProgressSection
            metrics={stats.data?.metrics ?? null}
            streakWeeks={streakWeeks}
            attempts={allAttempts}
            chaptersTotal={chaptersTotal}
            subjectById={subjectById}
            loading={stats.loading}
            error={stats.error}
            onRetry={stats.reload}
          />

          {/* 🏆 Class Top 10 */}
          <ClassTopTen
            schoolId={schoolId}
            classId={profile?.classId}
            academicYear={profile?.academicYear ?? school?.currentAcademicYear ?? '2026-27'}
            studentId={profile?.id ?? ''}
            label={`Class ${profile?.classLevel ?? '—'}${profile?.section ? `-${profile.section}` : ''}`}
          />

          {/* Homework */}
          <SectionCard
            title="Homework due"
            subtitle={`${pendingTasks.length} pending`}
            icon={<ClipboardList className="size-4" />}
            action={
              <Link to="/homework" className="text-xs font-bold text-brand hover:underline">
                View all
              </Link>
            }
          >
            {homework.loading ? (
              <LoadingState rows={3} />
            ) : pendingTasks.length === 0 ? (
              <EmptyState
                compact
                icon={<CheckCircle2 className="size-5 text-success" />}
                title="All caught up"
                description="No pending homework for your class."
              />
            ) : (
              <ul className="divide-y divide-border">
                {pendingTasks.slice(0, 4).map((task) => {
                  const days = daysUntil(task.dueAt)
                  return (
                    <li key={task.id}>
                      <Link
                        to="/homework"
                        className="flex items-center gap-3 py-2.5 transition hover:bg-surface-2"
                      >
                        <span
                          className={cn(
                            'grid size-9 shrink-0 place-items-center rounded-xl text-[10px] font-black',
                            days <= 0
                              ? 'bg-danger-soft text-danger'
                              : days <= 2
                                ? 'bg-warn-soft text-warn'
                                : 'bg-surface-2 text-muted'
                          )}
                        >
                          {days < 0 ? 'Late' : days === 0 ? 'Today' : `${days}d`}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">{task.title}</p>
                          <p className="text-[11px] text-muted">
                            {task.teacherName} · due {formatDate(task.dueAt)}
                          </p>
                        </div>
                        <ArrowRight className="size-3.5 shrink-0 text-muted" aria-hidden />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </SectionCard>

          {/* Recent results */}
          <SectionCard
            title="Recent activity"
            subtitle="Your last submissions"
            icon={<BarChart3 className="size-4" />}
            action={
              <Link to="/results" className="text-xs font-bold text-brand hover:underline">
                All results
              </Link>
            }
          >
            {attempts.loading ? (
              <LoadingState rows={3} />
            ) : allAttempts.length === 0 ? (
              <EmptyState
                compact
                icon={<Timer className="size-5" />}
                title="No attempts yet"
                description="Take your first quiz to start tracking progress."
                action={
                  <Link to="/quiz">
                    <Button size="sm">Browse quizzes</Button>
                  </Link>
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {allAttempts.slice(0, 5).map((attempt) => (
                  <li key={attempt.id} className="flex items-center gap-3 py-2.5">
                    <span
                      className={cn(
                        'tabular grid size-10 shrink-0 place-items-center rounded-xl text-xs font-extrabold',
                        attempt.percentage >= 75
                          ? 'bg-success-soft text-success'
                          : attempt.percentage >= 40
                            ? 'bg-warn-soft text-warn'
                            : 'bg-danger-soft text-danger'
                      )}
                    >
                      {attempt.percentage.toFixed(0)}%
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{attempt.refTitle}</p>
                      <p className="text-[11px] text-muted">
                        {attempt.subjectName} · {relativeTime(attempt.submittedAt)}
                      </p>
                    </div>
                    <Badge tone={attempt.kind === 'mock' ? 'gold' : attempt.kind === 'pyq' ? 'info' : 'neutral'}>
                      {attempt.kind.toUpperCase()}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {/* Events */}
          {upcomingEvents.length > 0 && (
            <SectionCard title="Upcoming events" icon={<CalendarClock className="size-4" />}>
              <ul className="grid gap-2 sm:grid-cols-3">
                {upcomingEvents.map((event) => (
                  <li key={event.id} className="rounded-xl border border-border p-3">
                    <p className="text-xs font-bold text-brand">{formatDate(event.startsAt)}</p>
                    <p className="mt-0.5 truncate text-sm font-semibold text-ink">{event.name}</p>
                    <p className="truncate text-[11px] text-muted">{event.venue}</p>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <LeaderboardMiniCard
            entries={myRank.data?.entries ?? []}
            myRank={myRank.data?.rank}
            myProgress={myRank.data?.progress}
            isPublic={myRank.data?.isPublic ?? true}
          />

          {/* Reputation */}
          {myRank.data && (
            <SectionCard title="Your contribution" icon={<BookOpen className="size-4" />}>
              <p className="text-2xl font-extrabold text-ink">
                {myRank.data.entries.find((e) => e.studentId === profile?.id)?.contributionPoints ?? 0}
                <span className="ml-1 text-sm font-semibold text-muted">pts</span>
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Level:{' '}
                <span className="font-bold text-brand">
                  {reputationLevel(
                    myRank.data.entries.find((e) => e.studentId === profile?.id)?.contributionPoints ?? 0
                  )}
                </span>
              </p>
              <Progress
                value={nextLevelInfo(
                  myRank.data.entries.find((e) => e.studentId === profile?.id)?.contributionPoints ?? 0
                ).progress}
                size="sm"
                className="mt-2"
              />
              <Link to="/leaderboard/me">
                <Button variant="secondary" size="sm" fullWidth className="mt-3">
                  View full report
                </Button>
              </Link>
            </SectionCard>
          )}

          {/* Notices */}
          <SectionCard
            title="Notices"
            icon={<Megaphone className="size-4" />}
            action={
              <Link to="/notices" className="text-xs font-bold text-brand hover:underline">
                All
              </Link>
            }
          >
            {(pinnedNotices.length ? pinnedNotices : (notices.data ?? [])).slice(0, 4).map((notice) => (
              <Link
                key={notice.id}
                to="/notices"
                className="block rounded-xl border border-border p-3 transition hover:border-brand/30"
              >
                <div className="flex items-start gap-2">
                  {notice.priority !== 'normal' && (
                    <Badge tone={notice.priority === 'urgent' ? 'danger' : 'warn'}>
                      {notice.priority}
                    </Badge>
                  )}
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{notice.title}</p>
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] text-muted">{notice.body}</p>
                <p className="mt-1 text-[10px] text-muted">{relativeTime(notice.createdAt)}</p>
              </Link>
            ))}
            {(pinnedNotices.length || notices.data?.length) === 0 && (
              <EmptyState compact title="No notices" description="You're all caught up." />
            )}
          </SectionCard>
        </aside>
      </div>
    </div>
  )
}
