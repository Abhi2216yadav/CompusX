import { useMemo, useState } from 'react'
import { Filter, Info, Layers, Medal, RefreshCw, ShieldAlert, Trophy, Users } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import { useAuth } from '@/context/AuthContext'
import { PERIOD_OPTIONS } from '@/services/ranking'
import type { LeaderboardEntry, LeaderboardPeriod, LeaderboardSnapshot } from '@/services/types'
import { getSnapshot } from '@/services/leaderboard'
import { useAsync } from '@/hooks/useCollection'
import { useSchoolData, classOptions, sectionsFor, subjectOptions } from '@/hooks/useSchoolData'
import { LeaderboardMiniCard, LeaderboardTable, MyRankCard } from '@/components/leaderboard/LeaderboardViews'
import { PageHeader, SectionCard } from '@/components/ui/Card'
import { Avatar, Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Input'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Feedback'
import { cn } from '@/utils/cn'

interface LoaderResult {
  snapshot: LeaderboardSnapshot | null
  mine: LeaderboardEntry | null
  myRank: number | null
  totalStudents: number
  isPublic: boolean
  pointsToNext: number
  nextRank?: number
  nextStudentName?: string
}

export default function Leaderboard() {
  const { profile, school, role } = useAuth()
  const { classes, subjects, loading: metaLoading } = useSchoolData(profile?.schoolId)
  const [params, setParams] = useSearchParams()

  const period = (params.get('period') as LeaderboardPeriod) || 'weekly'
  const classId = params.get('class') || 'all'
  const section = params.get('section') || 'all'
  const subjectId = params.get('subject') || 'all'
  const [showFilters, setShowFilters] = useState(false)

  const filters = useMemo(
    () => ({
      period,
      academicYear: profile?.academicYear ?? school?.currentAcademicYear ?? '2026-27',
      classId,
      section,
      subjectId,
    }),
    [period, profile?.academicYear, school?.currentAcademicYear, classId, section, subjectId]
  )

  const loader = useAsync<LoaderResult | null>(async () => {
    if (!profile) return null
    const { getMyRank } = await import('@/services/leaderboard')
    const [snapshot, mine] = await Promise.all([
      getSnapshot(profile.schoolId, filters),
      profile.role === 'student' ? getMyRank(profile.schoolId, profile.id, filters) : Promise.resolve(null),
    ])
    return {
      snapshot,
      mine: mine?.entries.find((e) => e.studentId === profile.id) ?? null,
      myRank: mine?.rank ?? null,
      totalStudents: snapshot?.totalStudents ?? mine?.totalStudents ?? 0,
      isPublic: mine?.isPublic ?? true,
      pointsToNext: mine?.pointsToNext ?? 0,
      nextRank: mine?.nextRank,
      nextStudentName: mine?.nextStudentName,
    }
  }, [profile?.id, filters.period, filters.classId, filters.section, filters.subjectId, filters.academicYear])

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value === 'all' || !value) next.delete(key)
    else next.set(key, value)
    if (key === 'class') next.delete('section')
    setParams(next, { replace: true })
  }

  const entries = loader.data?.snapshot?.entries ?? []
  const isStudent = role === 'student'
  const isPublic = loader.data?.isPublic ?? true

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Student Leaderboard"
        description="Ranked by performance, consistency and contributions — never by attendance."
        action={
          <>
            <Button
              variant="secondary"
              icon={<Filter className="size-4" />}
              onClick={() => setShowFilters((v) => !v)}
            >
              Filters
            </Button>
            <Button
              variant="ghost"
              icon={<RefreshCw className={cn('size-4', loader.loading && 'animate-spin')} />}
              onClick={loader.reload}
              aria-label="Refresh leaderboard"
            >
              Refresh
            </Button>
          </>
        }
      />

      {!isPublic && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-ink-2">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
          <p>
            <span className="font-semibold">Private board.</span> Your school has hidden student names. You can
            still see your own rank and score.
          </p>
        </div>
      )}

      {/* Period tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setParam('period', option.value)}
            className={cn(
              'rounded-xl px-3.5 py-2 text-sm font-semibold transition',
              period === option.value
                ? 'bg-brand text-white shadow-sm'
                : 'bg-surface text-ink-2 border border-border hover:bg-surface-2'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      {showFilters && (
        <SectionCard className="mb-4" title="Filter the board">
          <div className="grid gap-3 sm:grid-cols-3">
            <Select
              label="Class"
              value={classId}
              onChange={(e) => setParam('class', e.target.value)}
              options={classOptions(classes)}
            />
            <Select
              label="Section"
              value={section}
              onChange={(e) => setParam('section', e.target.value)}
              options={[
                { value: 'all', label: 'All sections' },
                ...sectionsFor(classes, classId).map((s) => ({ value: s, label: `Section ${s}` })),
              ]}
            />
            <Select
              label="Subject focus"
              value={subjectId}
              onChange={(e) => setParam('subject', e.target.value)}
              options={subjectOptions(subjects)}
              hint="Narrows the board to that subject's attempts."
            />
          </div>
        </SectionCard>
      )}

      {loader.loading || metaLoading ? (
        <LoadingState label="Calculating ranks…" rows={6} />
      ) : loader.error ? (
        <ErrorState message={loader.error.message} onRetry={loader.reload} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <Podium entries={entries} isPublic={isPublic} />

            {entries.length === 0 ? (
              <EmptyState
                icon={<Trophy className="size-6" />}
                title="No ranks yet"
                description="Nobody has met the minimum attempt requirement for this filter. Try a wider filter or complete a test."
                action={
                  <Button variant="secondary" onClick={loader.reload}>
                    Recalculate
                  </Button>
                }
              />
            ) : (
              <>
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-sm font-bold text-ink">
                    Full Standings
                    <span className="ml-2 text-xs font-medium text-muted">
                      showing {entries.length} of {loader.data?.totalStudents ?? entries.length}
                    </span>
                  </h2>
                  <Badge tone="neutral">
                    <Users className="size-3" />
                    {loader.data?.totalStudents ?? 0} ranked
                  </Badge>
                </div>
                <LeaderboardTable
                  entries={entries}
                  currentUserId={profile?.id}
                  anonymised={!isPublic}
                />
              </>
            )}
          </div>

          <aside className="space-y-4">
            {isStudent && loader.data?.myRank ? (
              <MyRankCard
                rank={loader.data.myRank}
                totalStudents={loader.data.totalStudents}
                score={loader.data.mine?.overallScore ?? 0}
                progress={loader.data.mine?.progressPercentage ?? 0}
                pointsToNext={loader.data.pointsToNext}
                nextRank={loader.data.nextRank}
                nextStudentName={loader.data.nextStudentName}
                isPublic={isPublic}
              />
            ) : (
              <LeaderboardMiniCard entries={entries} isPublic={isPublic} />
            )}

            <SectionCard title="How ranking works" icon={<Info className="size-4" />}>
              <ol className="space-y-2.5 text-xs leading-relaxed text-muted">
                <li>
                  <span className="font-semibold text-ink-2">Quiz average (30%)</span> — your mean score across
                  every quiz in the period.
                </li>
                <li>
                  <span className="font-semibold text-ink-2">PYQ accuracy (22%)</span> — board-paper questions
                  count more than practice ones.
                </li>
                <li>
                  <span className="font-semibold text-ink-2">Mock tests (32%)</span> — the strongest single
                  signal, weighted highest.
                </li>
                <li>
                  <span className="font-semibold text-ink-2">Consistency (10%)</span> — rewards steady scores
                  rather than one lucky attempt.
                </li>
                <li>
                  <span className="font-semibold text-ink-2">Contributions (10%)</span> — helping peers, sharing
                  notes and moderating.
                </li>
              </ol>
              <p className="mt-3 border-t border-border pt-3 text-[11px] text-muted">
                Attendance is tracked for parents and teachers but is <span className="font-semibold">never</span>{' '}
                part of the leaderboard score, so no student is penalised for an authorised absence.
              </p>
            </SectionCard>
          </aside>
        </div>
      )}
    </div>
  )
}

/* ── Podium ─────────────────────────────────────────────────────────────── */

const PODIUM_ORDER = [1, 0, 2]
const PODIUM_STYLE = [
  { ring: 'ring-gold/40', bg: 'bg-warn-soft', height: 'h-24', size: 'size-14', label: '2nd' },
  { ring: 'ring-gold/60', bg: 'bg-warn-soft', height: 'h-32', size: 'size-16', label: '1st' },
  { ring: 'ring-amber/30', bg: 'bg-surface-2', height: 'h-20', size: 'size-13', label: '3rd' },
]

function Podium({ entries, isPublic }: { entries: LeaderboardEntry[]; isPublic: boolean }) {
  const top3 = entries.slice(0, 3)
  if (top3.length < 3) return null

  return (
    <div className="bg-surface border border-border flex items-end justify-center gap-2 rounded-2xl border p-4 shadow-sm sm:gap-4">
      {PODIUM_ORDER.map((index) => {
        const entry = top3[index]
        const style = PODIUM_STYLE[index]
        const Icon = index === 0 ? Trophy : index === 1 ? Medal : Layers
        return (
          <div key={entry.studentId} className="flex flex-1 flex-col items-center">
            <div className="relative">
              <span
                className={cn(
                  'absolute -top-2 -right-2 z-10 grid size-6 place-items-center rounded-full text-white',
                  index === 0 ? 'bg-gold' : 'bg-muted'
                )}
              >
                <Icon className="size-3" />
              </span>
              <Avatar
                name={entry.studentName}
                src={entry.photoUrl}
                size={index === 0 ? 64 : 56}
                className={cn(style.ring, 'ring-4')}
              />
            </div>
            <p className="mt-2 max-w-full truncate text-xs font-bold text-ink sm:text-sm">
              {isPublic ? entry.studentName.split(' ')[0] : `Student #${entry.rank}`}
            </p>
            <p className="tabular text-[11px] text-muted">{entry.classLabel}</p>
            <p className="tabular mt-0.5 text-sm font-extrabold text-brand">
              {entry.overallScore.toFixed(1)}%
            </p>
            <div
              className={cn(
                'mt-2 flex w-full max-w-[110px] items-start justify-center rounded-t-xl pt-2',
                style.bg,
                style.height
              )}
            >
              <span className="text-xs font-black text-ink-2/60">{entry.rank}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}