import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { CalendarCheck, CheckCheck, ClipboardCheck, Save } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { COLLECTIONS } from '@/services/db'
import type { AttendanceRecord, AttendanceStatus, UserProfile } from '@/services/types'
import { useCollection } from '@/hooks/useCollection'
import { classOptions, useSchoolData, useStudentRoster } from '@/hooks/useSchoolData'
import { markAttendance } from '@/services/attendance'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageHeader, StatTile } from '@/components/ui/Card'
import { Avatar, Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { EmptyState, LoadingState } from '@/components/ui/Feedback'
import { dateKey, formatDateLong } from '@/utils/date'

const STATUSES: AttendanceStatus[] = ['present', 'absent', 'late', 'excused']

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  excused: 'Excused',
}

const STATUS_TONE: Record<AttendanceStatus, 'success' | 'danger' | 'warn' | 'info'> = {
  present: 'success',
  absent: 'danger',
  late: 'warn',
  excused: 'info',
}

const STATUS_PILL: Record<AttendanceStatus, string> = {
  present: 'bg-success-soft text-success',
  absent: 'bg-danger-soft text-danger',
  late: 'bg-warn-soft text-warn',
  excused: 'bg-info-soft text-info',
}

type Marks = Record<string, AttendanceStatus>

export default function TeacherAttendance() {
  const { profile } = useAuth()
  const schoolId = profile?.schoolId ?? ''

  const [classId, setClassId] = useState<string>('all')
  const [date, setDate] = useState<string>(() => dateKey(new Date()))
  const [marks, setMarks] = useState<Marks>({})
  const [saving, setSaving] = useState(false)

  const { classes, classById } = useSchoolData(schoolId)
  const roster = useStudentRoster(schoolId, classId)
  const records = useCollection<AttendanceRecord>(
    COLLECTIONS.attendance,
    { where: [{ field: 'schoolId', op: '==', value: schoolId }] },
    [schoolId]
  )

  /** Status already stored for the chosen date, so re-marking starts from truth. */
  const stored = useMemo(() => {
    const map = new Map<string, AttendanceStatus>()
    for (const rec of records.data) {
      const entry = rec.recent?.find((r) => r.date === date)
      if (entry) map.set(rec.studentId, entry.status)
    }
    return map
  }, [records.data, date])

  /** Switching date or class resets the sheet to what is already on record. */
  const seed = useMemo(() => {
    const next: Marks = {}
    for (const student of roster.data) {
      const status = stored.get(student.id)
      if (status) next[student.id] = status
    }
    return next
  }, [roster.data, stored])

  const seedKey = useMemo(() => JSON.stringify(seed), [seed])

  useEffect(() => {
    if (!roster.loading && !records.loading) setMarks(seed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey, roster.loading, records.loading])

  const selectedClass = classById.get(classId)
  const marked = Object.keys(marks).length
  const total = roster.data.length
  const complete = total > 0 && marked === total

  const counts = useMemo(() => {
    const next: Record<AttendanceStatus, number> = { present: 0, absent: 0, late: 0, excused: 0 }
    for (const status of Object.values(marks)) next[status] += 1
    return next
  }, [marks])

  function setStatus(studentId: string, status: AttendanceStatus) {
    setMarks((current) => {
      const next = { ...current }
      if (next[studentId] === status) delete next[studentId]
      else next[studentId] = status
      return next
    })
  }

  function setAll(status: AttendanceStatus) {
    const next: Marks = {}
    for (const student of roster.data) next[student.id] = status
    setMarks(next)
  }

  async function handleSave() {
    if (!profile || !selectedClass || !complete) return
    setSaving(true)
    try {
      await markAttendance({
        schoolId: profile.schoolId,
        classId: selectedClass.id,
        classLevel: Number(selectedClass.classLevel),
        section: selectedClass.section,
        date,
        marks: Object.entries(marks).map(([studentId, status]) => ({ studentId, status })),
        markedBy: profile,
      })
      toast.success(`Attendance saved for ${formatDateLong(new Date(date))}`)
      setMarks({})
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save attendance.')
    } finally {
      setSaving(false)
    }
  }

  const columns: Column<UserProfile>[] = [
    {
      key: 'student',
      header: 'Student',
      cell: (s) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={s.name} src={s.photoUrl} size={34} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{s.name}</p>
            <p className="truncate text-[11px] text-muted">Roll {s.rollNo ?? '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'class',
      header: 'Class',
      hideBelow: 'lg',
      cell: (s) => (s.classLevel ? `Class ${s.classLevel}-${s.section ?? '—'}` : '—'),
    },
    {
      key: 'saved',
      header: 'On record',
      hideBelow: 'lg',
      cell: (s) => {
        const status = stored.get(s.id)
        return status ? (
          <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
        ) : (
          <span className="text-xs text-muted">Not marked yet</span>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      align: 'right',
      cell: (s) => {
        const current = marks[s.id]
        return (
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {STATUSES.map((status) => {
              const active = current === status
              return (
                <button
                  key={status}
                  type="button"
                  aria-pressed={active}
                  aria-label={`Mark ${s.name} ${STATUS_LABEL[status].toLowerCase()}`}
                  onClick={() => setStatus(s.id, status)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    active ? STATUS_PILL[status] : 'bg-surface-2 text-muted hover:text-ink'
                  }`}
                >
                  {STATUS_LABEL[status]}
                </button>
              )
            })}
          </div>
        )
      },
    },
  ]

  if (roster.loading || records.loading) return <LoadingState label="Loading roster…" rows={6} />

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Attendance"
        description="Mark a class in one pass. Re-marking a date replaces the earlier entry."
        action={
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <CalendarCheck className="size-4 text-brand" aria-hidden />
            {formatDateLong(new Date(date))}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 sm:max-w-xs">
          <Select
            label="Class"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            options={classOptions(classes)}
            className="h-9 w-auto min-w-32 text-xs font-semibold"
          />
        </div>
        <Input
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-9 w-auto min-w-40 text-xs font-semibold"
        />
      </div>

      {classId === 'all' || !selectedClass ? (
        <EmptyState
          icon={<ClipboardCheck className="size-6" />}
          title="Pick a class to start"
          description="Choose the class you are marking today and the full roster appears here."
        />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-3">
            <StatTile label="Present" value={counts.present} tone="success" icon={<CheckCheck className="size-4" />} />
            <StatTile label="Absent" value={counts.absent} tone="danger" />
            <StatTile label="Late" value={counts.late} tone="warn" />
          </div>

          <DataTable
            rows={roster.data}
            columns={columns}
            rowKey={(s) => s.id}
            empty={{
              title: 'No students in this class',
              description: 'Enrol students from the Students page and they will show up here.',
            }}
            caption="Tap the active status again to clear a student."
          />

          <div className="sticky bottom-3 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface/95 px-4 py-3 shadow-card backdrop-blur">
            <div className="flex items-center gap-3">
              <p className="tabular text-sm font-semibold text-ink">
                Marked {marked} of {total}
              </p>
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => setAll('present')}>
                  All present
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAll('absent')}>
                  All absent
                </Button>
              </div>
            </div>
            <Button
              size="sm"
              icon={<Save className="size-4" />}
              loading={saving}
              disabled={!complete}
              onClick={() => void handleSave()}
            >
              Save attendance
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
