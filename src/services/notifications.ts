/** Notification fan-out + read-state helpers. */
import type { AppNotification, NotificationType, Role, UserProfile } from '@/services/types'
import { COLLECTIONS } from '@/services/db'
import { db } from './index'
import { makeId } from '@/utils/id'

export interface NotifyInput {
  schoolId: string
  type: NotificationType
  title: string
  body: string
  link?: string
  /** Specific students — falls back to a role broadcast when omitted. */
  userIds?: string[]
  role?: Role
}

export async function notify(input: NotifyInput): Promise<AppNotification[]> {
  const created: AppNotification[] = []

  if (input.userIds?.length) {
    for (const userId of input.userIds) {
      const doc: AppNotification = {
        id: makeId('ntf'),
        audience: 'user',
        userId,
        schoolId: input.schoolId,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link,
        readBy: [],
        createdAt: Date.now(),
      }
      await db.create(COLLECTIONS.notifications, doc, doc.id)
      created.push(doc)
    }
    return created
  }

  const doc: AppNotification = {
    id: makeId('ntf'),
    audience: 'role',
    role: input.role ?? 'student',
    schoolId: input.schoolId,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link,
    readBy: [],
    createdAt: Date.now(),
  }
  await db.create(COLLECTIONS.notifications, doc, doc.id)
  created.push(doc)
  return created
}

/** Every notification the given user should see, newest first. */
export async function listForUser(user: UserProfile): Promise<AppNotification[]> {
  const all = await db.list<AppNotification>(COLLECTIONS.notifications, {
    where: [{ field: 'schoolId', op: '==', value: user.schoolId }],
    orderBy: [{ field: 'createdAt', dir: 'desc' }],
    limit: 200,
  })
  return all.filter(
    (n) =>
      (n.audience === 'user' && n.userId === user.id) ||
      (n.audience === 'role' && n.role === user.role)
  )
}

export function unreadCount(items: AppNotification[], userId: string): number {
  return items.filter((n) => !n.readBy?.includes(userId)).length
}

export async function markRead(ids: string[], userId: string): Promise<void> {
  for (const id of ids) {
    const doc = await db.get<AppNotification>(COLLECTIONS.notifications, id)
    if (!doc) continue
    const readBy = doc.readBy ?? []
    if (readBy.includes(userId)) continue
    await db.update(COLLECTIONS.notifications, id, { readBy: [...readBy, userId] })
  }
}

export async function markAllRead(items: AppNotification[], userId: string): Promise<void> {
  await markRead(
    items.filter((n) => !n.readBy?.includes(userId)).map((n) => n.id),
    userId
  )
}
