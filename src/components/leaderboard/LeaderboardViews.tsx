import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Flame,
  Minus,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import type { LeaderboardEntry } from '@/services/types'
import { Avatar, Badge, RankBadge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Feedback'
import { RANKING } from '@/services/ranking'
import { cn } from '@/utils/cn'

const BAND_STYLE = {
  chasing: { tone: 'gold', icon: Trophy, label: RANKING.bandLabels.chasing },
  rising: { tone: 'success', icon: TrendingUp, label: RANKING.bandLabels.rising },
  steady: { tone: 'info', icon: Minus, label: RANKING.bandLabels.steady },
  needsPractice: { tone: 'warn', icon: Target, label: RANKING.bandLabels.needsPractice },
} as const

export function BandBadge({ band }: { band: LeaderboardEntry['band'] }) {
  const style = BAND_STYLE[band]
  const Icon = style.icon
  return (
    <Badge tone={style.tone} icon={<Icon className="size-3" />}>
      {style.label}
    </Badge>
  )
}

/* ── Leaderboard table ──────────────────────────────────────────────────── */

export function LeaderboardTable({
  entries,
  currentUserId,
  anonymised,
}: {
  entries: LeaderboardEntry[]
  currentUserId?: string
  /** School disabled public rankings — names hidden. */
  anonymised?: boolean
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      {/* Desktop table */}
      <table className="hidden w-full md:table">
        <thead>
          <tr className="border-b border-border bg-surface-2 text-left">
            <th className="px-4 py-3 text-[11px] font-bold tracking-wide text-muted uppercase">Rank</th>
            <th className="px-4 py-3 text-[11px] font-bold tracking-wide text-muted uppercase">Student</th>
            <th className="px-4 py-3 text-[11px] font-bold tracking-wide text-muted uppercase">Class</th>
            <th className="px-4 py-3 text-right text-[11px] font-bold tracking-wide text-muted uppercase">Score</th>
            <th className="px-4 py-3 text-right text-[11px] font-bold tracking-wide text-muted uppercase">Progress</th>
            <th className="px-4 py-3 text-right text-[11px] font-bold tracking-wide text-muted uppercase">Tests</th>
            <th className="px-4 py-3 text-right text-[11px] font-bold tracking-wide text-muted uppercase">Points</th>
            <th className="px-4 py-3 text-[11px] font-bold tracking-wide text-muted uppercase">Trend</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const isMe = entry.studentId === currentUserId
            return (
              <tr
                key={entry.studentId}
                className={cn(
                  'border-b border-border/60 transition last:border-0 hover:bg-surface-2',
                  isMe && 'bg-brand-soft/60'
                )}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <RankBadge rank={entry.rank} />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Link
                    to={`/leaderboard/student/${entry.studentId}`}
                    className="flex items-center gap-2.5 hover:underline"
                  >
                    <Avatar name={entry.studentName} src={entry.photoUrl} size={32} />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold text-ink">
                          {anonymised ? `Student #${entry.rank}` : entry.studentName}
                        </span>
                        {isMe && <Badge tone="brand">You</Badge>}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="tabular px-4 py-3 text-sm text-muted">{entry.classLabel}</td>
                <td className="tabular px-4 py-3 text-right">
                  <span className="font-bold text-ink">{entry.overallScore.toFixed(1)}</span>
                  <span className="text-xs text-muted">%</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Progress value={entry.progressPercentage} size="sm" className="w-16" />
                    <span className="tabular w-9 text-right text-xs font-semibold text-muted">
                      {Math.round(entry.progressPercentage)}%
                    </span>
                  </div>
                </td>
                <td className="tabular px-4 py-3 text-right text-sm text-ink-2">{entry.testsAttempted}</td>
                <td className="tabular px-4 py-3 text-right text-sm text-ink-2">{entry.contributionPoints}</td>
                <td className="px-4 py-3">
                  <BandBadge band={entry.band} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Mobile cards */}
      <ul className="divide-y divide-border md:hidden">
        {entries.map((entry) => {
          const isMe = entry.studentId === currentUserId
          return (
            <li key={entry.studentId}>
              <Link
                to={`/leaderboard/student/${entry.studentId}`}
                className={cn('flex items-center gap-3 p-3.5 transition active:bg-surface-2', isMe && 'bg-brand-soft/60')}
              >
                <RankBadge rank={entry.rank} />
                <Avatar name={entry.studentName} src={entry.photoUrl} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {anonymised ? `Student #${entry.rank}` : entry.studentName}
                    {isMe && <span className="ml-1.5 text-xs font-bold text-brand">(you)</span>}
                  </p>
                  <p className="tabular text-[11px] text-muted">
                    {entry.classLabel} · {entry.testsAttempted} tests · {entry.contributionPoints} pts
                  </p>
                  <Progress value={entry.progressPercentage} size="sm" className="mt-1.5" />
                </div>
                <div className="shrink-0 text-right">
                  <p className="tabular text-base font-extrabold text-ink">{entry.overallScore.toFixed(1)}</p>
                  <p className="tabular text-[10px] text-muted">{Math.round(entry.progressPercentage)}%</p>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/* ── My rank card ───────────────────────────────────────────────────────── */

export function MyRankCard({
  rank,
  totalStudents,
  score,
  progress,
  pointsToNext,
  nextRank,
  nextStudentName,
  isPublic,
}: {
  rank: number
  totalStudents: number
  score: number
  progress: number
  pointsToNext: number
  nextRank?: number
  nextStudentName?: string
  isPublic: boolean
}) {
  const podium = rank <= 3
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div
        className={cn(
          'relative px-5 py-4',
          podium ? 'bg-gradient-to-br from-brand to-accent text-white' : 'bg-surface-2'
        )}
      >
        {podium && <span className="absolute top-3 right-4 text-2xl">🏆</span>}
        <p className={cn('text-[11px] font-bold tracking-widest uppercase', podium ? 'text-white/75' : 'text-muted')}>
          Your Rank
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="tabular text-3xl font-black sm:text-4xl">#{rank}</span>
          <span className={cn('text-sm font-semibold', podium ? 'text-white/80' : 'text-muted')}>
            / {totalStudents} students
          </span>
        </div>
        <div className={cn('mt-3 flex items-center gap-2 text-sm font-semibold', podium ? 'text-white/90' : 'text-ink-2')}>
          <Sparkles className="size-4" aria-hidden />
          Progress: {Math.round(progress)}%
        </div>
      </div>

      <div className="space-y-3 px-5 py-4">
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Overall score" value={`${score.toFixed(1)}%`} />
          <Metric label="Questions done" value={String(Math.round(progress))} suffix="%" />
        </div>

        {pointsToNext > 0 && nextRank ? (
          <p className="rounded-xl border border-brand/25 bg-brand-soft px-3 py-2.5 text-sm font-semibold text-brand">
            You are {pointsToNext.toFixed(1)} point{pointsToNext === 1 ? '' : 's'} away from Rank #{nextRank}
            {nextStudentName && isPublic && nextStudentName !== 'Student' ? ` (${nextStudentName})` : ''}.
          </p>
        ) : (
          <p className="rounded-xl border border-success/25 bg-success-soft px-3 py-2.5 text-sm font-semibold text-success">
            {rank === 1 ? 'You are leading the board. Keep it up! 🎉' : 'Keep practising to move up a rank.'}
          </p>
        )}

        <Link
          to="/leaderboard/me"
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-ink transition hover:bg-surface-2"
        >
          See my full progress <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </section>
  )
}

function Metric({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2">
      <p className="text-[10px] font-semibold tracking-wide text-muted uppercase">{label}</p>
      <p className="tabular mt-0.5 text-lg font-extrabold text-ink">
        {value}
        {suffix && <span className="text-xs font-semibold text-muted">{suffix}</span>}
      </p>
    </div>
  )
}

/* ── Compact dashboard card ─────────────────────────────────────────────── */

export function LeaderboardMiniCard({
  entries,
  myRank,
  myProgress,
  isPublic,
}: {
  entries: LeaderboardEntry[]
  myRank?: number
  myProgress?: number
  isPublic: boolean
}) {
  return (
    <section className="bg-surface border-border rounded-2xl border shadow-sm">
      <header className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <span className="grid size-8 place-items-center rounded-lg bg-warn-soft text-gold">
          <Trophy className="size-4" aria-hidden />
        </span>
        <h2 className="flex-1 text-sm font-bold text-ink">Top Students</h2>
        {myRank != null && <Badge tone="brand">#{myRank}</Badge>}
      </header>

      <ol className="divide-y divide-border">
        {entries.slice(0, 3).map((entry) => (
          <li key={entry.studentId}>
            <Link to={`/leaderboard/student/${entry.studentId}`} className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-surface-2">
              <RankBadge rank={entry.rank} />
              <Avatar name={entry.studentName} src={entry.photoUrl} size={30} />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                {isPublic ? entry.studentName.split(' ')[0] : `Student #${entry.rank}`}
              </span>
              <span className="tabular shrink-0 text-sm font-bold text-brand">
                {entry.overallScore.toFixed(0)}%
              </span>
            </Link>
          </li>
        ))}
        {entries.length === 0 && (
          <li className="px-4 py-6 text-center text-xs text-muted">
            No student has completed a test in this period yet.
          </li>
        )}
      </ol>

      {myRank != null && (
        <div className="border-t border-border bg-surface-2 px-4 py-2.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
            <Flame className="size-3.5 text-warn" aria-hidden />
            Your Rank: <span className="tabular text-ink">#{myRank}</span>
            {myProgress != null && (
              <>
                {' · '}Progress: <span className="tabular text-ink">{Math.round(myProgress)}%</span>
              </>
            )}
          </p>
        </div>
      )}

      <Link
        to="/leaderboard"
        className="flex items-center justify-center gap-1.5 border-t border-border px-4 py-3 text-sm font-semibold text-brand transition hover:bg-brand-soft"
      >
        View Full Leaderboard <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </section>
  )
}
