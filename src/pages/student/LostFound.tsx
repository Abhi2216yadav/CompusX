import { useMemo, useState } from 'react'
import { BadgeCheck, MapPin, PackageOpen, Plus, ShieldQuestion } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { db } from '@/services'
import { COLLECTIONS } from '@/services/db'
import { reportContent } from '@/services/contribution'
import type { LostFoundPost } from '@/services/types'
import { useCollection } from '@/hooks/useCollection'
import { useDebounced } from '@/hooks/useUi'
import { PageHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input, RadioCards, Select, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Tabs } from '@/components/ui/Disclosure'
import { EmptyState, LoadingState } from '@/components/ui/Feedback'
import { makeId } from '@/utils/id'
import { relativeTime } from '@/utils/date'

const STATUS_TONE = {
  open: 'warn',
  resolved: 'success',
  rejected: 'danger',
} as const

export default function LostFound() {
  const { profile } = useAuth()
  const [tab, setTab] = useState<'all' | 'lost' | 'found' | 'mine'>('all')
  const [query, setQuery] = useState('')
  const [posting, setPosting] = useState(false)
  const debounced = useDebounced(query)

  const posts = useCollection<LostFoundPost>(
    COLLECTIONS.lostFound,
    {
      where: [{ field: 'schoolId', op: '==', value: profile?.schoolId ?? '' }],
      orderBy: [{ field: 'createdAt', dir: 'desc' }],
    },
    [profile?.schoolId]
  )

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase()
    return posts.data
      .filter((p) => {
        if (tab === 'mine' && p.postedBy !== profile?.id) return false
        if (tab === 'lost' && p.type !== 'lost') return false
        if (tab === 'found' && p.type !== 'found') return false
        if (!q) return true
        return (
          p.itemName.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'open' ? -1 : 1
        return Number(b.createdAt) - Number(a.createdAt)
      })
  }, [posts.data, tab, debounced, profile?.id])

  const openCount = posts.data.filter((p) => p.status === 'open').length

  async function report(post: LostFoundPost, reason: string) {
    if (!profile) return
    await reportContent({ collection: 'lostFound', id: post.id, reporter: profile, reason })
  }

  if (posts.loading) return <LoadingState label="Loading lost & found…" rows={4} />

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Lost & found"
        description="Report something you lost, or hand in something you found. Both help your school community."
        action={
          <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setPosting(true)}>
            Post an item
          </Button>
        }
      />

      <div className="mb-4 max-w-xs">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search items…"
          aria-label="Search lost and found"
        />
      </div>

      <div className="mb-4">
        <Tabs
          value={tab}
          onChange={(v) => setTab(v as typeof tab)}
          items={[
            { value: 'all', label: 'All', count: posts.data.length },
            { value: 'lost', label: 'Lost' },
            { value: 'found', label: 'Found' },
            { value: 'mine', label: 'My posts' },
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Nothing here"
          description="No items match this filter. Check the other tabs, or post a new item."
          icon={<PackageOpen className="size-6" />}
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {filtered.map((post) => (
            <li key={post.id} className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={post.type === 'lost' ? 'danger' : 'success'}>
                  {post.type === 'lost' ? 'Lost item' : 'Found item'}
                </Badge>
                <Badge tone={STATUS_TONE[post.status]}>{post.status}</Badge>
                <span className="ml-auto text-[11px] text-muted">{relativeTime(post.createdAt)}</span>
              </div>

              <h2 className="mt-2.5 text-sm font-bold text-ink">{post.itemName}</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">{post.description}</p>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5" aria-hidden />
                  {post.location}
                </span>
                {post.lostDate && <span>Last seen {post.lostDate}</span>}
                <span>Class {post.classLevel}</span>
              </div>

              <div className="mt-3 rounded-xl bg-surface-2 p-3 text-xs">
                <p className="font-semibold text-ink">
                  {post.type === 'lost' ? 'If you found it' : 'If it is yours'} — contact {post.contactName}
                </p>
                <p className="mt-0.5 text-muted">{post.contactMethod}</p>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted">Posted by {post.postedByName}</span>
                {post.status === 'open' && profile && post.postedBy !== profile.id && (
                  <ReportButton onReport={(reason) => void report(post, reason)} />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {openCount > 0 && (
        <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted">
          <BadgeCheck className="size-3.5 text-success" aria-hidden />
          {openCount} open item{openCount === 1 ? '' : 's'} waiting to be reunited with its owner.
        </p>
      )}

      <PostModal open={posting} onClose={() => setPosting(false)} />
    </div>
  )
}

/* ── Report dialog ───────────────────────────────────────────────────────── */

function ReportButton({ onReport }: { onReport: (reason: string) => void }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted transition hover:text-danger"
      >
        <ShieldQuestion className="size-3.5" aria-hidden />
        Report
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        title="Report this post"
        description="Reports are reviewed by a teacher. Reporting something wrongly is itself moderated."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={!reason.trim()}
              onClick={() => {
                onReport(reason.trim())
                setReason('')
                setOpen(false)
              }}
            >
              Submit report
            </Button>
          </>
        }
      >
        <Textarea
          label="Reason"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="This post contains personal information."
        />
      </Modal>
    </>
  )
}

/* ── New post ────────────────────────────────────────────────────────────── */

function PostModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile } = useAuth()
  const [type, setType] = useState<LostFoundPost['type']>('lost')
  const [itemName, setItemName] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [lostDate, setLostDate] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactMethod, setContactMethod] = useState('')
  const [busy, setBusy] = useState(false)

  const valid = itemName.trim() && description.trim() && location.trim() && contactName.trim() && contactMethod.trim()

  async function submit() {
    if (!profile || !valid) return
    setBusy(true)
    try {
      const record: LostFoundPost = {
        id: makeId('lf'),
        schoolId: profile.schoolId,
        type,
        itemName: itemName.trim(),
        description: description.trim(),
        location: location.trim(),
        lostDate: type === 'lost' && lostDate ? lostDate : undefined,
        contactName: contactName.trim(),
        contactMethod: contactMethod.trim(),
        postedBy: profile.id,
        postedByName: profile.name,
        classLevel: profile.classLevel ?? 10,
        status: 'open',
        createdAt: Date.now(),
      }
      await db.create(COLLECTIONS.lostFound, record, record.id)
      setItemName('')
      setDescription('')
      setLocation('')
      setLostDate('')
      setContactName('')
      setContactMethod('')
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Post an item"
      description="Be specific about the item and where it was lost or found."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button loading={busy} disabled={!valid} onClick={() => void submit()}>
            Post
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <RadioCards
          name="lf-type"
          value={type}
          onChange={(v) => setType(v)}
          options={[
            { value: 'lost', label: 'I lost something', description: 'Ask classmates to look out for it' },
            { value: 'found', label: 'I found something', description: 'Help the owner get it back' },
          ]}
        />
        <Input
          label="Item"
          required
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          placeholder="Blue water bottle with stickers"
        />
        <Textarea
          label="Description"
          required
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Where exactly, what it looks like, anything that identifies it."
        />
        <Input
          label="Location"
          required
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Science block, second floor corridor"
        />
        {type === 'lost' && (
          <Input
            label="Date lost (optional)"
            type="date"
            value={lostDate}
            onChange={(e) => setLostDate(e.target.value)}
          />
        )}
        <Input
          label="Your name"
          required
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          placeholder={profile?.name ?? ''}
        />
        <Select
          label="How can you be contacted?"
          required
          value={contactMethod}
          onChange={(e) => setContactMethod(e.target.value)}
          placeholder="Choose…"
          options={[
            { value: 'Ask for me in class', label: 'Ask for me in class' },
            { value: 'Class teacher', label: 'Through my class teacher' },
            { value: 'School office', label: 'Through the school office' },
          ]}
        />
      </div>
    </Modal>
  )
}