import { useState } from 'react'
import { Users } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { COLLECTIONS } from '@/services/db'
import type { UserProfile } from '@/services/types'
import { useSchoolData, classOptions, useStudentRoster } from '@/hooks/useSchoolData'
import { CrudModal, useCrudModal, useRowSearch, type Draft } from '@/components/crud/CrudShell'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageHeader, StatTile } from '@/components/ui/Card'
import { Avatar, Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea, Switch } from '@/components/ui/Input'
import { LoadingState } from '@/components/ui/Feedback'

const SEARCH_FIELDS = (student: UserProfile): string[] => [
  student.name ?? '',
  student.email ?? '',
  student.rollNo ?? '',
]

export default function TeacherStudents() {
  const { profile } = useAuth()
  const schoolId = profile?.schoolId ?? ''

  const [classFilter, setClassFilter] = useState<string>('all')
  const roster = useStudentRoster(schoolId, classFilter)
  const { classes, loading: structureLoading } = useSchoolData(schoolId)
  const crud = useCrudModal<UserProfile>()

  const search = useRowSearch(roster.data, SEARCH_FIELDS)
  const rows = search.filtered

  const activeCount = roster.data.filter((s) => s.isActive).length
  const sections = new Set(classes.map((c) => c.section)).size

  function buildStudent(draft: Draft): Record<string, unknown> {
    return {
      ...(crud.editing ?? {}),
      phone: String(draft.phone ?? '').trim(),
      bio: String(draft.bio ?? '').trim(),
      isActive: Boolean(draft.isActive),
      updatedAt: Date.now(),
    }
  }

  const columns: Column<UserProfile>[] = [
    {
      key: 'name',
      header: 'Student',
      cell: (s) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={s.name} src={s.photoUrl} size={36} />
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
      cell: (s) => (s.classLevel ? `Class ${s.classLevel}-${s.section ?? '—'}` : '—'),
    },
    {
      key: 'email',
      header: 'Email',
      hideBelow: 'md',
      cell: (s) => <span className="text-xs">{s.email}</span>,
    },
    {
      key: 'phone',
      header: 'Phone',
      hideBelow: 'lg',
      cell: (s) => s.phone ?? <span className="text-muted">—</span>,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'right',
      cell: (s) => (
        <Badge tone={s.isActive ? 'success' : 'neutral'}>{s.isActive ? 'Active' : 'Inactive'}</Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (s) => (
        <Button size="sm" variant="secondary" onClick={() => crud.edit(s)}>
          Manage
        </Button>
      ),
    },
  ]

  if (roster.loading || structureLoading) return <LoadingState label="Loading students…" rows={5} />

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Students"
        description="Your class roster. Update contact details and deactivate accounts when needed."
      />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatTile label="Total students" value={roster.data.length} icon={<Users className="size-4" />} />
        <StatTile label="Active" value={activeCount} tone="success" />
        <StatTile label="Sections" value={sections} tone="info" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1 sm:max-w-xs">
          <Input
            value={search.query}
            onChange={(e) => search.setQuery(e.target.value)}
            placeholder="Search name, email or roll no…"
            aria-label="Search students"
            className="h-9"
          />
        </div>
        <Select
          aria-label="Filter by class"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          options={classOptions(classes)}
          className="h-9 w-auto min-w-32 text-xs font-semibold"
        />
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(s) => s.id}
        onRowClick={(s) => crud.edit(s)}
        empty={{
          title: 'No students found',
          description: search.query
            ? 'Try a different name, email or roll number.'
            : 'No students are enrolled in this class yet.',
        }}
      />

      <CrudModal<UserProfile>
        open={crud.open}
        editing={crud.editing}
        title={crud.editing ? crud.editing.name : 'Student'}
        description={
          crud.editing?.role === 'teacher'
            ? `${crud.editing.subjects?.length ?? 0} subject${
                (crud.editing.subjects?.length ?? 0) === 1 ? '' : 's'
              } taught`
            : 'Update this student’s contact details.'
        }
        collection={COLLECTIONS.users}
        build={buildStudent}
        fields={(d, set) => (
          <>
            <Input
              label="Phone"
              value={String(d.phone ?? '')}
              onChange={(e) => set({ phone: e.target.value })}
              placeholder="+91 98765 43210"
            />
            <Textarea
              label="Bio"
              rows={4}
              value={String(d.bio ?? '')}
              onChange={(e) => set({ bio: e.target.value })}
              placeholder="Anything teachers and classmates should know."
            />
            <Switch
              checked={Boolean(d.isActive)}
              onChange={(v) => set({ isActive: v })}
              label="Active account"
              description="Inactive students cannot sign in."
            />
          </>
        )}
        onClose={crud.close}
      />
    </div>
  )
}