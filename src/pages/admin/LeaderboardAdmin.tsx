import { useMemo, useState } from 'react'
import { Trophy, RefreshCw, Users } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import type { LeaderboardEntry, LeaderboardFilters, LeaderboardPeriod } from '@/services/types'
import { getSnapshot, rebuildLeaderboard, rebuildAllLeaderboards } from '@/services/leaderboard'
import { PERIOD_OPTIONS, RANKING } from '@/services/ranking'
import { useAsync } from '@/hooks/useCollection'
import { classOptions, sectionsFor, subjectOptions, useSchoolData } from '@/hooks/useSchoolData'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageHeader, StatTile } from '@/components/ui/Card'
import { Avatar, Badge, RankBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Input'
import { ConfirmDialog } from '@/components/ui/Modal'
import { EmptyState, ErrorState, LoadingState, Progress } from '@/components/ui/Feedback'
import { formatDateTime } from '@/utils/date'
import { round1 } from '@/utils/format'

const BAND_TONE: Record<LeaderboardEntry['band'], 'brand' | 'success' | 'info' | 'warn'> = {
  chasing: 'brand',
  rising: 'success',
  steady: 'info',
  needsPractice: 'warn',
}

const BAND_LABEL: Record<LeaderboardEntry['band'], string> = {
  chasing: 'Chasing the top',
  rising: 'Rising fast',
  steady: 'Steady progress',
  needsPractice: 'Needs practice',
}

export default function LeaderboardAdmin() {
  const { profile, school } = useAuth()
  const schoolId = profile?.schoolId ?? ''
  const { classes, subjects, loading: metaLoading } = useSchoolData(schoolId)

  const [period, setPeriod] = useState<LeaderboardPeriod>('overall')
  const [classId, setClassId] = useState<string>('all')
  const [section, setSection] = useState<string>('all')
  const [subjectId, setSubjectId] = useState<string>('all')
  const [confirmRecompute, setConfirmRecompute] = useState(false)
  const [recomputing, setRecomputing] = useState(false)

  const filters: LeaderboardFilters = useMemo(
    () => ({
      period,
      academicYear: school?.currentAcademicYear ?? profile?.academicYear ?? '2026-27',
      classId,
      section,
      subjectId,
    }),
    [period, school?.currentAcademicYear, profile?.academicYear, classId, section, subjectId]
  )

  const filterKey = `${filters.period}|${filters.academicYear}|${filters.classId}|${filters.section}|${filters.subjectId}`

  const loader = useAsync(async () => getSnapshot(schoolId, filters), [schoolId, filterKey])

  const snapshot = loader.data ?? null
  const entries = useMemo(() => (snapshot?.entries ?? []).slice(0, 50), [snapshot])

  const stats = useMemo(() => {
    if (!entries.length) return { ranked: 0, average: 0, top: 0 }
    const sum = entries.reduce((s, e) => s + e.overallScore, 0)
    return {
      ranked: entries.length,
      average: round1(sum / entries.length),
      top: Math.max(...entries.map((e) => e.overallScore)),
    }
  }, [entries])

  const columns: Column<LeaderboardEntry>[] = [
    {
      key: 'rank',
      header: 'Rank',
      align: 'right',
      cell: (e) => <RankBadge rank={e.rank} />,
    },
    {
      key: 'student',
      header: 'Student',
      cell: (e) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar name={e.studentName} src={e.photoUrl} size={30} />
          <span className="truncate text-sm font-semibold text-ink">{e.studentName}</span>
        </div>
      ),
    },
    {
      key: 'class',
      header: 'Class',
      hideBelow: 'md',
      cell: (e) => <span className="text-xs text-ink-2">{e.classLabel}</span>,
    },
    {
      key: 'overall',
      header: 'Score',
      align: 'right',
      cell: (e) => <span className="tabular text-sm font-bold text-ink">{e.overallScore}%</span>,
    },
    {
      key: 'progress',
      header: 'Progress',
      hideBelow: 'lg',
      className: 'min-w-28',
      cell: (e) => <Progress value={e.progressPercentage} size="sm" tone={e.progressPercentage >= 70 ? 'success' : 'brand'} />,
    },
    {
      key: 'quiz',
      header: 'Quiz',
      align: 'right',
      hideBelow: 'lg',
      cell: (e) => <span className="tabular text-xs text-ink-2">{e.quizAverage}%</span>,
    },
    {
      key: 'pyq',
      header: 'PYQ',
      align: 'right',
      hideBelow: 'lg',
      cell: (e) => <span className="tabular text-xs text-ink-2">{e.pyqAccuracy}%</span>,
    },
    {
      key: 'mock',
      header: 'Mock',
      align: 'right',
      hideBelow: 'md',
      cell: (e) => <span className="tabular text-xs text-ink-2">{e.mockTestAverage}%</span>,
    },
    {
      key: 'tests',
      header: 'Tests',
      align: 'right',
      hideBelow: 'sm',
      cell: (e) => <span className="tabular text-xs text-ink-2">{e.testsAttempted}</span>,
    },
    {
      key: 'consistency',
      header: 'Consistency',
      align: 'right',
      hideBelow: 'lg',
      cell: (e) => <span className="tabular text-xs text-ink-2">{e.consistency}%</span>,
    },
    {
      key: 'contributions',
      header: 'Contrib.',
      align: 'right',
      hideBelow: 'lg',
      cell: (e) => <span className="tabular text-xs font-semibold text-brand">{e.contributionPoints}</span>,
    },
    {
      key: 'band',
      header: 'Band',
      cell: (e) => (
        <Badge tone={BAND_TONE[e.band]}>{BAND_LABEL[e.band]}</Badge>
      ),
    },
  ]

  async function recompute() {
    setRecomputing(true)
    try {
      await rebuildAllLeaderboards(
        schoolId,
        filters.academicYear,
        classes.map((c) => c.id),
        subjects.map((s) => s.id)
      )
      await rebuildLeaderboard(schoolId, filters, 'admin')
      loader.reload()
    } finally {
      setRecomputing(false)
      setConfirmRecompute(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Leaderboard administration"
        description="Ranks are stored, never recomputed on page load. Recalculate whenever a term's results land."
        action={
          <Button
            icon={<RefreshCw className="size-4" />}
            loading={recomputing}
            onClick={() => setConfirmRecompute(true)}
          >
            Recompute leaderboard
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Select
          label="Period"
          value={period}
          onChange={(e) => setPeriod(e.target.value as LeaderboardPeriod)}
          options={PERIOD_OPTIONS}
        />
        <Select
          label="Class"
          value={classId}
          onChange={(e) => {
            setClassId(e.target.value)
            setSection('all')
          }}
          options={classOptions(classes)}
        />
        <Select
          label="Section"
          value={section}
          onChange={(e) => setSection(e.target.value)}
          options={[
            { value: 'all', label: 'All sections' },
            ...sectionsFor(classes, classId).map((s) => ({ value: s, label: `Section ${s}` })),
          ]}
        />
        <Select
          label="Subject focus"
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          options={subjectOptions(subjects)}
          hint="Narrows the board to that subject's attempts."
        />
      </div>

      {loader.loading || metaLoading ? (
        <LoadingState label="Loading ranks…" rows={6} />
      ) : loader.error ? (
        <ErrorState message={loader.error.message} onRetry={loader.reload} />
      ) : !snapshot ? (
        <EmptyState
          icon={<Trophy className="size-6" />}
          title="No snapshot for these filters"
          description="Generate the ranked snapshot and students will see these standings straight away."
          action={
            <Button icon={<RefreshCw className="size-4" />} loading={recomputing} onClick={() => void recompute()}>
              Generate snapshot
            </Button>
          }
        />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-3">
            <StatTile label="Ranked students" value={stats.ranked} icon={<Users className="size-4" />} tone="brand" />
            <StatTile label="Avg overall score" value={`${stats.average}%`} tone="info" />
            <StatTile label="Top score" value={`${stats.top}%`} tone="gold" />
          </div>

          <DataTable
            rows={entries}
            columns={columns}
            rowKey={(e) => e.studentId}
            empty={{
              title: 'Nobody ranked yet',
              description: 'No student met the minimum attempt requirement for this filter combination.',
            }}
            caption={
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>
                  Generation {snapshot.generation} · generated by {snapshot.generatedBy}
                </span>
                <span className="text-muted">{formatDateTime(snapshot.generatedAt)}</span>
                <span className="text-muted">
                  {PERIOD_OPTIONS.find((p) => p.value === snapshot.period)?.label} · {snapshot.academicYear}
                </span>
                <span className="text-muted">top {RANKING.snapshotSize} materialised</span>
              </span>
            }
          />
        </>
      )}

      <ConfirmDialog
        open={confirmRecompute}
        title="Recompute every leaderboard scope?"
        message="This replays every stored attempt for all classes, subjects and periods. It can take a few seconds on a large school."
        confirmLabel="Recompute now"
        tone="primary"
        loading={recomputing}
        onCancel={() => setConfirmRecompute(false)}
        onConfirm={() => void recompute()}
      />
    </div>
  )
}