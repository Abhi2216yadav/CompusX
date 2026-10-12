/**
 * Date helpers that tolerate every storage format CampusX uses:
 * Firestore `Timestamp`, ISO string, epoch milliseconds, Date.
 */

export function toDate(value: unknown): Date {
  if (value == null) return new Date(0)
  if (value instanceof Date) return value
  if (typeof value === 'number') return new Date(value)
  if (typeof value === 'string') return new Date(value)
  const maybe = value as { toDate?: () => Date; seconds?: number; _seconds?: number }
  if (typeof maybe.toDate === 'function') return maybe.toDate()
  if (typeof maybe.seconds === 'number') return new Date(maybe.seconds * 1000)
  if (typeof maybe._seconds === 'number') return new Date(maybe._seconds * 1000)
  return new Date(0)
}

export function toMillis(value: unknown): number {
  return toDate(value).getTime()
}

export const DAY_MS = 86_400_000

export function startOfDay(input: Date | number): Date {
  const d = new Date(input)
  d.setHours(0, 0, 0, 0)
  return d
}

export function startOfWeek(input: Date | number): Date {
  const d = startOfDay(input)
  // Monday-first weeks.
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  return d
}

export function startOfMonth(input: Date | number): Date {
  const d = startOfDay(input)
  d.setDate(1)
  return d
}

/** `2026-W07` (ISO week, Monday-first) */
export function weekKey(input: Date | number): string {
  const d = new Date(startOfWeek(input))
  const thursday = new Date(d)
  thursday.setDate(d.getDate() + 3)
  const isoYear = thursday.getFullYear()
  const firstThursday = new Date(isoYear, 0, 4)
  const week =
    1 +
    Math.round(
      ((thursday.getTime() - startOfWeek(firstThursday).getTime()) / DAY_MS) / 7
    )
  return `${isoYear}-W${String(week).padStart(2, '0')}`
}

/** `2026-03` */
export function monthKey(input: Date | number): string {
  const d = new Date(input)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function dateKey(input: Date | number): string {
  const d = new Date(input)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** `5 Mar 2026` */
export function formatDate(value: unknown, opts?: { withYear?: boolean }): string {
  const d = toDate(value)
  if (d.getTime() === 0) return '—'
  const month = MONTHS[d.getMonth()].slice(0, 3)
  return opts?.withYear === false
    ? `${d.getDate()} ${month}`
    : `${d.getDate()} ${month} ${d.getFullYear()}`
}

export function formatDateLong(value: unknown): string {
  const d = toDate(value)
  if (d.getTime() === 0) return '—'
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function formatTime(value: unknown): string {
  const d = toDate(value)
  if (d.getTime() === 0) return '—'
  let h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${m} ${ap}`
}

export function formatDateTime(value: unknown): string {
  return `${formatDate(value)} · ${formatTime(value)}`
}

/** Human relative time: `just now`, `5m ago`, `3d ago`, then a date. */
export function relativeTime(value: unknown): string {
  const ms = toMillis(value)
  if (!ms) return '—'
  const diff = Date.now() - ms
  const abs = Math.abs(diff)
  const future = diff < 0
  const units: [number, string][] = [
    [60_000, 'm'],
    [3_600_000, 'h'],
    [DAY_MS, 'd'],
  ]
  if (abs < 60_000) return 'just now'
  for (const [unitMs, suffix] of units) {
    if (abs < unitMs * 60) {
      const n = Math.floor(abs / unitMs)
      return future ? `in ${n}${suffix}` : `${n}${suffix} ago`
    }
  }
  return formatDate(ms)
}

/** `3 days left` / `2 days ago` — used for assignment deadlines. */
export function daysUntil(value: unknown): number {
  return Math.ceil((toMillis(value) - Date.now()) / DAY_MS)
}

export function deadlineLabel(value: unknown): string {
  const days = daysUntil(value)
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  return `${days} days left`
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  if (m > 0) return `${m}m ${String(sec).padStart(2, '0')}s`
  return `${sec}s`
}

export function greeting(date = new Date()): string {
  const h = date.getHours()
  if (h < 5) return 'Good night'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}
