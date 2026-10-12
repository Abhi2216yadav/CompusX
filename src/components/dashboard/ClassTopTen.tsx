import { Flame, Trophy, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'

import { COLLECTIONS } from '@/services/db'
import { db } from '@/services'
import { getLeaderboardSettings, passesFilters } from '@/services/leaderboard'
import { currentStreakWeeks, rankEntries, toEntry } from '@/services/ranking'
import type { LeaderboardEntry, LeaderboardFilters, StudentMetrics } from '@/services/types'
import { useAsync } from '@/hooks/useCollection'
import { BandBadge } from '@/components/leaderboard/LeaderboardViews'
import { Badge, RankBadge } from '@/components/ui/Badge'
import { SectionCard } from '@/components/ui/Card'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Feedback'
import { pluralize } from '@/utils/format'
import { cn } from '@/utils/cn'

/**
 * 🏆 Class Top 10 — read straight from `studentMetrics` (never writes), so a
 * student can view it even though the Firestore rules only allow admins to
 * write that collection. Ranking reuses the exact engine the snapshots use.
 */
export function ClassTopTen({
  schoolId,
  classId,
  academicYear,
  studentId,
  label,
}: {
  schoolId: string
  classId?: string
  academicYear: string
  studentId: string
  label: string
}) {
  const loader = useAsync(
    async () => {
      if (!classId) return null
      const [settings, rows] = await Promise.all([
        getLeaderboardSettings(schoolId),
        db.list<StudentMetrics>(COLLECTIONS.studentMetrics, {
          where: [
            { field: 'schoolId', op: '==', value: schoolId },
            { field: 'classId', op: '==', value: classId },
          ],
        }),
      ])

      const filters: LeaderboardFilters = {
        period: 'overall',
        academicYear,
        classId,
        section: 'all',
        subjectId: 'all',
      }
      const streaks = new Map<string, number>()
      const entries: LeaderboardEntry[] = []
      for (const metrics of rows) {
        if (!passesFilters(metrics, filters, settings.minAttempts)) continue
        const entry = toEntry({ metrics, includeIdentity: settings.publicRankings }, filters)
        if (!entry) continue
        entries.push(entry)
        streaks.set(metrics.studentId, currentStreakWeeks(metrics))
      }

      return {
        ranked: rankEntries(entries).slice(0, 10),
        streaks,
        isPublic: settings.publicRankings,
      }
    },
    [schoolId, classId, academicYear]
  )

  const ranked = loader.data?.ranked ?? []
  const isPublic = loader.data?.isPublic ?? true

  return (
    <SectionCard
      title="Class Top 10"
      subtitle={`${label} · ranked by overall score`}
      icon={<Trophy className="size-4" />}
      action={
        <Link to="/leaderboard" className="text-xs font-bold text-brand hover:underline">
          Full leaderboard
        </Link>
      }
    >
      {!classId ? (
        <EmptyState
          compact
          title="No class assigned"
          description="Ask your admin to place you in a class to see class rankings."
        />
      ) : loader.loading ? (
        <LoadingState label="Loading class rankings…" rows={5} />
      ) : loader.error ? (
        <ErrorState
          title="Could not load class rankings"
          message={loader.error.message}
          onRetry={loader.reload}
        />
      ) : ranked.length === 0 ? (
        <EmptyState
          compact
          icon={<Trophy className="size-5 text-gold" />}
          title="No class rankings yet"
          description="Rankings appear as soon as students in your class complete their first test."
        />
      ) : (
        <ol className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
          {ranked.map((entry) => {
            const isMe = entry.studentId === studentId
            const streak = loader.data?.streaks.get(entry.studentId) ?? 0
            return (
              <li key={entry.studentId}>
                <Link
                  to={`/leaderboard/student/${entry.studentId}`}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 transition hover:bg-surface-2',
                    isMe && 'bg-brand-soft/60'
                  )}
                >
                  <RankBadge rank={entry.rank} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-semibold text-ink">
                        {isPublic ? entry.studentName : `Student #${entry.rank}`}
                      </p>
                      {isMe && <Badge tone="brand">You</Badge>}
                    </div>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted">
                      <Flame
                        className={cn('size-3 shrink-0', streak > 0 ? 'text-warn' : 'text-muted')}
                        aria-hidden
                      />
                      {streak > 0 ? pluralize(streak, 'week') : 'no streak'}
                      <span aria-hidden>·</span>
                      <Zap className="size-3 shrink-0" aria-hidden />
                      {entry.activityPoints} XP
                    </p>
                  </div>
                  <BandBadge band={entry.band} />
                  <div className="shrink-0 text-right">
                    <p className="tabular text-sm font-extrabold text-ink">
                      {entry.overallScore.toFixed(1)}
                    </p>
                    <p className="text-[10px] text-muted">score</p>
                  </div>
                </Link>
              </li>
            )
          })}
        </ol>
      )}
    </SectionCard>
  )
}
