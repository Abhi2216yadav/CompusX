import { useMemo, useState } from 'react'
import { BarChart3, Target, Users, Award, ClipboardList, MessageSquare } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { COLLECTIONS } from '@/services/db'
import type {
  AttemptKind,
  Contribution,
  ContributionKind,
  Material,
  Notice,
  TestAttempt,
  UserProfile,
} from '@/services/types'
import { useCollection } from '@/hooks/useCollection'
import { classOptions, useSchoolData, useStudentRoster } from '@/hooks/useSchoolData'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageHeader, SectionCard, StatTile } from '@/components/ui/Card'
import { Avatar, Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Input'
import { LoadingState, MasteryBar, Progress } from '@/components/ui/Feedback'
import { toMillis } from '@/utils/date'
import { round1 } from '@/utils/format'

const PERIOD_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'year', label: 'This academic year' },
]

const CONTRIBUTION_LABELS: Record<ContributionKind, string> = {
  material: 'Study material',
  peerHelp: 'Helping classmates',
  quiz: 'Quiz practice',
  pyq: 'PYQ practice',
  mock: 'Mock tests',
  event: 'School events',
  club: 'Club activities',
  moderation: 'Moderation help',
}

interface SubjectRow {
  subjectId: string
  subjectName: string
  color: string
  attempts: number
  avg: number
}

interface StudentRow {
  rank: number
  studentId: string
  name: string
  photoUrl?: string
  classLabel: string
  average: number
  tests: number
}

interface ContributorRow {
  rank: number
  name: string
  points: number
  kinds: number
}

const startOfAcademicYear = (): number => {
  const now = new Date()
  const year = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1
  return new Date(year, 5, 1).getTime()
}

