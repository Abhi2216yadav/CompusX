import { useParams, useSearchParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Medal,
  TrendingDown,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useAuth } from '@/context/AuthContext'
import { getStudentProgress } from '@/services/leaderboard'
import { reputationLevel } from '@/services/ranking'
import { leaderboardFiltersFor } from '@/services/attempts'
import type { LeaderboardPeriod, StudentProgressDetail } from '@/services/types'
import { useAsync } from '@/hooks/useCollection'
import { BandBadge } from '@/components/leaderboard/LeaderboardViews'
import { SectionCard, StatTile } from '@/components/ui/Card'
import { Avatar, Badge, RankBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState, LoadingState, MasteryBar, Progress } from '@/components/ui/Feedback'
import { PERIOD_OPTIONS } from '@/services/ranking'
import { formatDate } from '@/utils/date'

export default function StudentProgress() {
  const { studentId = '' } = useParams()
  const { profile, role } = useAuth()
  const [params, setParams] = useSearchParams()
  const period = (params.get('period') as LeaderboardPeriod) || 'overall'
  const isSelf = studentId === profile?.id

  const loader = useAsync<StudentProgressDetail | null>(() => {
    if (!profile || !studentId) return Promise.resolve(null)
    return getStudentProgress(profile.schoolId, studentId, {
      ...leaderboardFiltersFor(period),
      academicYear: profile.academicYear,
    })
  }, [studentId, period, profile?.id])

  const detail = loader.data
  const subjectChart = detail?.subjectBreakdown ?? []
  const timeline = detail?.timeline ?? []

  return (
    <div className="mx-auto w-full max-w-5xl">
      <Link
        to="/leaderboard"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-brand"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Back to leaderboard
      </Link>

      {loader.loading ? (
        <LoadingState label="Loading progress…" rows={6} />
      ) : loader.error ? (
        <ErrorState message={loader.error.message} onRetry={loader.reload} />
      ) : !detail ? (
        <EmptyState
          icon={<HelpCircle className="size-6" />}
          title="No progress data yet"
          description="This student has not completed any test in the selected period."
          action={
            <Button
              variant="secondary"
              onClick={() => setParams({ period: 'overall' }, { replace: true })}
            >
              Show all-time
            </Button>
          }
        />
      ) : (
        <>
          {/* Header card */}
          <div className="bg-surface border-border mb-4 overflow-hidden rounded-2xl border shadow-sm">
            <div className="flex flex-col gap-4 bg-gradient-to-br from-brand to-accent px-5 py-6 text-white sm:flex-row sm:items-center">
              <Avatar
                name={detail.student.studentName}
                src={detail.student.photoUrl}
                size={72}
                className="ring-4 ring-white/25"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-extrabold sm:text-2xl">{detail.student.studentName}</h1>
                  {isSelf && <Badge tone="accent">You</Badge>}
                  {role !== 'student' && <Badge tone="gold">{detail.student.classLabel}</Badge>}
                </div>
                <p className="mt-1 text-sm text-white/80">
                  Class {detail.student.classLabel} · {detail.student.testsAttempted} tests ·{' '}
                  {detail.student.questionsCorrect}/{detail.student.questionsAttempted} questions correct
                </p>
              </div>
              <div className="shrink-0 text-left sm:text-right">
                <div className="flex items-center gap-2 sm:justify-end">
                  <RankBadge rank={detail.rank} />
                  <span className="text-xs font-semibold text-white/80">
                    of {detail.totalStudents}
                  </span>
                </div>
                <p className="tabular mt-1 text-3xl font-black">{detail.student.overallScore.toFixed(1)}%</p>
                <div className="mt-1 sm:flex sm:justify-end">
                  <BandBadge band={detail.student.band} />
                </div>
              </div>
            </div>

            {/* Period switch */}
            <div className="flex gap-1.5 px-4 py-3">
              {PERIOD_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setParams({ period: o.value }, { replace: true })}
                  className={
                    period === o.value
                      ? 'rounded-lg bg-brand-soft px-3 py-1.5 text-xs font-bold text-brand'
                      : 'rounded-lg px-3 py-1.5 text-xs font-semibold text-muted transition hover:bg-surface-2'
                  }
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Headline stats */}
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label="Quiz average"
              value={`${detail.student.quizAverage.toFixed(1)}%`}
              icon={<BookOpen className="size-4" />}
              tone="brand"
            />
            <StatTile
              label="PYQ accuracy"
              value={`${detail.student.pyqAccuracy.toFixed(1)}%`}
              icon={<Award className="size-4" />}
              tone="gold"
            />
            <StatTile
              label="Mock average"
              value={`${detail.student.mockTestAverage.toFixed(1)}%`}
              icon={<Trophy className="size-4" />}
              tone="success"
            />
            <StatTile
              label="Consistency"
              value={`${detail.student.consistency.toFixed(0)}`}
              hint="score stability"
              icon={<Zap className="size-4" />}
              tone="info"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Progress over time */}
            <SectionCard
              title="Progress over time"
              subtitle="Weekly average score"
              icon={<TrendingUp className="size-4" />}
            >
              {timeline.length === 0 ? (
                <EmptyState compact title="Not enough history" description="Complete more tests to see a trend." />
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timeline} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--cx-border)" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: 'var(--cx-muted)' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 10, fill: 'var(--cx-muted)' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--cx-surface)',
                          border: '1px solid var(--cx-border)',
                          borderRadius: 10,
                          fontSize: 12,
                        }}
                        formatter={(value, name) => [
                          `${Number(value).toFixed(1)}%`,
                          name === 'percentage' ? 'Average' : 'Tests',
                        ]}
                      />
                      <ReferenceLine y={50} stroke="var(--cx-muted)" strokeDasharray="4 4" />
                      <Line
                        type="monotone"
                        dataKey="percentage"
                        stroke="var(--cx-brand)"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: 'var(--cx-brand)' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </SectionCard>

            {/* Subject mastery */}
            <SectionCard title="Subject mastery" icon={<Medal className="size-4" />}>
              {subjectChart.length === 0 ? (
                <EmptyState compact title="No subject data" />
              ) : (
                <>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={subjectChart} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--cx-border)" vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: 'var(--cx-muted)' }}
                          axisLine={false}
                          tickLine={false}
                          interval={0}
                          angle={-15}
                          textAnchor="end"
                          height={50}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fontSize: 10, fill: 'var(--cx-muted)' }}
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
                          formatter={(v) => [`${Number(v).toFixed(1)}%`, 'Mastery']}
                        />
                        <Bar dataKey="percentage" radius={[6, 6, 0, 0]}>
                          {subjectChart.map((s) => (
                            <Cell key={s.subjectId} fill={s.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {subjectChart.slice(0, 5).map((s) => (
                      <li key={s.subjectId}>
                        <MasteryBar label={s.name} value={s.percentage} color={s.color} />
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </SectionCard>

            {/* Weak chapters */}
            <SectionCard title="Needs practice" subtitle="Lowest accuracy chapters" icon={<TrendingDown className="size-4" />}>
              {detail.chapterWeak.length === 0 ? (
                <EmptyState compact title="Nothing weak" description="Every chapter is above 65% accuracy." />
              ) : (
                <ul className="space-y-3">
                  {detail.chapterWeak.map((c) => (
                    <li key={c.chapterId}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-ink">{c.name}</span>
                        <span className="tabular shrink-0 text-xs font-bold text-danger">
                          {c.percentage.toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-[11px] text-muted">{c.subjectName}</p>
                      <Progress value={c.percentage} size="sm" tone="danger" className="mt-1" />
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            {/* Strong chapters */}
            <SectionCard title="Strong chapters" subtitle="Highest accuracy" icon={<CheckCircle2 className="size-4" />}>
              {detail.chapterStrong.length === 0 ? (
                <EmptyState compact title="Keep going" description="Complete a few more tests." />
              ) : (
                <ul className="space-y-3">
                  {detail.chapterStrong.map((c) => (
                    <li key={c.chapterId}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-ink">{c.name}</span>
                        <span className="tabular shrink-0 text-xs font-bold text-success">
                          {c.percentage.toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-[11px] text-muted">{c.subjectName}</p>
                      <Progress value={c.percentage} size="sm" tone="success" className="mt-1" />
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>

          {/* Contributions + history */}
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <SectionCard title="Contribution points" subtitle="Helping the school community">
              <p className="tabular text-3xl font-extrabold text-ink">
                {detail.student.contributionPoints}
                <span className="ml-1.5 text-sm font-semibold text-muted">pts</span>
              </p>
              <p className="mt-1 text-xs text-muted">
                Reputation:{' '}
                <span className="font-bold text-brand">
                  {reputationLevel(detail.student.contributionPoints)}
                </span>
              </p>
              {detail.contributionBreakdown.length > 0 && (
                <ul className="mt-3 space-y-2 border-t border-border pt-3">
                  {detail.contributionBreakdown.map((c) => (
                    <li key={c.kind} className="flex items-center justify-between text-sm">
                      <span className="text-ink-2">{c.label}</span>
                      <span className="tabular font-bold text-brand">+{c.points}</span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="Recent tests" subtitle="Last 12 submissions">
              {detail.quizHistory.length === 0 ? (
                <EmptyState compact title="No tests yet" />
              ) : (
                <ul className="divide-y divide-border">
                  {detail.quizHistory.map((h) => (
                    <li key={h.id} className="flex items-center gap-3 py-2.5">
                      <span
                        className={
                          h.percentage >= 75
                            ? 'tabular grid size-10 shrink-0 place-items-center rounded-xl bg-success-soft text-xs font-extrabold text-success'
                            : h.percentage >= 50
                              ? 'tabular grid size-10 shrink-0 place-items-center rounded-xl bg-warn-soft text-xs font-extrabold text-warn'
                              : 'tabular grid size-10 shrink-0 place-items-center rounded-xl bg-danger-soft text-xs font-extrabold text-danger'
                        }
                      >
                        {h.percentage.toFixed(0)}%
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{h.title}</p>
                        <p className="text-[11px] text-muted">
                          {h.subjectName} · {formatDate(h.date)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>
        </>
      )}
    </div>
  )
}