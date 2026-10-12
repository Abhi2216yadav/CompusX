import { useMemo, useState } from 'react'
import { BookOpen, Layers, ListOrdered, Plus } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { COLLECTIONS } from '@/services/db'
import type { Chapter, Level, Subject } from '@/services/types'
import { useCollection } from '@/hooks/useCollection'
import { useSchoolData } from '@/hooks/useSchoolData'
import { CrudModal, useCrudModal, type Draft } from '@/components/crud/CrudShell'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageHeader, SectionCard, StatTile } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { LoadingState } from '@/components/ui/Feedback'

const LEVELS: Level[] = [6, 7, 8, 9, 10, 11, 12]
const DEFAULT_COLOR = '#6366f1'

export default function AdminSubjects() {
  const { profile } = useAuth()
  const schoolId = profile?.schoolId ?? ''

  const [chapterSubjectId, setChapterSubjectId] = useState<string>('')

  const subjects = useCollection<Subject>(
    COLLECTIONS.subjects,
    {
      where: [{ field: 'schoolId', op: '==', value: schoolId }],
      orderBy: [{ field: 'name' }],
    },
    [schoolId]
  )
  const { chapters, loading: structureLoading } = useSchoolData(schoolId)
  const crud = useCrudModal<Subject>()
  const chapterCrud = useCrudModal<Chapter>()

  const chaptersBySubject = useMemo(() => {
    const map = new Map<string, Chapter[]>()
    for (const chapter of chapters) {
      const bucket = map.get(chapter.subjectId)
      if (bucket) bucket.push(chapter)
      else map.set(chapter.subjectId, [chapter])
    }
    for (const bucket of map.values()) bucket.sort((a, b) => a.order - b.order)
    return map
  }, [chapters])

  const stats = useMemo(() => {
    let totalChapters = 0
    for (const bucket of chaptersBySubject.values()) totalChapters += bucket.length
    const levelCount = new Set<number>()
    for (const subject of subjects.data) {
      for (const level of subject.classLevels ?? []) levelCount.add(level)
    }
    return { total: subjects.data.length, chapters: totalChapters, levels: levelCount.size }
  }, [subjects.data, chaptersBySubject])

  function buildSubject(draft: Draft): Record<string, unknown> {
    return {
      ...(crud.editing ?? {}),
      schoolId,
      name: String(draft.name ?? '').trim(),
      code: String(draft.code ?? '').trim().toUpperCase(),
      color: String(draft.color ?? DEFAULT_COLOR),
      description: String(draft.description ?? '').trim(),
      classLevels: Array.isArray(draft.classLevels) ? (draft.classLevels as Level[]) : [],
      ...(crud.editing ? {} : { createdAt: Date.now() }),
    }
  }

  function buildChapter(draft: Draft): Record<string, unknown> {
    return {
      ...(chapterCrud.editing ?? {}),
      schoolId,
      subjectId: chapterCrud.editing?.subjectId ?? chapterSubjectId,
      classLevel: Number(draft.classLevel ?? 10),
      name: String(draft.name ?? '').trim(),
      order: Math.max(1, Number(draft.order ?? 1)),
      summary: String(draft.summary ?? '').trim(),
      ...(chapterCrud.editing ? {} : { createdAt: Date.now() }),
    }
  }

  const columns: Column<Subject>[] = [
    {
      key: 'subject',
      header: 'Subject',
      cell: (s) => (
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="size-4 shrink-0 rounded-full ring-2 ring-border"
            style={{ backgroundColor: s.color || DEFAULT_COLOR }}
            aria-hidden
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{s.name}</p>
            <p className="truncate text-[11px] uppercase tracking-wide text-muted">{s.code}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'levels',
      header: 'Levels',
      cell: (s) => (
        <div className="flex flex-wrap gap-1">
          {(s.classLevels ?? []).length === 0 ? (
            <span className="text-xs text-muted">—</span>
          ) : (
            (s.classLevels ?? []).map((level) => (
              <Badge key={level} tone="brand">
                {level}
              </Badge>
            ))
          )}
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      hideBelow: 'lg',
      cell: (s) => <span className="line-clamp-2 text-xs text-muted">{s.description || '—'}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (s) => (
        <Button size="sm" variant="secondary" onClick={() => crud.edit(s)}>
          Edit
        </Button>
      ),
    },
  ]

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Subjects"
        description="What your school teaches, the class levels each subject covers and its chapter plan."
        action={
          <Button size="sm" icon={<Plus className="size-4" />} onClick={crud.create}>
            New subject
          </Button>
        }
      />

      {subjects.loading || structureLoading ? (
        <LoadingState label="Loading subjects…" rows={6} />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-3">
            <StatTile
              label="Subjects"
              value={stats.total}
              hint="across the curriculum"
              icon={<BookOpen className="size-4" />}
            />
            <StatTile
              label="Chapters"
              value={stats.chapters}
              hint="planned so far"
              icon={<ListOrdered className="size-4" />}
              tone="info"
            />
            <StatTile
              label="Levels covered"
              value={stats.levels}
              hint="of classes 6 to 12"
              icon={<Layers className="size-4" />}
              tone="gold"
            />
          </div>

          <div className="mb-5">
            <DataTable
              rows={subjects.data}
              columns={columns}
              rowKey={(s) => s.id}
              empty={{
                title: 'No subjects yet',
                description: 'Add a subject to unlock materials, questions and quizzes for it.',
                action: (
                  <Button size="sm" onClick={crud.create}>
                    Create the first subject
                  </Button>
                ),
              }}
            />
          </div>

          <SectionCard
            title="Chapter plan"
            subtitle="The chapters students see inside each subject"
            icon={<ListOrdered className="size-4" />}
          >
            {subjects.data.length === 0 ? (
              <p className="text-sm text-muted">
                Create a subject first, then add its chapters here.
              </p>
            ) : (
              <ul className="space-y-4">
                {subjects.data.map((subject) => {
                  const rows = chaptersBySubject.get(subject.id) ?? []
                  return (
                    <li key={subject.id} className="rounded-xl border border-border p-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className="size-3.5 shrink-0 rounded-full"
                            style={{ backgroundColor: subject.color || DEFAULT_COLOR }}
                            aria-hidden
                          />
                          <p className="truncate text-sm font-bold text-ink">{subject.name}</p>
                          <span className="tabular shrink-0 text-[11px] text-muted">
                            {rows.length} chapter{rows.length === 1 ? '' : 's'}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<Plus className="size-3.5" />}
                          onClick={() => {
                            setChapterSubjectId(subject.id)
                            chapterCrud.create()
                          }}
                        >
                          Add chapter
                        </Button>
                      </div>

                      {rows.length === 0 ? (
                        <p className="mt-3 text-xs text-muted">No chapters yet</p>
                      ) : (
                        <ul className="mt-3 divide-y divide-border">
                          {rows.map((chapter) => (
                            <li key={chapter.id} className="flex items-center gap-3 py-2">
                              <span className="tabular grid size-6 shrink-0 place-items-center rounded-lg bg-surface-2 text-[11px] font-bold text-muted">
                                {chapter.order}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-semibold text-ink">
                                  {chapter.name}
                                </p>
                                {chapter.summary && (
                                  <p className="truncate text-[11px] text-muted">
                                    {chapter.summary}
                                  </p>
                                )}
                              </div>
                              <Badge tone="neutral">Class {chapter.classLevel}</Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => chapterCrud.edit(chapter)}
                              >
                                Edit
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </SectionCard>

          <CrudModal<Subject>
            open={crud.open}
            editing={crud.editing}
            title={crud.editing ? `Edit ${crud.editing.name}` : 'New subject'}
            description="Subjects drive the study hub, question banks and mock tests."
            collection={COLLECTIONS.subjects}
            deleteLabel="subject"
            build={buildSubject}
            fields={(d, set) => (
              <>
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <Input
                    label="Subject name"
                    required
                    value={String(d.name ?? '')}
                    onChange={(e) => set({ name: e.target.value })}
                    placeholder="Mathematics"
                  />
                  <Input
                    label="Code"
                    required
                    value={String(d.code ?? '')}
                    onChange={(e) => set({ code: e.target.value })}
                    placeholder="MATH"
                    hint="Always stored in upper case."
                  />
                </div>

                <div className="grid items-end gap-3.5 sm:grid-cols-[9rem_1fr]">
                  <Input
                    label="Colour"
                    type="color"
                    value={String(d.color ?? DEFAULT_COLOR)}
                    onChange={(e) => set({ color: e.target.value })}
                  />
                  <span
                    className="flex h-10 items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 text-sm font-semibold"
                    aria-hidden
                  >
                    <span
                      className="size-3 rounded-full"
                      style={{ backgroundColor: String(d.color ?? DEFAULT_COLOR) }}
                    />
                    <span className="truncate text-ink">
                      {String(d.name ?? '').trim() || 'Subject preview'}
                    </span>
                  </span>
                </div>

                <Textarea
                  label="Description"
                  rows={3}
                  value={String(d.description ?? '')}
                  onChange={(e) => set({ description: e.target.value })}
                  placeholder="What this subject covers and who it is for."
                />

                <fieldset>
                  <legend className="cx-label">Class levels</legend>
                  <p className="mb-2 text-xs text-muted">
                    Nothing selected means the subject is not offered to anyone yet.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {LEVELS.map((level) => {
                      const selected = ((d.classLevels as Level[] | undefined) ?? []).includes(level)
                      return (
                        <button
                          key={level}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => {
                            const current = (d.classLevels as Level[] | undefined) ?? []
                            set({
                              classLevels: selected
                                ? current.filter((x) => x !== level)
                                : [...current, level],
                            })
                          }}
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                            selected
                              ? 'bg-brand text-white'
                              : 'bg-surface-2 text-muted hover:text-ink'
                          }`}
                        >
                          Class {level}
                        </button>
                      )
                    })}
                  </div>
                </fieldset>
              </>
            )}
            onClose={crud.close}
          />

          <CrudModal<Chapter>
            open={chapterCrud.open}
            editing={chapterCrud.editing}
            title={chapterCrud.editing ? `Edit ${chapterCrud.editing.name}` : 'New chapter'}
            description="Chapters order the study material and questions inside a subject."
            size="md"
            collection={COLLECTIONS.chapters}
            build={buildChapter}
            fields={(d, set) => (
              <>
                <Input
                  label="Chapter name"
                  required
                  value={String(d.name ?? '')}
                  onChange={(e) => set({ name: e.target.value })}
                  placeholder="Quadratic Equations"
                />
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <Select
                    label="Class level"
                    required
                    value={String(d.classLevel ?? 10)}
                    onChange={(e) => set({ classLevel: Number(e.target.value) })}
                    options={LEVELS.map((l) => ({ value: String(l), label: `Class ${l}` }))}
                  />
                  <Input
                    label="Order"
                    type="number"
                    min={1}
                    value={String(d.order ?? 1)}
                    onChange={(e) => set({ order: e.target.value })}
                    hint="Position in the chapter list."
                  />
                </div>
                <Textarea
                  label="Summary"
                  rows={3}
                  value={String(d.summary ?? '')}
                  onChange={(e) => set({ summary: e.target.value })}
                  placeholder="What students should take away from this chapter."
                />
              </>
            )}
            onClose={() => {
              chapterCrud.close()
              setChapterSubjectId('')
            }}
          />
        </>
      )}
    </div>
  )
}
