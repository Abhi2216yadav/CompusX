import { useMemo, useState } from 'react'
import { GraduationCap, UserCheck, Users, UserX } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { COLLECTIONS } from '@/services/db'
import type { UserProfile } from '@/services/types'
import {
  classOptions,
  useSaver,
  useSchoolData,
  useStudentRoster,
} from '@/hooks/useSchoolData'
import { CrudModal, useCrudModal, useRowSearch, type Draft } from '@/components/crud/CrudShell'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageHeader, StatTile } from '@/components/ui/Card'
import { Avatar, Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input, Select, Switch } from '@/components/ui/Input'
import { LoadingState } from '@/components/ui/Feedback'

const SEARCH_FIELDS = (student: UserProfile): string[] => [
  student.name ?? '',
  student.email ?? '',
  student.rollNo ?? '',
]

export default function AdminStudents() {
  const { profile } = useAuth()
  const schoolId = profile?.schoolId ?? ''

  const [classFilter, setClassFilter] = useState<string>('all')
  const roster = useStudentRoster(schoolId, classFilter)
  const { classes, loading: structureLoading } = useSchoolData(schoolId)
  const { save } = useSaver()
  const crud = useCrudModal<UserProfile>()

  const search = useRowSearch(roster.data, SEARCH_FIELDS)
  const rows = search.filtered

  const stats = useMemo(() => {
    const sections = new Set(
      roster.data.map((s) => s.classId).filter((id): id is string => Boolean(id))
    )
    return {
      total: roster.data.length,
      active: roster.data.filter((s) => s.isActive).length,
      sections: sections.size,
    }
  }, [roster.data])

  const classChoices = useMemo(
    () => classOptions(classes).filter((o) => o.value !== 'all'),
    [classes]
  )

  function buildStudent(draft: Draft): Record<string, unknown> {
    const classId = String(draft.classId ?? '')
    const match = classes.find((c) => c.id === classId)
    return {
      ...(crud.editing ?? {}),
      classId: classId || undefined,
      classLevel: match?.classLevel,
      section: String(draft.section ?? '').trim() || match?.section || undefined,
      rollNo: String(draft.rollNo ?? '').trim(),
      phone: String(draft.phone ?? '').trim(),
      isActive: draft.isActive ?? true,
      updatedAt: Date.now(),
    }
  }

  const columns: Column<UserProfile>[] = [
    {
      key: 'student',
      header: 'Student',
      cell: (s) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={s.name} src={s.photoUrl} size={36} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{s.name}</p>
            <p className="truncate text-[11px] text-muted">Roll no {s.rollNo || '—'}</p>
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
      cell: (s) => <span className="truncate text-xs">{s.email}</span>,
    },
    {
      key: 'phone',
      header: 'Phone',
      hideBelow: 'lg',
      cell: (s) => s.phone || <span className="text-muted">—</span>,
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
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant={s.isActive ? 'ghost' : 'secondary'}
            icon={<UserX className="size-3.5" />}
            onClick={() =>
              void save(
                COLLECTIONS.users,
                { ...s, isActive: !s.isActive, updatedAt: Date.now() },
                {
                  id: s.id,
                  success: s.isActive
                    ? `${s.name} deactivated`
                    : `${s.name} reactivated`,
                }
              )
            }
          >
            {s.isActive ? 'Deactivate' : 'Reactivate'}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => crud.edit(s)}>
            Manage
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Students"
        description="Every student in your school. Update class placement, roll numbers and account status."
      />

      {roster.loading || structureLoading ? (
        <LoadingState label="Loading students…" rows={6} />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-3">
            <StatTile
              label="Students"
              value={stats.total}
              hint="across all classes"
              icon={<Users className="size-4" />}
            />
            <StatTile
              label="Active"
              value={stats.active}
              hint={`${stats.total - stats.active} inactive`}
              icon={<UserCheck className="size-4" />}
              tone="success"
            />
            <StatTile
              label="Sections"
              value={stats.sections}
              hint="distinct classes assigned"
              icon={<GraduationCap className="size-4" />}
              tone="info"
            />
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
              title: search.query ? 'No matching students' : 'No students yet',
              description: search.query
                ? 'Try a different name, email or roll number.'
                : 'Students appear here once they sign up or are enrolled.',
            }}
          />

          <CrudModal<UserProfile>
            open={crud.open}
            editing={crud.editing}
            title={crud.editing ? crud.editing.name : 'Student'}
            description="Place the student in a class and keep their contact details current."
            size="md"
            collection={COLLECTIONS.users}
            build={buildStudent}
            fields={(d, set) => (
              <>
                <Select
                  label="Class"
                  placeholder="Not assigned"
                  value={String(d.classId ?? '')}
                  onChange={(e) => {
                    const match = classes.find((c) => c.id === e.target.value)
                    set({
                      classId: e.target.value,
                      classLevel: match?.classLevel,
                      section: match?.section ?? '',
                    })
                  }}
                  options={classChoices}
                  hint="Section and class level are filled in automatically."
                />
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <Input
                    label="Section"
                    value={String(d.section ?? '')}
                    onChange={(e) => set({ section: e.target.value })}
                    placeholder="A"
                  />
                  <Input
                    label="Roll number"
                    value={String(d.rollNo ?? '')}
                    onChange={(e) => set({ rollNo: e.target.value })}
                    placeholder="12"
                  />
                </div>
                <Input
                  label="Phone"
                  value={String(d.phone ?? '')}
                  onChange={(e) => set({ phone: e.target.value })}
                  placeholder="+91 98765 43210"
                />
                <Switch
                  checked={Boolean(d.isActive ?? true)}
                  onChange={(v) => set({ isActive: v })}
                  label="Active account"
                  description="Inactive students cannot sign in to CampusX."
                />
              </>
            )}
            onClose={crud.close}
          />
        </>
      )}
    </div>
  )
}