export default function AdminReports() {
  const { profile } = useAuth()
  const schoolId = profile?.schoolId ?? ''
  const { classes, subjectById, loading: metaLoading } = useSchoolData(schoolId)

  const [classFilter, setClassFilter] = useState<string>('all')
  const [period, setPeriod] = useState<string>('all')

  const attempts = useCollection<TestAttempt>(
    COLLECTIONS.testAttempts,
    { where: [{ field: 'schoolId', op: '==', value: schoolId }] },
    [schoolId]
  )
  const contributions = useCollection<Contribution>(
    COLLECTIONS.contributions,
    { where: [{ field: 'schoolId', op: '==', value: schoolId }] },
    [schoolId]
  )
  const people = useCollection<UserProfile>(
    COLLECTIONS.users,
    { where: [{ field: 'schoolId', op: '==', value: schoolId }] },
    [schoolId]
  )
  const materials = useCollection<Material>(
    COLLECTIONS.materials,
    { where: [{ field: 'schoolId', op: '==', value: schoolId }] },
    [schoolId]
  )
  const notices = useCollection<Notice>(
    COLLECTIONS.notices,
    { where: [{ field: 'schoolId', op: '==', value: schoolId }] },
    [schoolId]
  )
  const roster = useStudentRoster(schoolId, classFilter)

  const analytics = useMemo(() => {
    const now = Date.now()
    const from =
      period === '30d'
        ? now - 30 * 86_400_000
        : period === '90d'
          ? now - 90 * 86_400_000
          : period === 'year'
            ? startOfAcademicYear()
            : 0

    const classIds = new Set(classes.filter((c) => classFilter === 'all' || c.id === classFilter).map((c) => c.id))

    const scoped = attempts.data.filter((a) => {
      if (classFilter !== 'all' && !classIds.has(a.classId)) return false
      const at = toMillis(a.submittedAt) || toMillis(a.startedAt)
      return from === 0 ? true : at >= from
    })

    const studentsAttempted = new Set(scoped.map((a) => a.studentId))
    const totalPercentage = scoped.reduce((sum, a) => sum + (a.percentage ?? 0), 0)
    const passed = scoped.filter((a) => (a.percentage ?? 0) >= 40).length
    const questionsAttempted = scoped.reduce((s, a) => s + (a.totalQuestions ?? 0), 0)
    const questionsCorrect = scoped.reduce((s, a) => s + (a.correctCount ?? 0), 0)

    const subjectMap = new Map<string, { sum: number; count: number }>()
    for (const a of scoped) {
      const key = a.subjectId || 'unknown'
      const current = subjectMap.get(key) ?? { sum: 0, count: 0 }
      current.sum += a.percentage ?? 0
      current.count += 1
      subjectMap.set(key, current)
    }

    const subjectRows: SubjectRow[] = [...subjectMap.entries()]
      .map(([subjectId, v]) => ({
        subjectId,
        subjectName: subjectById.get(subjectId)?.name ?? (subjectId === 'unknown' ? 'Unassigned' : subjectId),
        color: subjectById.get(subjectId)?.color ?? 'var(--cx-brand)',
        attempts: v.count,
        avg: v.count ? round1(v.sum / v.count) : 0,
      }))
      .sort((a, b) => b.avg - a.avg)

    const studentMap = new Map<string, { name: string; photoUrl?: string; classLabel: string; sum: number; count: number }>()
    for (const a of scoped) {
      const current = studentMap.get(a.studentId) ?? {
        name: a.studentName,
        photoUrl: undefined,
        classLabel: `Class ${a.classLevel}-${a.section || '—'}`,
        sum: 0,
        count: 0,
      }
      current.sum += a.percentage ?? 0
      current.count += 1
      studentMap.set(a.studentId, current)
    }

    const studentRows: StudentRow[] = [...studentMap.entries()]
      .map(([studentId, v]) => ({
        rank: 0,
        studentId,
        name: v.name,
        photoUrl: v.photoUrl,
        classLabel: v.classLabel,
        average: v.count ? round1(v.sum / v.count) : 0,
        tests: v.count,
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 10)
      .map((row, i) => ({ ...row, rank: i + 1 }))

    const kinds: Record<AttemptKind, number> = { quiz: 0, pyq: 0, mock: 0 }
    for (const a of scoped) {
      if (a.kind === 'quiz' || a.kind === 'pyq' || a.kind === 'mock') kinds[a.kind] += 1
    }

    const fromApplied = from === 0 ? 0 : from
    const scopedContributions = contributions.data.filter(
      (c) => fromApplied === 0 || toMillis(c.createdAt) >= fromApplied
    )
    const contribMap = new Map<ContributionKind, { count: number; points: number }>()
    for (const c of scopedContributions) {
      const current = contribMap.get(c.kind) ?? { count: 0, points: 0 }
      current.count += 1
      current.points += c.points ?? 0
      contribMap.set(c.kind, current)
    }
    const contribRows = [...contribMap.entries()].map(([kind, v]) => ({ kind, ...v }))
    const totalPoints = contribRows.reduce((s, r) => s + r.points, 0)

    const contributorMap = new Map<string, { name: string; points: number; kinds: Set<ContributionKind> }>()
    for (const c of scopedContributions) {
      const current = contributorMap.get(c.studentId) ?? { name: c.studentName, points: 0, kinds: new Set<ContributionKind>() }
      current.points += c.points ?? 0
      current.kinds.add(c.kind)
      contributorMap.set(c.studentId, current)
    }
    const contributorRows: ContributorRow[] = [...contributorMap.entries()]
      .map(([studentId, v]) => ({
        rank: 0,
        name: v.name,
        points: v.points,
        kinds: v.kinds.size,
        studentId,
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 10)
      .map((row, i) => ({ rank: i + 1, name: row.name, points: row.points, kinds: row.kinds }))

    const activeStudents = people.data.filter((p) => p.role === 'student' && p.isActive).length

    return {
      attemptCount: scoped.length,
      avgPercentage: scoped.length ? round1(totalPercentage / scoped.length) : 0,
      passRate: scoped.length ? round1((passed / scoped.length) * 100) : 0,
      distinctStudents: studentsAttempted.size,
      totalQuestions: questionsAttempted,
      accuracy: questionsAttempted ? round1((questionsCorrect / questionsAttempted) * 100) : 0,
      subjectRows,
      studentRows,
      kinds,
      contribRows,
      totalPoints,
      contributorRows,
      activeStudents,
      materialsCount: materials.data.length,
      noticesCount: notices.data.length,
    }
  }, [attempts.data, contributions.data, people.data, materials.data.length, notices.data.length, classFilter, period, classes, subjectById])

  const kindTotal = analytics.kinds.quiz + analytics.kinds.pyq + analytics.kinds.mock

  const subjectColumns: Column<SubjectRow>[] = [
    {
      key: 'subject',
      header: 'Subject',
      cell: (row) => <MasteryBar label={row.subjectName} value={row.avg} color={row.color} />,
    },
    {
      key: 'attempts',
      header: 'Attempts',
      align: 'right',
      hideBelow: 'sm',
      cell: (row) => <span className="tabular text-xs text-ink-2">{row.attempts}</span>,
    },
    {
      key: 'avg',
      header: 'Average',
      align: 'right',
      hideBelow: 'md',
      cell: (row) => (
        <span className="tabular text-sm font-semibold text-ink">{row.avg}%</span>
      ),
    },
  ]

  const studentColumns: Column<StudentRow>[] = [
    {
      key: 'rank',
      header: '#',
      align: 'right',
      cell: (row) => <span className="tabular text-xs font-bold text-muted">{row.rank}</span>,
    },
    {
      key: 'student',
      header: 'Student',
      cell: (row) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar name={row.name} src={row.photoUrl} size={28} />
          <span className="truncate text-sm font-semibold text-ink">{row.name}</span>
        </div>
      ),
    },
    {
      key: 'class',
      header: 'Class',
      hideBelow: 'md',
      cell: (row) => <span className="text-xs text-muted">{row.classLabel}</span>,
    },
    {
      key: 'average',
      header: 'Average',
      align: 'right',
      cell: (row) => <span className="tabular text-sm font-semibold text-ink">{row.average}%</span>,
    },
    {
      key: 'tests',
      header: 'Tests',
      align: 'right',
      hideBelow: 'sm',
      cell: (row) => <span className="tabular text-xs text-ink-2">{row.tests}</span>,
    },
  ]

  const contributorColumns: Column<ContributorRow>[] = [
    {
      key: 'rank',
      header: '#',
      align: 'right',
      cell: (row) => <span className="tabular text-xs font-bold text-muted">{row.rank}</span>,
    },
    {
      key: 'name',
      header: 'Student',
      cell: (row) => <span className="truncate text-sm font-semibold text-ink">{row.name}</span>,
    },
    {
      key: 'points',
      header: 'Points',
      align: 'right',
      cell: (row) => <span className="tabular text-sm font-bold text-brand">{row.points}</span>,
    },
    {
      key: 'kinds',
      header: 'Kinds',
      align: 'right',
      hideBelow: 'sm',
      cell: (row) => <span className="tabular text-xs text-ink-2">{row.kinds}</span>,
    },
  ]

  if (attempts.loading || metaLoading) return <LoadingState label="Crunching analytics…" rows={6} />

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Reports"
        description="Where the school is strong, where students slip and who is keeping the platform lively."
        action={<BarChart3 className="size-5 text-brand" aria-hidden />}
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Select
          label="Class"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          options={classOptions(classes)}
          className="h-9 w-auto min-w-32 text-xs font-semibold"
        />
        <Select
          label="Period"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          options={PERIOD_OPTIONS}
          className="h-9 w-auto min-w-32 text-xs font-semibold"
        />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Attempts" value={analytics.attemptCount} tone="brand" />
        <StatTile label="Average score" value={`${analytics.avgPercentage}%`} tone="info" />
        <StatTile label="Students attempted" value={analytics.distinctStudents} tone="gold" />
        <StatTile label="Questions" value={analytics.totalQuestions} tone="info" icon={<ClipboardList className="size-4" />} />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Pass rate" value={`${analytics.passRate}%`} tone="success" hint="40% or above" />
        <StatTile label="Accuracy" value={`${analytics.accuracy}%`} tone={analytics.accuracy >= 60 ? 'success' : 'warn'} />
        <StatTile label="Active students" value={analytics.activeStudents} tone="brand" icon={<Users className="size-4" />} />
        <StatTile label="Contributions" value={analytics.contribRows.reduce((s, r) => s + r.count, 0)} tone="gold" icon={<Award className="size-4" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Subject performance" subtitle="Average score per subject" icon={<Target className="size-4" />}>
          {analytics.subjectRows.length ? (
            <DataTable
              rows={analytics.subjectRows}
              columns={subjectColumns}
              rowKey={(r) => r.subjectId}
              caption="Sorted from strongest to weakest."
            />
          ) : (
            <p className="text-sm text-muted">No attempts in this window.</p>
          )}
        </SectionCard>

        <SectionCard title="Attempt mix" subtitle="How students are practising" icon={<BarChart3 className="size-4" />}>
          <div className="grid grid-cols-3 gap-3">
            <StatTile label="Quizzes" value={analytics.kinds.quiz} tone="brand" />
            <StatTile label="PYQs" value={analytics.kinds.pyq} tone="info" />
            <StatTile label="Mocks" value={analytics.kinds.mock} tone="gold" />
          </div>
          <div className="mt-4 space-y-2.5">
            {(['quiz', 'pyq', 'mock'] as const).map((k) => (
              <div key={k}>
                <div className="mb-1 flex items-center justify-between text-xs font-semibold">
                  <span className="text-ink-2">{k === 'pyq' ? 'PYQ' : k === 'mock' ? 'Mock tests' : 'Quizzes'}</span>
                  <span className="tabular text-muted">
                    {analytics.kinds[k]}
                    {kindTotal ? ` · ${Math.round((analytics.kinds[k] / kindTotal) * 100)}%` : ''}
                  </span>
                </div>
                <Progress
                  size="sm"
                  value={kindTotal ? (analytics.kinds[k] / kindTotal) * 100 : 0}
                  tone={k === 'quiz' ? 'brand' : k === 'pyq' ? 'info' : 'gold'}
                />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Top students" subtitle="Highest average score" icon={<Users className="size-4" />}>
          <DataTable
            rows={analytics.studentRows}
            columns={studentColumns}
            rowKey={(r) => r.studentId}
            empty={{ title: 'No attempts yet', description: 'Nothing to rank for this window.' }}
          />
        </SectionCard>

        <SectionCard
          title="Top contributors"
          subtitle={`${analytics.totalPoints} points awarded in this window`}
          icon={<MessageSquare className="size-4" />}
        >
          <DataTable
            rows={analytics.contributorRows}
            columns={contributorColumns}
            rowKey={(r) => `${r.rank}-${r.name}`}
            empty={{ title: 'No contributions yet', description: 'Sharing notes or helping peers will show up here.' }}
          />
        </SectionCard>

        <SectionCard title="Contributions by kind" subtitle="Counts and points" icon={<Award className="size-4" />}>
          {analytics.contribRows.length ? (
            <ul className="space-y-3">
              {analytics.contribRows.map((row) => (
                <li key={row.kind}>
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-ink">{CONTRIBUTION_LABELS[row.kind] ?? row.kind}</span>
                    <span className="tabular shrink-0 text-xs font-semibold text-muted">
                      {row.count} · {row.points} pts
                    </span>
                  </div>
                  <Progress
                    size="sm"
                    value={analytics.totalPoints ? (row.points / analytics.totalPoints) * 100 : 0}
                    tone="gold"
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No contributions recorded for this window.</p>
          )}
        </SectionCard>

        <SectionCard title="Platform engagement" subtitle="Content available to students" icon={<ClipboardList className="size-4" />}>
          <ul className="space-y-2.5">
            <li className="flex items-center justify-between rounded-xl bg-surface-2 px-3.5 py-2.5">
              <span className="text-sm text-ink-2">Active student accounts</span>
              <Badge tone="brand">{analytics.activeStudents}</Badge>
            </li>
            <li className="flex items-center justify-between rounded-xl bg-surface-2 px-3.5 py-2.5">
              <span className="text-sm text-ink-2">Materials in the library</span>
              <Badge tone="info">{analytics.materialsCount}</Badge>
            </li>
            <li className="flex items-center justify-between rounded-xl bg-surface-2 px-3.5 py-2.5">
              <span className="text-sm text-ink-2">Notices published</span>
              <Badge tone="success">{analytics.noticesCount}</Badge>
            </li>
            <li className="flex items-center justify-between rounded-xl bg-surface-2 px-3.5 py-2.5">
              <span className="text-sm text-ink-2">Students on the roster</span>
              <Badge tone="neutral">{roster.data.length}</Badge>
            </li>
          </ul>
        </SectionCard>
      </div>
    </div>
  )
}