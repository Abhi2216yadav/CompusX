import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarRange, CheckCircle2, Target, TrendingUp, Trophy } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useAuth } from '@/context/AuthContext'
import { COLLECTIONS } from '@/services/db'
import type { TestAttempt } from '@/services/types'
import { useCollection, useAsync } from '@/hooks/useCollection'
import { useSchoolData } from '@/hooks/useSchoolData'
import { nextLevelInfo, reputationLevel } from '@/services/ranking'
import { PageHeader, SectionCard, StatTile } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Tabs } from '@/components/ui/Disclosure'
import { EmptyState, LoadingState, MasteryBar, Progress } from '@/components/ui/Feedback'
import { formatDate, toMillis } from '@/utils/date'
import { pct, round1 } from '@/utils/format'
import { getStudentProgress } from '@/services/leaderboard'
import { leaderboardFiltersFor } from '@/services/attempts'

type Kind = TestAttempt['kind']

const KIND_LABEL: Record<Kind, string> = {
  quiz: 'Quiz',
  pyq: 'PYQ practice',
  mock: 'Mock test',
}

const KIND_TONE: Record<Kind, 'brand' | 'info' | 'gold'> = {
  quiz: 'brand',
  pyq: 'info',
  mock: 'gold',
}

export default function Analytics() {
  const { profile } = useAuth()
  const { subjectById } = useSchoolData(profile?.schoolId)
  const [range, setRange] = useState<'30' | '90' | 'all'>('30')
  const [kind, setKind] = useState<'all' | Kind>('all')

  const attempts = useCollection<TestAttempt>(
    COLLECTIONS.testAttempts,
    {
      where: [
        { field: 'schoolId', op: '==', value: profile?.schoolId ?? '' },
        { field: 'studentId', op: '==', value: profile?.id ?? '' },
      ],
      orderBy: [{ field: 'submittedAt', dir: 'desc' }],
      limit: 200,
    },
    [profile?.schoolId, profile?.id]
  )

  const progress = useAsync(
    async () => getStudentProgress(profile?.schoolId ?? '', profile?.id ?? '', leaderboardFiltersFor('overall')),
    [profile?.schoolId, profile?.id]
  )

  const ranged = useMemo(() => {
    const rows = attempts.data.filter((a) => (kind === 'all' ? true : a.kind === kind))
    if (range === 'all') return rows
    const cutoff = Date.now() - (range === '30' ? 30 : 90) * 86_400_000
    return rows.filter((a) => toMillis(a.submittedAt) >= cutoff)
  }, [attempts.data, range, kind])

  const totals = useMemo(() => {
    const scored = ranged.filter((a) => a.totalMarks > 0)
    const weighted = scored.reduce((sum, a) => sum + a.percentage, 0)
    const questions = ranged.reduce((sum, a) => sum + a.totalQuestions, 0)
    const correct = ranged.reduce((sum, a) => sum + a.correctCount, 0)
    const timeSec = ranged.reduce((sum, a) => sum + (a.timeSpentSec ?? 0), 0)
    return {
      tests: ranged.length,
      average: scored.length ? round1(weighted / scored.length) : 0,
      accuracy: questions ? round1((correct / questions) * 100) : 0,
      timeSec,
      best: scored.length ? round1(Math.max(...scored.map((a) => a.percentage))) : 0,
    }
  }, [ranged])

  /** Percentage per day, oldest first, for the trend line. */
  const trend = useMemo(() => {
    const byDay = new Map<string, number[]>()
    for (const a of [...attempts.data].reverse()) {
      const day = formatDate(a.submittedAt)
      const list = byDay.get(day) ?? []
      list.push(a.percentage)
      byDay.set(day, list)
    }
    return [...byDay.entries()]
      .slice(-30)
      .map(([day, values]) => ({
        day,
        percentage: round1(values.reduce((s, v) => s + v, 0) / values.length),
      }))
  }, [attempts.data])

  /** Accuracy per subject across the whole history. */
  const bySubject = useMemo(() => {
    const map = new Map<string, { total: number; correct: number }>()
    for (const a of attempts.data) {
      if (!a.totalQuestions) continue
      const entry = map.get(a.subjectId) ?? { total: 0, correct: 0 }
      entry.total += a.totalQuestions
      entry.correct += a.correctCount
      map.set(a.subjectId, entry)
    }
    return [...map.entries()]
      .map(([subjectId, v]) => ({
        subject: subjectById.get(subjectId)?.name ?? 'General',
        accuracy: v.total ? round1((v.correct / v.total) * 100) : 0,
      }))
      .sort((a, b) => b.accuracy - a.accuracy)
  }, [attempts.data, subjectById])

  /** Quiz vs PYQ vs mock averages for comparison. */
  const byKind = useMemo(
    () =>
      (Object.keys(KIND_LABEL) as Kind[]).map((k) => {
        const rows = attempts.data.filter((a) => a.kind === k && a.totalMarks > 0)
        return {
          kind: k,
          label: KIND_LABEL[k],
          average: rows.length ? round1(rows.reduce((s, a) => s + a.percentage, 0) / rows.length) : 0,
          count: rows.length,
        }
      }),
    [attempts.data]
  )

  const contributionPoints = progress.data?.student.contributionPoints ?? 0
  const reputation = reputationLevel(contributionPoints)
  const next = nextLevelInfo(contributionPoints)

  if (attempts.loading) return <LoadingState label="Loading your results…" rows={5} />

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Results & analysis"
        description="Every attempt you have made, plus the trends behind your leaderboard score."
        action={
          <Tabs
            value={range}
            onChange={(v) => setRange(v as typeof range)}
            items={[
              { value: '30', label: '30 days' },
              { value: '90', label: '90 days' },
              { value: 'all', label: 'All time' },
            ]}
          />
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Tests" value={totals.tests} tone="brand" icon={<Target className="size-4" />} />
        <StatTile label="Average" value={pct(totals.average, 1)} tone="success" icon={<TrendingUp className="size-4" />} />
        <StatTile label="Accuracy" value={pct(totals.accuracy, 1)} tone="info" icon={<CheckCircle2 className="size-4" />} />
        <StatTile label="Best score" value={pct(totals.best, 1)} tone="gold" icon={<Trophy className="size-4" />} />
      </div>

      <div className="mb-4">
        <Tabs
          value={kind}
          onChange={(v) => setKind(v as typeof kind)}
          items={[
            { value: 'all', label: 'All tests' },
            { value: 'quiz', label: 'Quizzes' },
            { value: 'pyq', label: 'PYQ practice' },
            { value: 'mock', label: 'Mock tests' },
          ]}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Score trend" subtitle="Average percentage per day" icon={<TrendingUp className="size-4" />}>
          {trend.length < 2 ? (
            <EmptyState compact title="Not enough data" description="Take another test to see your trend." />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--cx-border)" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10, fill: 'var(--cx-muted)' }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--cx-border)' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: 'var(--cx-muted)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--cx-surface)',
                      border: '1px solid var(--cx-border)',
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Average']}
                  />
                  <ReferenceLine y={50} stroke="var(--cx-muted)" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="percentage" stroke="var(--cx-brand)" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Average by test type" subtitle="Where your score is strongest" icon={<Trophy className="size-4" />}>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byKind} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--cx-border)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: 'var(--cx-muted)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--cx-border)' }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: 'var(--cx-muted)' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'var(--cx-surface-2)' }}
                  contentStyle={{
                    background: 'var(--cx-surface)',
                    border: '1px solid var(--cx-border)',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Average']}
                />
                <ReferenceLine y={50} stroke="var(--cx-muted)" strokeDasharray="4 4" />
                <Bar dataKey="average" fill="var(--cx-brand)" radius={[8, 8, 0, 0]} maxBarSize={56} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SectionCard title="Subject accuracy" subtitle="All attempts, all time" icon={<Target className="size-4" />}>
          {bySubject.length === 0 ? (
            <EmptyState compact title="No subject data yet" />
          ) : (
            <div className="space-y-3.5">
              {bySubject.map((s) => (
                <MasteryBar key={s.subject} label={s.subject} value={s.accuracy} />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Time spent & consistency"
          subtitle="Your study rhythm over the selected range"
          icon={<CalendarRange className="size-4" />}
        >
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted">Time in tests</p>
              <p className="tabular mt-1 text-2xl font-extrabold text-ink">
                {Math.floor(totals.timeSec / 60)}m {totals.timeSec % 60}s
              </p>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted">
                Attempts in this range ({totals.tests} of {attempts.data.length} total)
              </p>
              <Progress
                value={attempts.data.length ? (totals.tests / attempts.data.length) * 100 : 0}
                tone={totals.tests >= 5 ? 'success' : 'brand'}
              />
            </div>
            {reputation && next && (
              <div className="rounded-xl bg-brand-soft p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-brand">{reputation}</span>
                  <Badge tone="brand">{contributionPoints} pts</Badge>
                </div>
                <Progress className="mt-2.5" value={next.progress} tone="brand" />
                <p className="mt-1.5 text-[11px] text-muted">
                  {next.next
                    ? `${next.pointsToNext} more ${next.pointsToNext === 1 ? 'point' : 'points'} to reach ${next.next}`
                    : 'Top reputation level reached'}
                </p>
              </div>
            )}
            <Link
              to="/leaderboard/me"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
            >
              See my full leaderboard report
            </Link>
          </div>
        </SectionCard>
      </div>

      <div className="mt-4">
        <SectionCard title="All attempts" subtitle={`${ranged.length} in this range`} flush>
          {ranged.length === 0 ? (
            <div className="p-5">
              <EmptyState
                compact
                title="No attempts in this range"
                description="Try a wider range, or take a quiz from the Quizzes page."
              />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {ranged.map((a) => (
                <li key={a.id}>
                  <Link
                    to={`${a.kind === 'mock' ? '/tests' : a.kind === 'pyq' ? '/pyq' : '/quiz'}/${
                      a.kind === 'mock' ? `${a.refId}/result/${a.id}` : a.kind === 'pyq' ? `/result/${a.id}` : `result/${a.id}`
                    }`}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2"
                  >
                    <Badge tone={KIND_TONE[a.kind]}>{KIND_LABEL[a.kind]}</Badge>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{a.refTitle}</p>
                      <p className="text-[11px] text-muted">
                        {a.correctCount}/{a.totalQuestions} correct · {formatDate(a.submittedAt)}
                        {a.autoSubmitted ? ' · auto-submitted' : ''}
                      </p>
                    </div>
                    <span
                      className={
                        a.percentage >= 70
                          ? 'tabular text-sm font-extrabold text-success'
                          : a.percentage >= 40
                            ? 'tabular text-sm font-extrabold text-warn'
                            : 'tabular text-sm font-extrabold text-danger'
                      }
                    >
                      {Math.round(a.percentage)}%
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  )
}