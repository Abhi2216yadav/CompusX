import { useMemo, useState } from 'react'
import {
  BookOpen,
  GraduationCap,
  KeyRound,
  Trash2,
  UserCheck,
  UserCog,
  UserPlus,
  UserX,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { useAuth } from '@/context/AuthContext'
import { COLLECTIONS } from '@/services/db'
import type { UserProfile } from '@/services/types'
import { deleteTeacher, sendTeacherInvite } from '@/services/teachers'
import { useCollection } from '@/hooks/useCollection'
import { useSaver, useSchoolData } from '@/hooks/useSchoolData'
import { useRowSearch } from '@/components/crud/CrudShell'
import { TeacherFormModal } from '@/components/teachers/TeacherFormModal'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageHeader, StatTile } from '@/components/ui/Card'
import { Avatar, Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingState } from '@/components/ui/Feedback'
import { ConfirmDialog } from '@/components/ui/Modal'

const SEARCH_FIELDS = (teacher: UserProfile): string[] => [
  teacher.name ?? '',
  teacher.email ?? '',
  teacher.teacherId ?? '',
  teacher.designation ?? '',
  teacher.phone ?? '',
]

export default function AdminTeachers() {
  const { profile } = useAuth()
  const schoolId = profile?.schoolId ?? ''
  const academicYear = profile?.academicYear ?? ''

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
  const { subjects, classes, subjectById, loading: structureLoading } = useSchoolData(schoolId)
  const { save } = useSaver()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<UserProfile | null>(null)
  const [pendingDelete, setPendingDelete] = useState<UserProfile | null>(null)
  const [deleting, setDeleting] = useState(false)

  const search = useRowSearch(teachers.data, SEARCH_FIELDS)
  const rows = search.filtered

  const stats = useMemo(() => {
    const covered = new Set<string>()
    const assigned = new Set<UserProfile>()
    for (const teacher of teachers.data) {
      for (const id of teacher.subjects ?? []) covered.add(id)
      if ((teacher.classIds ?? []).length) assigned.add(teacher)
    }
    return {
      total: teachers.data.length,
      active: teachers.data.filter((t) => t.isActive).length,
      covered: covered.size,
      unassigned: teachers.data.length - assigned.size,
    }
  }, [teachers.data])

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(teacher: UserProfile) {
    setEditing(teacher)
    setFormOpen(true)
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await deleteTeacher(pendingDelete.id)
      toast.success(`${pendingDelete.name} removed`)
      setPendingDelete(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove the teacher.')
    } finally {
      setDeleting(false)
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
      key: 'teacherId',
      header: 'ID',
      hideBelow: 'lg',
      cell: (t) =>
        t.teacherId ? (
          <span className="tabular text-xs font-semibold text-muted">{t.teacherId}</span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: 'designation',
      header: 'Designation',
      hideBelow: 'md',
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
      key: 'classes',
      header: 'Classes',
      hideBelow: 'lg',
      cell: (t) => {
        const ids = t.classIds ?? []
        if (!ids.length) return <span className="text-muted">Not assigned</span>
        return <span className="tabular text-xs font-semibold text-ink">{ids.length}</span>
      },
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      cell: (t) => (
        <Badge tone={t.isActive ? 'success' : 'neutral'}>{t.isActive ? 'Active' : 'Inactive'}</Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (t) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Email ${t.name} a password setup link`}
            title="Send password setup email"
            onClick={() => {
              void sendTeacherInvite(t.email)
                .then(() => toast.success(`Setup email sent to ${t.email}`))
                .catch((e: unknown) =>
                  toast.error(e instanceof Error ? e.message : 'Could not send the email.')
                )
            }}
          >
            <KeyRound className="size-3.5" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={t.isActive ? `Deactivate ${t.name}` : `Reactivate ${t.name}`}
            title={t.isActive ? 'Deactivate' : 'Reactivate'}
            onClick={() =>
              void save(
                COLLECTIONS.users,
                { id: t.id, isActive: !t.isActive, updatedAt: Date.now() },
                {
                  id: t.id,
                  success: t.isActive ? `${t.name} deactivated` : `${t.name} reactivated`,
                }
              )
            }
          >
            {t.isActive ? <UserX className="size-3.5" /> : <UserCheck className="size-3.5" />}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => openEdit(t)}>
            Manage
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Remove ${t.name}`}
            title="Remove teacher"
            className="text-muted hover:text-danger"
            onClick={() => setPendingDelete(t)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Teachers"
        description="Teaching staff, designations, subjects and class assignments."
        action={
          <Button icon={<UserPlus className="size-4" />} onClick={openCreate} disabled={!schoolId}>
            Add teacher
          </Button>
        }
      />

      {teachers.loading || structureLoading ? (
        <LoadingState label="Loading teachers…" rows={6} />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
            <StatTile
              label="No classes yet"
              value={stats.unassigned}
              hint="need class assignments"
              icon={<GraduationCap className="size-4" />}
              tone={stats.unassigned ? 'warn' : 'brand'}
            />
          </div>

          <div className="mb-4 sm:max-w-xs">
            <Input
              value={search.query}
              onChange={(e) => search.setQuery(e.target.value)}
              placeholder="Search name, email, ID or designation…"
              aria-label="Search teachers"
              className="h-9"
            />
          </div>

          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(t) => t.id}
            onRowClick={(t) => openEdit(t)}
            empty={{
              title: search.query ? 'No matching teachers' : 'No teachers yet',
              description: search.query
                ? 'Try a different name, email, ID or designation.'
                : 'Add your first teacher to create their login, subjects and class assignments.',
              action: !search.query ? (
                <Button icon={<UserPlus className="size-4" />} onClick={openCreate}>
                  Add teacher
                </Button>
              ) : undefined,
            }}
          />

          {schoolId && (
            <TeacherFormModal
              open={formOpen}
              onClose={() => setFormOpen(false)}
              schoolId={schoolId}
              academicYear={academicYear}
              createdBy={profile?.id ?? ''}
              editing={editing}
              subjects={subjects}
              classes={classes}
              onSaved={teachers.refresh}
            />
          )}

          <ConfirmDialog
            open={Boolean(pendingDelete)}
            title="Remove teacher?"
            tone="danger"
            confirmLabel="Remove"
            loading={deleting}
            onCancel={() => setPendingDelete(null)}
            onConfirm={() => void confirmDelete()}
            message={
              pendingDelete
                ? `${pendingDelete.name} will lose access to CampusX immediately. Their login account remains, so the email cannot be reused until it is removed from the authentication console.`
                : ''
            }
          />
        </>
      )}
    </div>
  )
}
