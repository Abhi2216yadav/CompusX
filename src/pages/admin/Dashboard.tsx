import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  Handshake,
  Library,
  Megaphone,
  Settings,
  Sparkles,
  Trophy,
  UserCog,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { COLLECTIONS } from '@/services/db'
import type {
  AttemptKind,
  ClassRoom,
  Contribution,
  Material,
  Notice,
  NoticeCategory,
  SchoolEvent,
  Subject,
  TestAttempt,
  UserProfile,
} from '@/services/types'
import { useCollection } from '@/hooks/useCollection'
import { PageHeader, SectionCard, StatTile } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState, LoadingState, Progress } from '@/components/ui/Feedback'
import { formatDateTime, toMillis } from '@/utils/date'
import { pct } from '@/utils/format'

const KIND_TONE: Record<AttemptKind, 'brand' | 'info' | 'gold'> = {
  quiz: 'brand',
  pyq: 'info',
  mock: 'gold',
}

const CATEGORY_TONE: Record<
  NoticeCategory,
  'brand' | 'info' | 'warn' | 'danger' | 'gold' | 'success'
> = {
  exam: 'danger',
  holiday: 'success',
  circular: 'info',
  competition: 'gold',
  deadline: 'warn',
  class: 'brand',
}

const QUICK_LINKS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/admin/students', label: 'Students', icon: Users },
  { to: '/admin/teachers', label: 'Teachers', icon: UserCog },
  { to: '/admin/classes', label: 'Classes', icon: GraduationCap },
  { to: '/admin/subjects', label: 'Subjects', icon: Library },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { to: '/admin/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

function scoreTone(value: number): 'success' | 'warn' | 'danger' {
  if (value >= 75) return 'success'
  if (value >= 50) return 'warn'
  return 'danger'
}

export default function AdminDashboard() {
  const { profile, school } = useAuth()
  const schoolId = profile?.schoolId ?? ''

  const users = useCollection<UserProfile>(
    COLLECTIONS.users,
    { where: [{ field: 'schoolId', op: '==', value: schoolId }] },
    [schoolId]
  )
  const classes = useCollection<ClassRoom>(
    COLLECTIONS.classes,
    {
      where: [{ field: 'schoolId', op: '==', value: schoolId }],
      orderBy: [{ field: 'classLevel' }],
    },
    [schoolId]
  )
  const subjects = useCollection<Subject>(
    COLLECTIONS.subjects,
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
    {
      where: [{ field: 'schoolId', op: '==', value: schoolId }],
      orderBy: [{ field: 'createdAt', dir: 'desc' }],
    },
    [schoolId]
  )
  const events = useCollection<SchoolEvent>(
    COLLECTIONS.events,
    {
      where: [{ field: 'schoolId', op: '==', value: schoolId }],
      orderBy: [{ field: 'startsAt' }],
    },
    [schoolId]
  )
  const attempts = useCollection<TestAttempt>(
    COLLECTIONS.testAttempts,
    {
      where: [{ field: 'schoolId', op: '==', value: schoolId }],
      orderBy: [{ field: 'submittedAt', dir: 'desc' }],
    },
    [schoolId]
  )
  const contributions = useCollection<Contribution>(
    COLLECTIONS.contributions,
    { where: [{ field: 'schoolId', op: '==', value: schoolId }] },
    [schoolId]
  )

  const stats = useMemo(() => {
    const now = Date.now()
    return {
      students: users.data.filter((u) => u.role === 'student').length,
      teachers: users.data.filter((u) => u.role === 'teacher').length,
      admins: users.data.filter((u) => u.role === 'admin').length,
      activeClasses: classes.data.filter((c) => (c.studentCount ?? 0) > 0).length,
      publishedMaterials: materials.data.filter((m) => m.isApproved).length,
      notices: notices.data.length,
      upcomingEvents: events.data.filter((e) => toMillis(e.startsAt) >= now).length,
      attempts: attempts.data.length,
      contributions: contributions.data.length,
    }
  }, [
    users.data,
    classes.data,
    materials.data,
    notices.data,
    events.data,
    attempts.data,
    contributions.data,
  ])

  const upcomingEvents = useMemo(() => {
    const now = Date.now()
    return events.data
      .filter((e) => toMillis(e.startsAt) >= now)
      .slice(0, 4)
  }, [events.data])

  const recentNotices = useMemo(() => notices.data.slice(0, 4), [notices.data])

  const recentAttempts = useMemo(() => attempts.data.slice(0, 8), [attempts.data])

  const attemptColumns: Column<TestAttempt>[] = [
    {
      key: 'student',
      header: 'Student',
      cell: (a) => (
        <span className="block truncate text-sm font-semibold text-ink">{a.studentName}</span>
      ),
    },
    {
      key: 'test',
      header: 'Test',
      cell: (a) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-ink-2">{a.refTitle}</p>
          <Badge tone={KIND_TONE[a.kind] ?? 'neutral'}>{a.kind}</Badge>
        </div>
      ),
    },
    {
      key: 'class',
      header: 'Class',
      hideBelow: 'sm',
      cell: (a) => <span className="text-xs text-muted">{a.classLevel}-{a.section}</span>,
    },
    {
      key: 'score',
      header: 'Score',
      cell: (a) => (
        <div className="w-24 space-y-1">
          <p className="tabular text-xs font-bold text-ink">{pct(a.percentage)}</p>
          <Progress value={a.percentage} size="sm" tone={scoreTone(a.percentage)} />
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Submitted',
      align: 'right',
      hideBelow: 'md',
      cell: (a) => <span className="text-xs text-muted">{formatDateTime(a.submittedAt)}</span>,
    },
  ]

  const loading =
    users.loading ||
    classes.loading ||
    subjects.loading ||
    materials.loading ||
    notices.loading ||
    events.loading ||
    attempts.loading ||
    contributions.loading

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="School overview"
        description={`${school?.name ?? 'Your school'} · ${
          profile?.academicYear ?? 'Current year'
        }`}
        action={
          <Link to="/admin/reports">
            <Button size="sm" variant="secondary" icon={<BarChart3 className="size-4" />}>
              Reports
            </Button>
          </Link>
        }
      />

      {loading ? (
        <LoadingState label="Loading school overview…" rows={6} />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label="Students"
              value={stats.students.toLocaleString()}
              hint={`${stats.activeClasses} class${stats.activeClasses === 1 ? '' : 'es'} running`}
              icon={<Users className="size-4" />}
              href="/admin/students"
            />
            <StatTile
              label="Teachers"
              value={stats.teachers.toLocaleString()}
              hint={`${stats.admins} admin${stats.admins === 1 ? '' : 's'}`}
              icon={<UserCog className="size-4" />}
              tone="info"
              href="/admin/teachers"
            />
            <StatTile
              label="Active classes"
              value={stats.activeClasses.toLocaleString()}
              hint={`${classes.data.length} in total · ${subjects.data.length} subjects`}
              icon={<GraduationCap className="size-4" />}
              tone="gold"
              href="/admin/classes"
            />
            <StatTile
              label="Published materials"
              value={stats.publishedMaterials.toLocaleString()}
              hint={`${materials.data.length} uploaded in total`}
              icon={<Library className="size-4" />}
              tone="success"
              href="/admin/materials"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Notices published" value={stats.notices.toLocaleString()} icon={<Megaphone className="size-4" />} href="/admin/notices" />
            <StatTile label="Upcoming events" value={stats.upcomingEvents.toLocaleString()} icon={<CalendarDays className="size-4" />} tone="info" href="/admin/events" />
            <StatTile label="Test attempts" value={stats.attempts.toLocaleString()} icon={<ClipboardList className="size-4" />} tone="warn" href="/admin/reports" />
            <StatTile label="Contributions" value={stats.contributions.toLocaleString()} icon={<Handshake className="size-4" />} tone="success" href="/admin/leaderboard" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard
              title="Upcoming events"
              subtitle={`${stats.upcomingEvents} scheduled`}
              icon={<CalendarDays className="size-4" />}
            >
              {upcomingEvents.length === 0 ? (
                <EmptyState
                  compact
                  icon={<CalendarDays className="size-5" />}
                  title="No upcoming events"
                  description="Schedule a sports day, workshop or quiz to get students involved."
                />
              ) : (
                <ul className="divide-y divide-border">
                  {upcomingEvents.map((event) => (
                    <li key={event.id} className="flex items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{event.name}</p>
                        <p className="truncate text-[11px] text-muted">
                          {formatDateTime(event.startsAt)} · {event.venue}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] font-semibold text-brand">
                        {event.attendeeIds.length} registered
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard
              title="Recent notices"
              subtitle={`${stats.notices} published`}
              icon={<Megaphone className="size-4" />}
              action={
                <Link to="/admin/notices" className="text-xs font-bold text-brand hover:underline">
                  View all
                </Link>
              }
            >
              {recentNotices.length === 0 ? (
                <EmptyState
                  compact
                  icon={<Megaphone className="size-5" />}
                  title="No notices yet"
                  description="Publish a circular and every student sees it instantly."
                />
              ) : (
                <ul className="divide-y divide-border">
                  {recentNotices.map((notice) => (
                    <li key={notice.id} className="flex items-center gap-3 py-2.5">
                      <Badge tone={CATEGORY_TONE[notice.category] ?? 'neutral'}>
                        {notice.category}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{notice.title}</p>
                        <p className="truncate text-[11px] text-muted">
                          {notice.authorName} · {formatDateTime(notice.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>

          <SectionCard
            title="Quick links"
            subtitle="Jump straight into school management"
            icon={<Sparkles className="size-4" />}
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {QUICK_LINKS.map((link) => {
                const Icon = link.icon
                return (
                  <Link key={link.to} to={link.to}>
                    <Button
                      variant="secondary"
                      fullWidth
                      className="justify-start"
                      icon={<Icon className="size-4" />}
                    >
                      {link.label}
                    </Button>
                  </Link>
                )
              })}
            </div>
          </SectionCard>

          <SectionCard
            title="Recent test activity"
            subtitle={`${stats.attempts} attempt${stats.attempts === 1 ? '' : 's'} recorded`}
            icon={<ClipboardList className="size-4" />}
            bodyClassName="px-4 pb-4"
          >
            <DataTable
              rows={recentAttempts}
              columns={attemptColumns}
              rowKey={(a) => a.id}
              className="shadow-none"
              empty={{
                title: 'No test attempts yet',
                description: 'Quiz, PYQ and mock-test submissions will appear here.',
              }}
            />
          </SectionCard>
        </div>
      )}
    </div>
  )
}
