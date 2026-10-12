import { useMemo, useState } from 'react'
import { CalendarDays, Megaphone, Plus, Users } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { db } from '@/services'
import { COLLECTIONS } from '@/services/db'
import { awardContribution } from '@/services/contribution'
import type { Club } from '@/services/types'
import { useCollection } from '@/hooks/useCollection'
import { useDebounced } from '@/hooks/useUi'
import { PageHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState, LoadingState } from '@/components/ui/Feedback'
import { relativeTime } from '@/utils/date'

export default function Clubs() {
  const { profile } = useAuth()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const [announceFor, setAnnounceFor] = useState<Club | null>(null)
  const debounced = useDebounced(query)

  const clubs = useCollection<Club>(
    COLLECTIONS.clubs,
    { where: [{ field: 'schoolId', op: '==', value: profile?.schoolId ?? '' }] },
    [profile?.schoolId]
  )

  const studentId = profile?.id ?? ''

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase()
    return clubs.data.filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.activities.some((a) => a.toLowerCase().includes(q))
    )
  }, [clubs.data, debounced])

  const active = selected ? (clubs.data.find((c) => c.id === selected) ?? null) : null

  async function toggleMembership(club: Club) {
    if (!profile) return
    const joined = club.memberIds.includes(studentId)
    const next = joined ? club.memberIds.filter((id) => id !== studentId) : [...club.memberIds, studentId]
    setJoining(true)
    try {
      await db.update(COLLECTIONS.clubs, club.id, { memberIds: next })
      if (!joined) {
        // Joining and actively contributing to a club both count for the board.
        await awardContribution({
          schoolId: profile.schoolId,
          studentId,
          studentName: profile.name,
          kind: 'club',
          description: `Joined ${club.name}`,
          refId: club.id,
          approvedBy: studentId,
        })
      }
    } finally {
      setJoining(false)
    }
  }

  if (clubs.loading) return <LoadingState label="Loading clubs…" rows={4} />

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Clubs & societies"
        description="Join a club, see what it is doing this term, and post announcements if you coordinate one."
      />

      <div className="mb-4 max-w-xs">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clubs…"
          aria-label="Search clubs"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No clubs yet"
          description="Your school has not added any clubs this year. Check back after the annual clubs fair."
          icon={<Users className="size-6" />}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((club) => {
            const joined = club.memberIds.includes(studentId)
            return (
              <article
                key={club.id}
                className="flex flex-col rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:border-brand/30"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="grid size-11 shrink-0 place-items-center rounded-xl text-lg"
                    style={{ background: `${club.color}22`, color: club.color }}
                    aria-hidden
                  >
                    {club.icon || '🎯'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-bold text-ink">{club.name}</h2>
                    <p className="text-[11px] text-muted">Coordinated by {club.coordinatorName}</p>
                  </div>
                  {club.coordinatorId === studentId && <Badge tone="gold">Coordinator</Badge>}
                </div>

                <p className="mt-2.5 line-clamp-3 text-sm text-ink-2">{club.description}</p>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="size-3.5" aria-hidden />
                    {club.memberIds.length} member{club.memberIds.length === 1 ? '' : 's'}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="size-3.5" aria-hidden />
                    {club.activities.length} activit{club.activities.length === 1 ? 'y' : 'ies'}
                  </span>
                </div>

                <div className="mt-auto flex items-center gap-2 pt-4">
                  <Button
                    size="sm"
                    variant={joined ? 'secondary' : 'primary'}
                    loading={joining}
                    onClick={() => void toggleMembership(club)}
                  >
                    {joined ? 'Leave club' : 'Join club'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelected(club.id)}>
                    View details
                  </Button>
                  {club.coordinatorId === studentId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto"
                      icon={<Megaphone className="size-3.5" />}
                      onClick={() => setAnnounceFor(club)}
                    >
                      Announce
                    </Button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      <Modal
        open={Boolean(active)}
        onClose={() => setSelected(null)}
        size="lg"
        title={active?.name}
        description={active ? `Coordinated by ${active.coordinatorName}` : undefined}
        footer={
          active && (
            <>
              <Button variant="ghost" onClick={() => setSelected(null)}>
                Close
              </Button>
              <Button
                loading={joining}
                onClick={() => void toggleMembership(active)}
              >
                {active.memberIds.includes(studentId) ? 'Leave club' : 'Join club'}
              </Button>
            </>
          )
        }
      >
        {active && (
          <div className="space-y-5">
            <p className="text-sm leading-relaxed text-ink-2">{active.description}</p>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted">Activities</h3>
              {active.activities.length === 0 ? (
                <p className="mt-1.5 text-sm text-muted">No activities planned yet.</p>
              ) : (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-2">
                  {active.activities.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted">Announcements</h3>
              {active.announcements.length === 0 ? (
                <p className="mt-1.5 text-sm text-muted">Nothing announced yet.</p>
              ) : (
                <ul className="mt-2 space-y-2.5">
                  {active.announcements.map((a) => (
                    <li key={a.body} className="rounded-xl border border-border bg-surface-2 p-3">
                      <p className="text-sm text-ink-2">{a.body}</p>
                      <p className="mt-1 text-[11px] text-muted">
                        {a.authorName} · {relativeTime(a.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted">
                Members ({active.memberIds.length})
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {active.memberIds.length === 0 ? (
                  <p className="text-sm text-muted">No members yet — be the first to join.</p>
                ) : (
                  active.memberIds.map((id) => (
                    <Badge key={id} tone="neutral">
                      Member
                    </Badge>
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </Modal>

      <AnnounceModal
        club={announceFor}
        onClose={() => setAnnounceFor(null)}
      />
    </div>
  )
}

/* ── Coordinator announcement ────────────────────────────────────────────── */

function AnnounceModal({ club, onClose }: { club: Club | null; onClose: () => void }) {
  const { profile } = useAuth()
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!club || !profile || !body.trim()) return
    setBusy(true)
    try {
      await db.update(COLLECTIONS.clubs, club.id, {
        announcements: [
          ...club.announcements,
          { body: body.trim(), authorName: profile.name, createdAt: Date.now() },
        ],
      })
      setBody('')
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={Boolean(club)}
      onClose={onClose}
      title="Post an announcement"
      description={club ? `Visible to every member of ${club.name}.` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button icon={<Plus className="size-4" />} loading={busy} disabled={!body.trim()} onClick={() => void submit()}>
            Post
          </Button>
        </>
      }
    >
      <Textarea
        label="Announcement"
        rows={4}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Practice match on Saturday at 7am — bring your kit."
      />
    </Modal>
  )
}