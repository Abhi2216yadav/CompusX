import { useMemo } from 'react'
import { BookOpen, UserCheck, UserCog } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { COLLECTIONS } from '@/services/db'
import type { UserProfile } from '@/services/types'
import { useCollection } from '@/hooks/useCollection'
import { useSchoolData } from '@/hooks/useSchoolData'
import { CrudModal, useCrudModal, useRowSearch, type Draft } from '@/components/crud/CrudShell'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageHeader, StatTile } from '@/components/ui/Card'
import { Avatar, Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input, Switch, Textarea } from '@/components/ui/Input'
import { LoadingState } from '@/components/ui/Feedback'

const SEARCH_FIELDS = (teacher: UserProfile): string[] => [
  teacher.name ?? '',
  teacher.email ?? '',
  teacher.designation ?? '',
]

export default function AdminTeachers() {
  const { profile } = useAuth()
  const schoolId = profile?.schoolId ?? ''

  const teachers = useCollection<UserProfile>(
    COLLECTIONS.users,
    {
      where: [
        { field: 'schoolId', op: '==', value: schoolId },
        { field: 'role', op: '==', value: 'teacher' },
      ],
      orderBy: [{ field: 'name' }],
    },
    [schoolId]
  )
  const { subjects, subjectById, loading: structureLoading } = useSchoolData(schoolId)
  const crud = useCrudModal<UserProfile>()

  const search = useRowSearch(teachers.data, SEARCH_FIELDS)
  const rows = search.filtered

  const stats = useMemo(() => {
    const covered = new Set<string>()
    for (const teacher of teachers.data) {
      for (const id of teacher.subjects ?? []) covered.add(id)
    }
    return {
      total: teachers.data.length,
      active: teachers.data.filter((t) => t.isActive).length,
      covered: covered.size,
    }
  }, [teachers.data])

  function buildTeacher(draft: Draft): Record<string, unknown> {
    return {
      ...(crud.editing ?? {}),
      designation: String(draft.designation ?? '').trim(),
      phone: String(draft.phone ?? '').trim(),
      bio: String(draft.bio ?? '').trim(),
      subjects: Array.isArray(draft.subjects) ? (draft.subjects as string[]) : [],
      isActive: draft.isActive ?? true,
      updatedAt: Date.now(),
    }
  }

  const columns: Column<UserProfile>[] = [
    {
      key: 'teacher',
      header: 'Teacher',
      cell: (t) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={t.name} src={t.photoUrl} size={36} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{t.name}</p>
            <p className="truncate text-[11px] text-muted">{t.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'designation',
      header: 'Designation',
      cell: (t) => t.designation || <span className="text-muted">—</span>,
    },
    {
      key: 'subjects',
      header: 'Subjects',
      hideBelow: 'md',
      cell: (t) => {
        const ids = t.subjects ?? []
        if (!ids.length) return <span className="text-muted">Not assigned</span>
        return (
          <div className="min-w-0">
            <p className="tabular text-xs font-semibold text-ink">
              {ids.length} subject{ids.length === 1 ? '' : 's'}
            </p>
            <p className="truncate text-[11px] text-muted">
              {ids.map((id) => subjectById.get(id)?.name ?? 'Removed').join(', ')}
            </p>
          </div>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      align: 'right',
      cell: (t) => (
        <Badge tone={t.isActive ? 'success' : 'neutral'}>{t.isActive ? 'Active' : 'Inactive'}</Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (t) => (
        <Button size="sm" variant="secondary" onClick={() => crud.edit(t)}>
          Manage
        </Button>
      ),
    },
  ]

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Teachers"
        description="Teaching staff, designations and the subjects each teacher covers."
      />

      {teachers.loading || structureLoading ? (
        <LoadingState label="Loading teachers…" rows={6} />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-3">
            <StatTile
              label="Teachers"
              value={stats.total}
              hint="teaching staff"
              icon={<UserCog className="size-4" />}
            />
            <StatTile
              label="Active"
              value={stats.active}
              hint={`${stats.total - stats.active} inactive`}
              icon={<UserCheck className="size-4" />}
              tone="success"
            />
            <StatTile
              label="Subjects covered"
              value={stats.covered}
              hint={`of ${subjects.length} offered`}
              icon={<BookOpen className="size-4" />}
              tone="info"
            />
          </div>

          <div className="mb-4">
            <div className="sm:max-w-xs">
              <Input
                value={search.query}
                onChange={(e) => search.setQuery(e.target.value)}
                placeholder="Search name, email or designation…"
                aria-label="Search teachers"
                className="h-9"
              />
            </div>
          </div>

          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(t) => t.id}
            onRowClick={(t) => crud.edit(t)}
            empty={{
              title: search.query ? 'No matching teachers' : 'No teachers yet',
              description: search.query
                ? 'Try a different name, email or designation.'
                : 'Teachers appear here once they register with a teacher account.',
            }}
          />

          <CrudModal<UserProfile>
            open={crud.open}
            editing={crud.editing}
            title={crud.editing ? crud.editing.name : 'Teacher'}
            description="Set the designation, contact details and the subjects this teacher covers."
            collection={COLLECTIONS.users}
            build={buildTeacher}
            fields={(d, set) => (
              <>
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <Input
                    label="Designation"
                    value={String(d.designation ?? '')}
                    onChange={(e) => set({ designation: e.target.value })}
                    placeholder="Senior Mathematics Teacher"
                  />
                  <Input
                    label="Phone"
                    value={String(d.phone ?? '')}
                    onChange={(e) => set({ phone: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </div>
                <Textarea
                  label="Bio"
                  rows={4}
                  value={String(d.bio ?? '')}
                  onChange={(e) => set({ bio: e.target.value })}
                  placeholder="Experience, specialities and anything students should know."
                />

                <fieldset>
                  <legend className="cx-label">Subjects</legend>
                  <p className="mb-2 text-xs text-muted">
                    Used to decide which study material and questions this teacher sees.
                  </p>
                  {subjects.length === 0 ? (
                    <p className="text-xs text-muted">No subjects created yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {subjects.map((subject) => {
                        const selected = ((d.subjects as string[] | undefined) ?? []).includes(
                          subject.id
                        )
                        return (
                          <button
                            key={subject.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => {
                              const current = (d.subjects as string[] | undefined) ?? []
                              set({
                                subjects: selected
                                  ? current.filter((id) => id !== subject.id)
                                  : [...current, subject.id],
                              })
                            }}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                              selected
                                ? 'border-brand bg-brand-soft text-brand'
                                : 'border-border bg-surface-2 text-muted hover:text-ink'
                            }`}
                          >
                            <span
                              className="size-2 rounded-full"
                              style={{ backgroundColor: subject.color }}
                              aria-hidden
                            />
                            {subject.name}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </fieldset>

                <Switch
                  checked={Boolean(d.isActive ?? true)}
                  onChange={(v) => set({ isActive: v })}
                  label="Active account"
                  description="Inactive teachers cannot sign in to CampusX."
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
