import { useMemo, useState } from 'react'
import { CalendarDays, Clock, MapPin, UserCheck, Users } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { db } from '@/services'
import { COLLECTIONS } from '@/services/db'
import type { SchoolEvent } from '@/services/types'
import { useCollection } from '@/hooks/useCollection'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Tabs } from '@/components/ui/Disclosure'
import { EmptyState, LoadingState } from '@/components/ui/Feedback'
import { awardContribution } from '@/services/contribution'
import { formatDateLong, formatTime, toDate, toMillis } from '@/utils/date'

const CATEGORY_TONE: Record<string, 'brand' | 'success' | 'warn' | 'info' | 'gold' | 'danger'> = {
  sports: 'success',
  cultural: 'gold',
  science: 'info',
  technology: 'brand',
  quiz: 'warn',
  workshop: 'brand',
  competition: 'gold',
  club: 'info',
}

/** Events the student can join, split into upcoming and past. */
export default function EventsPage() {
  const { profile } = useAuth()
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const [busyId, setBusyId] = useState<string | null>(null)

  const events = useCollection<SchoolEvent>(
    COLLECTIONS.events,
    { where: [{ field: 'schoolId', op: '==', value: profile?.schoolId ?? '' }] },
    [profile?.schoolId]
  )

  const studentId = profile?.id ?? ''

  const { upcoming, past } = useMemo(() => {
    const now = Date.now()
    const mine = events.data.filter((e) => !e.classLevels?.length || e.classLevels.includes(profile?.classLevel ?? 0))
    return {
      upcoming: mine
        .filter((e) => toMillis(e.startsAt) >= now)
        .sort((a, b) => toMillis(a.startsAt) - toMillis(b.startsAt)),
      past: mine
        .filter((e) => toMillis(e.startsAt) < now)
        .sort((a, b) => toMillis(b.startsAt) - toMillis(a.startsAt)),
    }
  }, [events.data, profile?.classLevel])

  const visible = tab === 'upcoming' ? upcoming : past

  async function toggleRegistration(event: SchoolEvent) {
    if (!profile) return
    const joined = (event.attendeeIds ?? []).includes(studentId)
    const next = joined
      ? event.attendeeIds.filter((id) => id !== studentId)
      : [...(event.attendeeIds ?? []), studentId]

    if (event.capacity && !joined && next.length > event.capacity) {
      return
    }

    setBusyId(event.id)
    try {
      await db.update(COLLECTIONS.events, event.id, { attendeeIds: next })
      // Registering for a school event earns contribution points.
      if (!joined) {
        await awardContribution({
          schoolId: profile.schoolId,
          studentId,
          studentName: profile.name,
          kind: 'event',
          description: `Registered for ${event.name}`,
          refId: event.id,
          approvedBy: profile.id,
        })
      }
    } finally {
      setBusyId(null)
    }
  }

  if (events.loading) return <LoadingState label="Loading events…" rows={4} />

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader title="Events" description="Sports, cultural, academic and club events at your school." />

      <div className="mb-4">
        <Tabs
          value={tab}
          onChange={(v) => setTab(v as typeof tab)}
          items={[
            { value: 'upcoming', label: 'Upcoming', count: upcoming.length },
            { value: 'past', label: 'Past', count: past.length },
          ]}
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={tab === 'upcoming' ? 'No upcoming events' : 'No past events'}
          description="New events will appear here as soon as the school publishes them."
          icon={<CalendarDays className="size-6" />}
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((event) => {
            const joined = (event.attendeeIds ?? []).includes(studentId)
            const full = Boolean(event.capacity && event.attendeeIds.length >= event.capacity)
            const deadlinePassed = event.registrationDeadline
              ? toMillis(event.registrationDeadline) < Date.now()
              : false
            const start = toDate(event.startsAt)

            return (
              <li
                key={event.id}
                className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
              >
                <div className="flex flex-col sm:flex-row">
                  <div className="flex shrink-0 flex-row items-center gap-3 border-b border-border bg-surface-2 px-4 py-3 sm:w-28 sm:flex-col sm:justify-center sm:border-r sm:border-b-0">
                    <span className="text-2xl font-black text-brand">{start.getDate()}</span>
                    <span className="text-xs font-bold uppercase tracking-wide text-muted">
                      {start.toLocaleDateString(undefined, { month: 'short' })} {start.getFullYear()}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={CATEGORY_TONE[event.category] ?? 'neutral'}>{event.category}</Badge>
                      {joined && <Badge tone="success">You are going</Badge>}
                      {full && !joined && <Badge tone="warn">Full</Badge>}
                    </div>

                    <h2 className="mt-2 text-base font-bold text-ink">{event.name}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-ink-2">{event.description}</p>

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="size-3.5" aria-hidden />
                        {formatTime(event.startsAt)}
                        {event.endsAt ? ` – ${formatTime(event.endsAt)}` : ''}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="size-3.5" aria-hidden />
                        {event.venue}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <UserCheck className="size-3.5" aria-hidden />
                        {event.organiserName}
                      </span>
                      {event.capacity ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="size-3.5" aria-hidden />
                          {event.attendeeIds.length}/{event.capacity} joined
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="size-3.5" aria-hidden />
                          {event.attendeeIds.length} joined
                        </span>
                      )}
                    </div>

                    {event.classLevels?.length > 0 && (
                      <p className="mt-2 text-xs text-muted">Open to Class {event.classLevels.join(', ')}</p>
                    )}

                    {tab === 'upcoming' && (
                      <div className="mt-3.5 flex flex-wrap items-center gap-3">
                        <Button
                          size="sm"
                          variant={joined ? 'secondary' : 'primary'}
                          loading={busyId === event.id}
                          disabled={!joined && (full || deadlinePassed)}
                          onClick={() => void toggleRegistration(event)}
                        >
                          {joined ? 'Cancel registration' : full ? 'Registration full' : deadlinePassed ? 'Registration closed' : 'Register'}
                        </Button>
                        <span className="text-xs text-muted">
                          {deadlinePassed
                            ? 'Registration has closed'
                            : event.registrationDeadline
                              ? `Register by ${formatDateLong(event.registrationDeadline)}`
                              : 'Registration is open'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}