import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck, CalendarX2, Clock, Info, TrendingUp } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { COLLECTIONS } from '@/services/db'
import type { AttendanceRecord, AttendanceStatus } from '@/services/types'
import { useCollection } from '@/hooks/useCollection'
import { summarise, type AttendanceSummary } from '@/services/attendance'
import { PageHeader, SectionCard, StatTile } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState, LoadingState, MasteryBar, Progress } from '@/components/ui/Feedback'
import { formatDateLong } from '@/utils/date'

const STATUS_TONE: Record<AttendanceStatus, 'success' | 'danger' | 'warn' | 'info'> = {
  present: 'success',
  absent: 'danger',
  late: 'warn',
  excused: 'info',
}

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  excused: 'Excused',
}

export default function Attendance() {
  const { profile } = useAuth()
  const [selectedMonth, setSelectedMonth] = useState<string>('all')

  const record = useCollection<AttendanceRecord>(
    COLLECTIONS.attendance,
    {
      where: [
        { field: 'schoolId', op: '==', value: profile?.schoolId ?? '' },
        { field: 'studentId', op: '==', value: profile?.id ?? '' },
      ],
    },
    [profile?.schoolId, profile?.id]
  )

  const summary: AttendanceSummary = useMemo(
    () => summarise(record.data[0] ?? null),
    [record.data]
  )

  const months = useMemo(
    () =>
      Object.entries(summary.monthly)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([key, v]) => ({ key, ...v })),
    [summary.monthly]
  )

  const recent = useMemo(
    () => [...summary.recent].sort((a, b) => b.date.localeCompare(a.date)),
    [summary.recent]
  )

  if (record.loading) return <LoadingState label="Loading your attendance…" rows={4} />

  const tone = summary.percentage >= 75 ? 'success' : summary.percentage >= 60 ? 'warn' : 'danger'

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Attendance"
        description="Your class attendance, month by month. Attendance is recorded by your teacher and is not part of your leaderboard score."
      />

      {summary.totalClasses === 0 ? (
        <EmptyState
          title="No attendance recorded yet"
          description="Your class teacher will mark attendance from the beginning of the term."
          icon={<CalendarCheck className="size-6" />}
        />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatTile label="Overall" value={`${summary.percentage}%`} tone={tone} icon={<TrendingUp className="size-4" />} />
            <StatTile label="Present" value={summary.present} tone="success" icon={<CalendarCheck className="size-4" />} />
            <StatTile label="Absent" value={summary.absent} tone="danger" icon={<CalendarX2 className="size-4" />} />
            <StatTile label="Late" value={summary.late} tone="warn" icon={<Clock className="size-4" />} />
            <StatTile label="Excused" value={summary.excused} tone="info" icon={<Info className="size-4" />} />
          </div>

          <SectionCard title="Overall record" subtitle={`${summary.totalClasses} classes held`} className="mb-4">
            <Progress value={summary.percentage} tone={tone} size="lg" />
            <p className="mt-2 text-xs text-muted">
              {summary.percentage >= 75
                ? 'You are comfortably above the usual 75% expectation.'
                : summary.percentage >= 60
                  ? 'You are below the usual 75% expectation. Try to attend regularly.'
                  : 'Your attendance is low. Please speak to your class teacher.'}
            </p>
          </SectionCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Month by month" subtitle="Select a month to focus" icon={<CalendarCheck className="size-4" />}>
              <div className="mb-3.5 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedMonth('all')}
                  aria-pressed={selectedMonth === 'all'}
                  className={
                    selectedMonth === 'all'
                      ? 'rounded-lg bg-brand-soft px-2.5 py-1.5 text-xs font-bold text-brand'
                      : 'rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:bg-surface-2'
                  }
                >
                  All months
                </button>
                {months.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setSelectedMonth(m.key)}
                    aria-pressed={selectedMonth === m.key}
                    className={
                      selectedMonth === m.key
                        ? 'rounded-lg bg-brand-soft px-2.5 py-1.5 text-xs font-bold text-brand'
                        : 'rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:bg-surface-2'
                    }
                  >
                    {m.key}
                  </button>
                ))}
              </div>

              <div className="space-y-3.5">
                {months
                  .filter((m) => selectedMonth === 'all' || m.key === selectedMonth)
                  .map((m) => (
                    <div key={m.key}>
                      <MasteryBar
                        label={m.key}
                        value={m.percentage}
                        color={m.percentage >= 75 ? 'var(--cx-success)' : m.percentage >= 60 ? 'var(--cx-warn)' : 'var(--cx-danger)'}
                        trailing={
                          <p className="mt-1 text-[11px] text-muted">
                            {m.present} present · {m.absent} absent · {m.late} late · {m.excused} excused
                          </p>
                        }
                      />
                    </div>
                  ))}
              </div>
            </SectionCard>

            <SectionCard title="Recent class days" subtitle="Most recent first" icon={<Clock className="size-4" />}>
              {recent.length === 0 ? (
                <EmptyState compact title="No recent records" />
              ) : (
                <ul className="divide-y divide-border">
                  {recent.map((day) => (
                    <li key={day.date} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="text-sm text-ink-2">{formatDateLong(day.date)}</span>
                      <Badge tone={STATUS_TONE[day.status]}>{STATUS_LABEL[day.status]}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>

          <p className="mt-5 text-center text-xs text-muted">
            Think a day was marked wrongly? Ask your class teacher to re-mark it.{' '}
            <Link to="/help" className="font-semibold text-brand hover:underline">
              Read the help guide
            </Link>
            .
          </p>
        </>
      )}
    </div>
  )
}