import { useMemo, useState } from 'react'
import { ClipboardCheck, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { COLLECTIONS } from '@/services/db'
import type { AttendanceRecord, UserProfile } from '@/services/types'
import { useCollection } from '@/hooks/useCollection'
import { classOptions, sectionsFor, useSchoolData, useStudentRoster } from '@/hooks/useSchoolData'
import { summarise } from '@/services/attendance'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageHeader, StatTile } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Badge'
import { Input, Select } from '@/components/ui/Input'
import { EmptyState, LoadingState, Progress } from '@/components/ui/Feedback'
import { monthKey } from '@/utils/date'
import { round1 } from '@/utils/format'

interface MonthBucket {
  present: number
  absent: number
  late: number
  excused: number
  percentage: number
}

function toneFor(pct: number): 'success' | 'warn' | 'danger' {
  if (pct >= 75) return 'success'
  if (pct >= 60) return 'warn'
  return 'danger'
}

export default function AdminAttendance() {
  const { profile } = useAuth()
  const schoolId = profile?.schoolId ?? ''

  const [classId, setClassId] = useState<string>('all')
  const [section, setSection] = useState<string>('all')
  const [month, setMonth] = useState<string>(() => monthKey(new Date()))
  const [sortAsc, setSortAsc] = useState(true)

  const { classes } = useSchoolData(schoolId)
  const roster = useStudentRoster(schoolId, classId)
  const records = useCollection<AttendanceRecord>(
    COLLECTIONS.attendance,
    { where: [{ field: 'schoolId', op: '==', value: schoolId }] },
    [schoolId]
  )

  const recordByStudent = useMemo(() => {
    const map = new Map<string, AttendanceRecord>()
    for (const r of records.data) map.set(r.studentId, r)
    return map
  }, [records.data])

  const rows = useMemo(() => {
    const bucket = (student: UserProfile): MonthBucket => {
      const summary = summarise(recordByStudent.get(student.id) ?? null)
      const fromMonth = summary.monthly[month]
      if (fromMonth) {
        return {
          present: fromMonth.present,
          absent: fromMonth.absent,
          late: fromMonth.late,
          excused: fromMonth.excused,
          percentage: fromMonth.percentage,
        }
      }
      return {
        present: summary.present,
        absent: summary.absent,
        late: summary.late,
        excused: summary.excused,
        percentage: summary.percentage,
      }
    }

    return roster.data
      .filter((s) => section === 'all' || s.section === section)
      .map((student) => ({ student, bucket: bucket(student) }))
      .sort((a, b) => (sortAsc ? a.bucket.percentage - b.bucket.percentage : b.bucket.percentage - a.bucket.percentage))
  }, [roster.data, recordByStudent, month, section, sortAsc])

  const stats = useMemo(() => {
    const tracked = rows.filter((r) => r.bucket.present + r.bucket.absent + r.bucket.late + r.bucket.excused > 0)
    const average = tracked.length
      ? round1(tracked.reduce((sum, r) => sum + r.bucket.percentage, 0) / tracked.length)
      : 0
    const below = tracked.filter((r) => r.bucket.percentage < 75).length
    const perfect = tracked.filter((r) => r.bucket.percentage === 100).length
    return { average, below, perfect }
  }, [rows])

  const columns: Column<{ student: UserProfile; bucket: MonthBucket }>[] = [
    {
      key: 'student',
      header: 'Student',
      cell: ({ student }) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={student.name} src={student.photoUrl} size={32} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{student.name}</p>
            <p className="truncate text-[11px] text-muted">Roll {student.rollNo ?? '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'class',
      header: 'Class',
      hideBelow: 'md',
      cell: ({ student }) => (
        <span className="text-xs text-ink-2">
          Class {student.classLevel ?? '—'}-{student.section ?? '—'}
        </span>
      ),
    },
    {
      key: 'present',
      header: 'Present',
      align: 'right',
      cell: ({ bucket }) => <span className="tabular text-sm font-semibold text-success">{bucket.present}</span>,
    },
    {
      key: 'absent',
      header: 'Absent',
      align: 'right',
      cell: ({ bucket }) => <span className="tabular text-sm text-danger">{bucket.absent}</span>,
    },
    {
      key: 'late',
      header: 'Late',
      align: 'right',
      hideBelow: 'sm',
      cell: ({ bucket }) => <span className="tabular text-sm text-warn">{bucket.late}</span>,
    },
    {
      key: 'excused',
      header: 'Excused',
      align: 'right',
      hideBelow: 'lg',
      cell: ({ bucket }) => <span className="tabular text-sm text-info">{bucket.excused}</span>,
    },
    {
      key: 'percentage',
      header: (
        <button
          type="button"
          onClick={() => setSortAsc((v) => !v)}
          className="inline-flex items-center gap-1 uppercase tracking-wide"
          aria-label={`Sort by attendance percentage ${sortAsc ? 'descending' : 'ascending'}`}
        >
          Attendance %
          {sortAsc ? <ChevronUp className="size-3" aria-hidden /> : <ChevronDown className="size-3" aria-hidden />}
        </button>
      ),
      align: 'right',
      className: 'min-w-32',
      cell: ({ bucket }) => (
        <div className="flex items-center justify-end gap-2">
          <Progress value={bucket.percentage} tone={toneFor(bucket.percentage)} size="sm" className="max-w-24" />
          <span className="tabular w-12 text-right text-sm font-bold text-ink">{bucket.percentage}%</span>
        </div>
      ),
    },
  ]

  if (roster.loading || records.loading) return <LoadingState label="Loading attendance register…" rows={6} />

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Attendance register"
        description="Read-only school-wide attendance. Teachers mark the register from their own classroom page."
        action={<ArrowUpDown className="size-5 text-brand" aria-hidden />}
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Select
          label="Class"
          value={classId}
          onChange={(e) => {
            setClassId(e.target.value)
            setSection('all')
          }}
          options={classOptions(classes)}
          className="h-9 w-auto min-w-32 text-xs font-semibold"
        />
        <Select
          label="Section"
          value={section}
          onChange={(e) => setSection(e.target.value)}
          options={[
            { value: 'all', label: 'All sections' },
            ...sectionsFor(classes, classId).map((s) => ({ value: s, label: `Section ${s}` })),
          ]}
          className="h-9 w-auto min-w-32 text-xs font-semibold"
        />
        <Input
          label="Month"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="h-9 w-auto min-w-40 text-xs font-semibold"
        />
      </div>

      {classId === 'all' ? (
        <EmptyState
          icon={<ClipboardCheck className="size-6" />}
          title="Pick a class to view its register"
          description="Choose a class above and the month-by-month attendance of every student appears here."
        />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-3">
            <StatTile
              label="Class average %"
              value={`${stats.average}%`}
              tone={toneFor(stats.average)}
              hint={`for ${month}`}
            />
            <StatTile label="Students below 75%" value={stats.below} tone={stats.below > 0 ? 'danger' : 'success'} />
            <StatTile label="Perfect attendance" value={stats.perfect} tone="success" />
          </div>

          <DataTable
            rows={rows}
            columns={columns}
            rowKey={({ student }) => student.id}
            empty={{
              title: 'No students in this class',
              description: 'Enrol students from the Students page and they will show up here.',
            }}
            caption="Sorted by attendance percentage, lowest first. Tap the column header to flip the order."
          />
        </>
      )}
    </div>
  )
}