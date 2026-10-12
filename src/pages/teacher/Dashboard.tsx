import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  FileQuestion,
  GraduationCap,
  Library,
  Megaphone,
  PenLine,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { COLLECTIONS } from '@/services/db'
import type { Material, Notice, Task, TestAttempt } from '@/services/types'
import { useCollection } from '@/hooks/useCollection'
import { useSchoolData } from '@/hooks/useSchoolData'
import { PageHeader, SectionCard, StatTile } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, LoadingState } from '@/components/ui/Feedback'
import { deadlineLabel, greeting, relativeTime, toMillis } from '@/utils/date'
import { pct } from '@/utils/format'

const QUICK_LINKS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/teacher/students', label: 'Students', icon: Users },
  { to: '/teacher/materials', label: 'Materials', icon: Library },
  { to: '/teacher/questions', label: 'Questions', icon: FileQuestion },
  { to: '/teacher/quizzes', label: 'Quizzes', icon: GraduationCap },
  { to: '/teacher/mock-tests', label: 'Mock tests', icon: PenLine },
  { to: '/teacher/attendance', label: 'Attendance', icon: CalendarCheck },
]

export default function TeacherDashboard() {
  const { profile, school } = useAuth()
  const schoolId = profile?.schoolId ?? ''
  const subjectIds = profile?.subjects ?? []

  const { subjectById } = useSchoolData(schoolId)

  const homework = useCollection<Task>(
    COLLECTIONS.homework,
    {
      where: [
        { field: 'schoolId', op: '==', value: schoolId },
        { field: 'teacherId', op: '==', value: profile?.id ?? '' },
      ],
      orderBy: [{ field: 'dueAt', dir: 'asc' }],
    },
    [schoolId, profile?.id]
  )

  const assignments = useCollection<Task>(
    COLLECTIONS.assignments,
    {
      where: [
        { field: 'schoolId', op: '==', value: schoolId },
        { field: 'teacherId', op: '==', value: profile?.id ?? '' },
      ],
      orderBy: [{ field: 'dueAt', dir: 'asc' }],
    },
    [schoolId, profile?.id]
  )

  const materials = useCollection<Material>(
    COLLECTIONS.materials,
    { where: [{ field: 'schoolId', op: '==', value: schoolId }] },
    [schoolId]
  )

  const notices = useCollection<Notice>(
    COLLECTIONS.notices,
    {
      where: [
        { field: 'schoolId', op: '==', value: schoolId },
        { field: 'authorId', op: '==', value: profile?.id ?? '' },
      ],
      orderBy: [{ field: 'createdAt', dir: 'desc' }],
    },
    [schoolId, profile?.id]
  )

  const attempts = useCollection<TestAttempt>(
    COLLECTIONS.testAttempts,
    {
      where: [
        { field: 'schoolId', op: '==', value: schoolId },
        ...(subjectIds.length
          ? [{ field: 'subjectId', op: 'array-contains-any' as const, value: subjectIds }]
          : []),
      ],
      orderBy: [{ field: 'submittedAt', dir: 'desc' }],
    },
    [schoolId, subjectIds.join(',')]
  )

  const upcoming = useMemo(() => {
    const now = Date.now()
    return [...homework.data, ...assignments.data]
      .filter((t) => toMillis(t.dueAt) >= now)
      .sort((a, b) => toMillis(a.dueAt) - toMillis(b.dueAt))
  }, [homework.data, assignments.data])

  const myNotices = useMemo(
    () => [...notices.data].sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt)),
    [notices.data]
  )

  const results = useMemo(() => {
    const rows = attempts.data
    const average = rows.length
      ? rows.reduce((sum, a) => sum + a.percentage, 0) / rows.length
      : 0
    return {
      count: rows.length,
      average,
      students: new Set(rows.map((a) => a.studentId)).size,
    }
  }, [attempts.data])

  const loading =
    homework.loading || assignments.loading || materials.loading || notices.loading || attempts.loading

  if (loading) return <LoadingState label="Loading your dashboard…" rows={5} />

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title={`${greeting()}, ${profile?.name?.split(' ')[0] ?? 'Teacher'}`}
        description={`${school?.name ?? 'Your school'}${
          profile?.designation ? ` · ${profile.designation}` : ''
        }`}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="My open tasks"
          value={upcoming.length}
          hint="homework + assignments"
          icon={<CheckCircle2 className="size-4" />}
          tone={upcoming.length > 0 ? 'warn' : 'success'}
          href="/teacher/homework"
        />
        <StatTile
          label="Attempts this term"
          value={results.count}
          hint={`${results.students} student${results.students === 1 ? '' : 's'} attempted`}
          icon={<ClipboardList className="size-4" />}
          href="/teacher/quizzes"
        />
        <StatTile
          label="Average score"
          value={results.count ? pct(results.average) : '—'}
          hint={results.count ? `across ${results.count} submissions` : 'no attempts yet'}
          icon={<TrendingUp className="size-4" />}
          tone={results.count ? 'success' : 'info'}
        />
        <StatTile
          label="Published materials"
          value={materials.data.length}
          hint="in the shared library"
          icon={<Library className="size-4" />}
          href="/teacher/materials"
        />
      </div>

      <div className="mb-5 space-y-5">
        <SectionCard
          title="Needs your attention"
          subtitle="Upcoming deadlines you have set"
          icon={<CalendarCheck className="size-4" />}
          action={
            <Link to="/teacher/homework" className="text-xs font-bold text-brand hover:underline">
              View all
            </Link>
          }
        >
          {upcoming.length === 0 ? (
            <EmptyState
              compact
              icon={<CheckCircle2 className="size-5 text-success" />}
              title="Nothing outstanding"
              description="Every task you set has passed its deadline."
            />
          ) : (
            <ul className="divide-y divide-border">
              {upcoming.slice(0, 5).map((task) => (
                <li key={`${task.kind}-${task.id}`}>
                  <Link
                    to={task.kind === 'homework' ? '/teacher/homework' : '/teacher/assignments'}
                    className="flex items-center gap-3 py-2.5 transition hover:bg-surface-2"
                  >
                    <Badge tone={task.kind === 'assignment' ? 'info' : 'neutral'}>
                      {task.kind === 'assignment' ? 'Assignment' : 'Homework'}
                    </Badge>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{task.title}</span>
                      <span className="block truncate text-[11px] text-muted">
                        {subjectById.get(task.subjectId)?.name ?? 'Subject'} · Class {task.classLevel}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] font-semibold text-muted">
                      {deadlineLabel(task.dueAt)}
                    </span>
                    <ArrowRight className="size-3.5 shrink-0 text-muted" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="My recent notices"
          subtitle={`${notices.data.length} published`}
          icon={<Megaphone className="size-4" />}
          action={
            <Link to="/teacher/notices">
              <Button size="sm" variant="secondary" icon={<Megaphone className="size-3.5" />}>
                New notice
              </Button>
            </Link>
          }
        >
          {myNotices.length === 0 ? (
            <EmptyState
              compact
              icon={<Megaphone className="size-5" />}
              title="No notices yet"
              description="Publish one and your targeted classes see it instantly."
              action={
                <Link to="/teacher/notices">
                  <Button size="sm">Write a notice</Button>
                </Link>
              }
            />
          ) : (
            <ul className="space-y-2">
              {myNotices.slice(0, 4).map((notice) => (
                <li key={notice.id}>
                  <Link
                    to="/teacher/notices"
                    className="block rounded-xl border border-border p-3 transition hover:border-brand/30"
                  >
                    <div className="flex items-start gap-2">
                      <Badge tone={notice.priority === 'urgent' ? 'danger' : notice.priority === 'important' ? 'warn' : 'neutral'}>
                        {notice.category}
                      </Badge>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                        {notice.title}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] text-muted">{notice.body}</p>
                    <p className="mt-1 text-[10px] text-muted">{relativeTime(notice.createdAt)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Quick links" subtitle="Jump straight into your teaching tools" icon={<Target className="size-4" />}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {QUICK_LINKS.map((link) => {
              const Icon = link.icon
              return (
                <Link key={link.to} to={link.to}>
                  <Button variant="secondary" fullWidth className="justify-start" icon={<Icon className="size-4" />}>
                    {link.label}
                  </Button>
                </Link>
              )
            })}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}