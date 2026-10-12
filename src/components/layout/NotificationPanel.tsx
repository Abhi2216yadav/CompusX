import {
  Bell,
  BookOpen,
  CalendarDays,
  CheckCheck,
  ClipboardList,
  FileQuestion,
  GraduationCap,
  Megaphone,
  Sparkles,
  Trophy,
  UserRound,
} from 'lucide-react'
import type { NotificationType } from '@/services/types'
import { useNotifications } from '@/context/NotificationContext'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { EmptyState, LoadingState } from '@/components/ui/Feedback'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/utils/cn'
import { relativeTime } from '@/utils/date'

const ICONS: Record<NotificationType, typeof Bell> = {
  homework: ClipboardList,
  assignment: BookOpen,
  notice: Megaphone,
  deadline: CalendarDays,
  material: BookOpen,
  event: CalendarDays,
  testResult: GraduationCap,
  club: Sparkles,
  peerAnswer: UserRound,
  system: Bell,
}

const TONES: Record<NotificationType, string> = {
  homework: 'bg-info-soft text-info',
  assignment: 'bg-info-soft text-info',
  notice: 'bg-warn-soft text-warn',
  deadline: 'bg-danger-soft text-danger',
  material: 'bg-brand-soft text-brand',
  event: 'bg-accent/10 text-accent',
  testResult: 'bg-success-soft text-success',
  club: 'bg-accent/10 text-accent',
  peerAnswer: 'bg-brand-soft text-brand',
  system: 'bg-surface-3 text-muted',
}

export function NotificationPanel({
  open,
  onClose,
  onNavigate,
}: {
  open: boolean
  onClose: () => void
  onNavigate: (href: string) => void
}) {
  const { items, unread, userId, loading, markAllRead, markRead } = useNotifications()
  const navigate = useNavigate()

  const openItem = (id: string, link?: string) => {
    if (!link) return
    void markRead([id])
    onNavigate(link)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={
        <span className="flex items-center gap-2">
          Notifications
          {unread > 0 && (
            <span className="tabular rounded-full bg-danger px-2 py-0.5 text-[10px] font-bold text-white">
              {unread} new
            </span>
          )}
        </span>
      }
      footer={
        unread > 0 ? (
          <Button
            variant="secondary"
            size="sm"
            icon={<CheckCheck className="size-3.5" />}
            onClick={() => void markAllRead()}
          >
            Mark all as read
          </Button>
        ) : (
          <span className="text-xs text-muted">You are all caught up.</span>
        )
      }
    >
      {loading ? (
        <LoadingState rows={4} label="Loading notifications" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Bell className="size-6" />}
          title="No notifications yet"
          description="New homework, notices, materials and test results will appear here."
        />
      ) : (
        <ul className="-mx-1 space-y-1">
          {items.map((n) => {
            const Icon = ICONS[n.type] ?? Bell
            const isUnread = userId ? !n.readBy.includes(userId) : false
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => openItem(n.id, n.link)}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-surface-2',
                    isUnread && 'bg-brand-soft/50'
                  )}
                >
                  <span className={cn('mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl', TONES[n.type])}>
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-ink">{n.title}</span>
                      <span className="tabular ml-auto shrink-0 text-[10px] text-muted">
                        {relativeTime(n.createdAt)}
                      </span>
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-xs text-muted">{n.body}</span>
                  </span>
                  {isUnread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted">
          <Trophy className="size-3.5" aria-hidden /> Ranking updates arrive right after a test.
        </span>
        <Button variant="ghost" size="sm" onClick={() => navigate('/notifications')}>
          View all
        </Button>
      </div>
    </Modal>
  )
}

/** Small inline bell used on pages that want notifications without the drawer. */
export function NotificationBellRow() {
  const { unread } = useNotifications()
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => navigate('/notifications')}
      className="inline-flex items-center gap-2 text-xs font-semibold text-brand hover:underline"
    >
      <FileQuestion className="size-3.5" aria-hidden />
      {unread ? `${unread} unread notifications` : 'No new notifications'}
    </button>
  )
}
