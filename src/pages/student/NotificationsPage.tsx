import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  BookOpen,
  CalendarDays,
  CheckCheck,
  ClipboardList,
  FileQuestion,
  Megaphone,
  Trophy,
  Users,
} from 'lucide-react'

import { useNotifications } from '@/context/NotificationContext'
import type { AppNotification, NotificationType } from '@/services/types'
import { PageHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Disclosure'
import { EmptyState, LoadingState } from '@/components/ui/Feedback'
import { relativeTime } from '@/utils/date'

const TYPE_META: Record<
  NotificationType,
  { label: string; tone: 'brand' | 'info' | 'warn' | 'success' | 'danger' | 'gold'; icon: typeof Bell }
> = {
  homework: { label: 'Homework', tone: 'brand', icon: ClipboardList },
  assignment: { label: 'Assignment', tone: 'brand', icon: ClipboardList },
  material: { label: 'Material', tone: 'info', icon: BookOpen },
  notice: { label: 'Notice', tone: 'warn', icon: Megaphone },
  event: { label: 'Event', tone: 'gold', icon: CalendarDays },
  testResult: { label: 'Result', tone: 'gold', icon: Trophy },
  deadline: { label: 'Deadline', tone: 'danger', icon: Bell },
  club: { label: 'Club', tone: 'success', icon: Users },
  peerAnswer: { label: 'Peer answer', tone: 'success', icon: Users },
  system: { label: 'System', tone: 'info', icon: FileQuestion },
}

export default function NotificationsPage() {
  const { items, unread, userId, loading, markRead, markAllRead } = useNotifications()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'all' | 'unread'>('all')

  const visible = useMemo(() => {
    const rows = [...items].sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
    return tab === 'unread' ? rows.filter((n) => !n.readBy.includes(userId ?? '')) : rows
  }, [items, tab, userId])

  async function open(notification: AppNotification) {
    if (!notification.readBy.includes(userId ?? '')) await markRead([notification.id])
    if (notification.link) navigate(notification.link)
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        title="Notifications"
        description={unread > 0 ? `${unread} unread` : 'You are all caught up.'}
        action={
          unread > 0 && (
            <Button size="sm" variant="secondary" icon={<CheckCheck className="size-4" />} onClick={() => void markAllRead()}>
              Mark all read
            </Button>
          )
        }
      />

      <div className="mb-4">
        <Tabs
          value={tab}
          onChange={(v) => setTab(v as typeof tab)}
          items={[
            { value: 'all', label: 'All', count: items.length },
            { value: 'unread', label: 'Unread', count: unread },
          ]}
        />
      </div>

      {loading ? (
        <LoadingState label="Loading notifications…" rows={5} />
      ) : visible.length === 0 ? (
        <EmptyState
          title={tab === 'unread' ? 'Nothing unread' : 'No notifications yet'}
          description={
            tab === 'unread'
              ? 'You have read everything. New homework, notices and events will appear here.'
              : 'Notifications about homework, notices, events and deadline reminders will appear here.'
          }
          icon={<Bell className="size-6" />}
        />
      ) : (
        <ul className="space-y-2">
          {visible.map((n) => {
            const meta = TYPE_META[n.type] ?? TYPE_META.notice
            const Icon = meta.icon
            const isUnread = !n.readBy.includes(userId ?? '')
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => void open(n)}
                  className={
                    isUnread
                      ? 'flex w-full items-start gap-3 rounded-2xl border border-brand/30 bg-brand-soft/40 p-4 text-left transition hover:border-brand/50'
                      : 'flex w-full items-start gap-3 rounded-2xl border border-border bg-surface p-4 text-left transition hover:border-brand/30'
                  }
                >
                  <span
                    className={
                      isUnread ? 'grid size-9 shrink-0 place-items-center rounded-xl bg-brand text-white' : 'grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted'
                    }
                  >
                    <Icon className="size-4" aria-hidden />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className={isUnread ? 'text-sm font-bold text-ink' : 'text-sm font-semibold text-ink-2'}>
                        {n.title}
                      </span>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      {isUnread && <span className="size-2 shrink-0 rounded-full bg-brand" aria-label="Unread" />}
                    </span>
                    <span className="mt-1 block text-sm leading-relaxed text-ink-2">{n.body}</span>
                    <span className="mt-1.5 block text-[11px] text-muted">{relativeTime(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}