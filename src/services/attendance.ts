/**
 * Attendance.
 * Stored as one aggregate document per student (see `AttendanceRecord`), so a
 * teacher marking a whole class performs one batched write instead of dozens.
 * Attendance is intentionally NOT part of the leaderboard score.
 */
import type { AttendanceRecord, AttendanceStatus, UserProfile } from '@/services/types'
import { COLLECTIONS } from '@/services/db'
import { db } from './index'
import { dateKey, monthKey } from '@/utils/date'
import { round1 } from '@/utils/format'

export interface AttendanceSummary {
  totalClasses: number
  present: number
  absent: number
  late: number
  excused: number
  percentage: number
  monthly: Record<string, { total: number; present: number; absent: number; late: number; excused: number; percentage: number }>
  recent: AttendanceRecord['recent']
}

export function summarise(record: AttendanceRecord | null): AttendanceSummary {
  if (!record) {
    return {
      totalClasses: 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      percentage: 0,
      monthly: {},
      recent: [],
    }
  }
  const monthly: AttendanceSummary['monthly'] = {}
  for (const [key, raw] of Object.entries(record.monthly)) {
    const value = raw as AttendanceRecord['monthly'][string]
    const counted = value.present + value.late
    monthly[key] = {
      ...value,
      percentage: value.total ? Math.round((counted / value.total) * 1000) / 10 : 0,
    }
  }
  return {
    totalClasses: record.totalClasses,
    present: record.present,
    absent: record.absent,
    late: record.late,
    excused: record.excused,
    percentage: record.percentage,
    monthly,
    recent: record.recent,
  }
}

/**
 * Marks one day for a batch of students in a single batched write.
 * Re-marking the same date replaces the previous status instead of double counting.
 */
export async function markAttendance(params: {
  schoolId: string
  classId: string
  classLevel: number
  section: string
  date: string
  marks: { studentId: string; status: AttendanceStatus }[]
  markedBy: UserProfile
}): Promise<void> {
  const day = params.date
  const month = monthKey(new Date(day))
  const dayKey = dateKey(new Date(day))

  const reads = await Promise.all(
    params.marks.map((m) => db.get<AttendanceRecord>(COLLECTIONS.attendance, m.studentId))
  )

  const writes = params.marks.map((mark, i) => {
    const existing = reads[i]
    const recent = [...(existing?.recent ?? [])].filter((r) => r.date !== dayKey)
    recent.push({ date: dayKey, status: mark.status })

    const monthly = { ...(existing?.monthly ?? {}) }
    const bucket = {
      ...(monthly[month] ?? { total: 0, present: 0, absent: 0, late: 0, excused: 0 }),
    }
    // Remove a prior mark for this date, then apply the new one.
    const prior = existing?.recent.find((r) => r.date === dayKey)
    if (prior) {
      bucket.total -= 1
      bucket[prior.status] -= 1
    }
    bucket.total += 1
    bucket[mark.status] += 1
    monthly[month] = bucket

    const totals = Object.values(monthly).reduce(
      (acc, m) => ({
        totalClasses: acc.totalClasses + m.total,
        present: acc.present + m.present,
        absent: acc.absent + m.absent,
        late: acc.late + m.late,
        excused: acc.excused + m.excused,
      }),
      { totalClasses: 0, present: 0, absent: 0, late: 0, excused: 0 }
    )

    const counted = totals.present + totals.late
    const next: AttendanceRecord = {
      id: mark.studentId,
      schoolId: params.schoolId,
      studentId: mark.studentId,
      classId: params.classId,
      classLevel: params.classLevel,
      section: params.section,
      monthly,
      recent: recent.slice(-25),
      ...totals,
      percentage: totals.totalClasses
        ? round1((counted / totals.totalClasses) * 100)
        : 0,
      updatedAt: Date.now(),
    }

    return { type: 'set' as const, collection: COLLECTIONS.attendance, id: mark.studentId, data: next as unknown as Record<string, unknown> }
  })

  await db.writeBatch(writes)
}

/** Last date the teacher already marked, so the form can resume. */
export async function lastMarkedDate(studentId: string): Promise<string | null> {
  const record = await db.get<AttendanceRecord>(COLLECTIONS.attendance, studentId)
  const last = record?.recent?.[record.recent.length - 1]
  return last?.date ?? null
}
