import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AppNotification } from '@/services/types'
import { listForUser, markAllRead as markAll, markRead, unreadCount } from '@/services/notifications'
import { useAuth } from './AuthContext'

interface NotificationContextValue {
  items: AppNotification[]
  unread: number
  /** Current user id — needed to evaluate per-item read state. */
  userId: string | null
  loading: boolean
  markRead: (ids: string[]) => Promise<void>
  markAllRead: () => Promise<void>
  reload: () => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const [items, setItems] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [nonce, setNonce] = useState(0)

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    let active = true
    if (!profile) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    listForUser(profile)
      .then((rows) => {
        if (!active) return
        setItems(rows)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [profile, nonce])

  const doMarkRead = useCallback(
    async (ids: string[]) => {
      if (!profile || !ids.length) return
      // Optimistic — the badge updates immediately, Firestore follows.
      setItems((prev) =>
        prev.map((n) =>
          ids.includes(n.id) && !n.readBy.includes(profile.id)
            ? { ...n, readBy: [...n.readBy, profile.id] }
            : n
        )
      )
      await markRead(ids, profile.id)
    },
    [profile]
  )

  const doMarkAllRead = useCallback(async () => {
    if (!profile) return
    await markAll(items, profile.id)
    reload()
  }, [profile, items, reload])

  const value = useMemo<NotificationContextValue>(
    () => ({
      items,
      unread: profile ? unreadCount(items, profile.id) : 0,
      userId: profile?.id ?? null,
      loading,
      markRead: doMarkRead,
      markAllRead: doMarkAllRead,
      reload,
    }),
    [items, loading, profile, doMarkRead, doMarkAllRead, reload]
  )

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationProvider>')
  return ctx
}
