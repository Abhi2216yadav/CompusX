import { useMemo, useState } from 'react'
import { GraduationCap, Layers, Plus, Users } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { COLLECTIONS } from '@/services/db'
import type { ClassRoom, Level, UserProfile } from '@/services/types'
import { useCollection } from '@/hooks/useCollection'
import { CrudModal, useCrudModal, type Draft } from '@/components/crud/CrudShell'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageHeader, SectionCard, StatTile } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { LoadingState } from '@/components/ui/Feedback'

const LEVELS: Level[] = [6, 7, 8, 9, 10, 11, 12]

export default function AdminClasses() {
  const { profile } = useAuth()
  const schoolId = profile?.schoolId ?? ''

  const [levelFilter, setLevelFilter] = useState<string>('all')
  const classes = useCollection<ClassRoom>(
    COLLECTIONS.classes,
    {
      where: [{ field: 'schoolId', op: '==', value: schoolId }],
      orderBy: [{ field: 'classLevel' }],
    },
    [schoolId]
  )
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
  const crud = useCrudModal<ClassRoom>()

  const teacherName = useMemo(() => {
    const map = new Map<string, string>()
    for (const teacher of teachers.data) map.set(teacher.id, teacher.name)
    return map
  }, [teachers.data])

  const stats = useMemo(() => {
    const sections = new Set(classes.data.map((c) => `${c.classLevel}-${c.section}`))
    return {
      total: classes.data.length,
      enrolled: classes.data.reduce((sum, c) => sum + (c.studentCount ?? 0), 0),
      sections: sections.size,
    }
  }, [classes.data])

  const groups = useMemo(() => {
    const byLevel = new Map<Level, ClassRoom[]>()
    for (const room of classes.data) {
      const bucket = byLevel.get(room.classLevel)
      if (bucket) bucket.push(room)
      else byLevel.set(room.classLevel, [room])
    }
    return [...byLevel.entries()]
      .filter(([level]) => levelFilter === 'all' || String(level) === levelFilter)
      .sort((a, b) => a[0] - b[0])
      .map(([level, rooms]) => ({
        level,
        rooms: [...rooms].sort((a, b) => a.section.localeCompare(b.section)),
      }))
  }, [classes.data, levelFilter])

  function buildClass(draft: Draft): Record<string, unknown> {
    const level = Number(draft.classLevel ?? 10)
    const name = String(draft.name ?? '').trim() || `Class ${level}`
    const homeroomTeacherId = String(draft.homeroomTeacherId ?? '')
    return {
      ...(crud.editing ?? {}),
      schoolId,
      name,
      classLevel: level,
      section: String(draft.section ?? '').trim() || 'A',
      academicYear:
        String(draft.academicYear ?? '').trim() || profile?.academicYear || '',
      homeroomTeacherId: homeroomTeacherId || undefined,
      studentCount: Math.max(0, Number(draft.studentCount ?? 0)),
      ...(crud.editing ? {} : { createdAt: Date.now() }),
    }
  }

  const columns: Column<ClassRoom>[] = [
    {
      key: 'class',
      header: 'Class',
      cell: (c) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
          <p className="truncate text-[11px] text-muted">{c.academicYear}</p>
        </div>
      ),
    },
    {
      key: 'level',
      header: 'Level',
      cell: (c) => <span className="tabular">Class {c.classLevel}</span>,
    },
    {
      key: 'section',
      header: 'Section',
      cell: (c) => <span className="tabular font-semibold text-ink">{c.section}</span>,
    },
    {
      key: 'students',
      header: 'Students',
      align: 'right',
      cell: (c) => <span className="tabular text-xs">{c.studentCount ?? 0}</span>,
    },
    {
      key: 'homeroom',
      header: 'Homeroom teacher',
      hideBelow: 'md',
      cell: (c) =>
        c.homeroomTeacherId ? (
          (teacherName.get(c.homeroomTeacherId) ?? 'Unknown teacher')
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (c) => (
        <Button size="sm" variant="secondary" onClick={() => crud.edit(c)}>
          Edit
        </Button>
      ),
    },
  ]

  const loading = classes.loading || teachers.loading

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Classes"
        description="Every class and section in your school, grouped by class level."
        action={
          <Button size="sm" icon={<Plus className="size-4" />} onClick={crud.create}>
            New class
          </Button>
        }
      />

      {loading ? (
        <LoadingState label="Loading classes…" rows={6} />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-3">
            <StatTile
              label="Classes"
              value={stats.total}
              hint="class + section pairs"
              icon={<GraduationCap className="size-4" />}
            />
            <StatTile
              label="Students enrolled"
              value={stats.enrolled}
              hint="sum of class strength"
              icon={<Users className="size-4" />}
              tone="success"
            />
            <StatTile
              label="Sections"
              value={stats.sections}
              hint="across all levels"
              icon={<Layers className="size-4" />}
              tone="info"
            />
          </div>

          <div className="mb-4">
            <Select
              aria-label="Filter by class level"
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All levels' },
                ...LEVELS.map((l) => ({ value: String(l), label: `Class ${l}` })),
              ]}
              className="h-9 w-auto min-w-32 text-xs font-semibold"
            />
          </div>

          {groups.length === 0 ? (
            <DataTable
              rows={[]}
              columns={columns}
              rowKey={(c) => c.id}
              empty={{
                title: classes.data.length ? 'No classes at this level' : 'No classes yet',
                description: classes.data.length
                  ? 'Pick another class level from the filter above.'
                  : 'Create your first class to start enrolling students.',
                action: (
                  <Button size="sm" onClick={crud.create}>
                    Create a class
                  </Button>
                ),
              }}
            />
          ) : (
            <div className="space-y-4">
              {groups.map((group) => (
                <SectionCard
                  key={group.level}
                  title={`Class ${group.level}`}
                  subtitle={`${group.rooms.length} section${group.rooms.length === 1 ? '' : 's'}`}
                  icon={<GraduationCap className="size-4" />}
                  action={
                    <Button size="sm" variant="secondary" onClick={crud.create}>
                      Add section
                    </Button>
                  }
                >
                  <DataTable
                    rows={group.rooms}
                    columns={columns}
                    rowKey={(c) => c.id}
                    className="shadow-none"
                    empty={{ title: 'No sections at this level' }}
                  />
                </SectionCard>
              ))}
            </div>
          )}

          <CrudModal<ClassRoom>
            open={crud.open}
            editing={crud.editing}
            title={crud.editing ? `Edit ${crud.editing.name}` : 'New class'}
            description="Classes group students into a level and section for attendance, tests and reports."
            collection={COLLECTIONS.classes}
            deleteLabel="class"
            build={buildClass}
            fields={(d, set) => (
              <>
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <Input
                    label="Class name"
                    value={String(d.name ?? '')}
                    onChange={(e) => set({ name: e.target.value })}
                    placeholder="Class 10"
                    hint="Left blank it becomes “Class {level}”."
                  />
                  <Select
                    label="Class level"
                    required
                    value={String(d.classLevel ?? 10)}
                    onChange={(e) => set({ classLevel: Number(e.target.value) })}
                    options={LEVELS.map((l) => ({ value: String(l), label: `Class ${l}` }))}
                  />
                </div>
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <Input
                    label="Section"
                    value={String(d.section ?? '')}
                    onChange={(e) => set({ section: e.target.value })}
                    placeholder="A"
                  />
                  <Input
                    label="Academic year"
                    value={String(d.academicYear ?? profile?.academicYear ?? '')}
                    onChange={(e) => set({ academicYear: e.target.value })}
                    placeholder="2026-27"
                  />
                </div>
                <Select
                  label="Homeroom teacher"
                  value={String(d.homeroomTeacherId ?? '')}
                  onChange={(e) => set({ homeroomTeacherId: e.target.value })}
                  options={[
                    { value: '', label: 'No homeroom teacher' },
                    ...teachers.data.map((t) => ({ value: t.id, label: t.name })),
                  ]}
                />
                <Input
                  label="Student count"
                  type="number"
                  min={0}
                  value={String(d.studentCount ?? 0)}
                  onChange={(e) => set({ studentCount: e.target.value })}
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
