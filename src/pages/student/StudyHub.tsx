import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronRight,
  FileText,
  Library,
  ListFilter,
  Search,
  Star,
} from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { COLLECTIONS } from '@/services/db'
import type { Chapter, Material } from '@/services/types'
import { useCollection } from '@/hooks/useCollection'
import { useSchoolData } from '@/hooks/useSchoolData'
import { useDebounced } from '@/hooks/useUi'
import { MaterialRow } from '@/components/student/MaterialRow'
import { PageHeader } from '@/components/ui/Card'
import { Input, Select } from '@/components/ui/Input'
import { Tabs } from '@/components/ui/Disclosure'
import { EmptyState, LoadingState } from '@/components/ui/Feedback'
import { pluralize } from '@/utils/format'

const TYPE_FILTERS = [
  { value: 'all', label: 'All types' },
  { value: 'notes', label: 'Notes' },
  { value: 'important', label: 'Important' },
  { value: 'revision', label: 'Revision' },
  { value: 'pyq', label: 'PYQ' },
  { value: 'video', label: 'Video' },
]

export default function StudyHub() {
  const { profile } = useAuth()
  const { subjects, subjectById, loading: metaLoading } = useSchoolData(profile?.schoolId)

  const [tab, setTab] = useState<'subjects' | 'materials' | 'recent'>('subjects')
  const [query, setQuery] = useState('')
  const [subjectId, setSubjectId] = useState('all')
  const [type, setType] = useState('all')
  const debounced = useDebounced(query)

  const materials = useCollection<Material>(
    COLLECTIONS.materials,
    {
      where: [
        { field: 'schoolId', op: '==', value: profile?.schoolId ?? '' },
        { field: 'classLevel', op: '==', value: profile?.classLevel ?? 10 },
        { field: 'isApproved', op: '==', value: true },
      ],
    },
    [profile?.schoolId, profile?.classLevel]
  )

  const chapters = useCollection<Chapter>(
    COLLECTIONS.chapters,
    {
      where: [
        { field: 'schoolId', op: '==', value: profile?.schoolId ?? '' },
        { field: 'classLevel', op: '==', value: profile?.classLevel ?? 10 },
      ],
    },
    [profile?.schoolId, profile?.classLevel]
  )

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase()
    return (materials.data ?? [])
      .filter((m) => subjectId === 'all' || m.subjectId === subjectId)
      .filter((m) => type === 'all' || m.type === type)
      .filter((m) => !q || m.title.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q))
      .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
  }, [materials.data, debounced, subjectId, type])

  const recent = useMemo(
    () =>
      [...(materials.data ?? [])]
        .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
        .slice(0, 8),
    [materials.data]
  )

  const visibleSubjects = useMemo(
    () => subjects.filter((s) => s.classLevels.includes(profile?.classLevel ?? 10)),
    [subjects, profile?.classLevel]
  )

  const chaptersBySubject = useMemo(() => {
    const map = new Map<string, Chapter[]>()
    for (const chapter of chapters.data ?? []) {
      const list = map.get(chapter.subjectId) ?? []
      list.push(chapter)
      map.set(chapter.subjectId, list)
    }
    for (const list of map.values()) list.sort((a, b) => a.order - b.order)
    return map
  }, [chapters.data])

  if (metaLoading) return <LoadingState label="Loading your study hub…" rows={6} />

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageHeader
        title="Study Hub"
        description={`All study material for Class ${profile?.classLevel ?? '—'} in one place.`}
      />

      <Tabs
        className="mb-4"
        value={tab}
        onChange={(v) => setTab(v as typeof tab)}
        items={[
          { value: 'subjects', label: 'Subjects', icon: <Library className="size-4" />, count: visibleSubjects.length },
          { value: 'materials', label: 'All materials', icon: <FileText className="size-4" />, count: filtered.length },
          { value: 'recent', label: 'Recently added', icon: <Star className="size-4" />, count: recent.length },
        ]}
      />

      {tab === 'subjects' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleSubjects.map((subject) => {
            const subjectChapters = chaptersBySubject.get(subject.id) ?? []
            const count = (materials.data ?? []).filter((m) => m.subjectId === subject.id).length
            return (
              <Link
                key={subject.id}
                to={`/study/subject/${subject.id}`}
                className="group rounded-2xl border border-border bg-surface p-5 shadow-sm transition hover:border-brand/35 hover:shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className="grid size-11 place-items-center rounded-xl text-sm font-black text-white"
                    style={{ backgroundColor: subject.color }}
                  >
                    {subject.code.slice(0, 3)}
                  </span>
                  <ChevronRight
                    className="size-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand"
                    aria-hidden
                  />
                </div>
                <h3 className="mt-3 text-base font-bold text-ink">{subject.name}</h3>
                <p className="mt-0.5 text-xs text-muted">
                  {count} {pluralize(count, 'file')} · {subjectChapters.length}{' '}
                  {pluralize(subjectChapters.length, 'chapter')}
                </p>
                {subject.description && (
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">{subject.description}</p>
                )}
              </Link>
            )
          })}
          {visibleSubjects.length === 0 && (
            <EmptyState
              title="No subjects for your class"
              description="Ask your admin to add subjects to your class."
            />
          )}
        </div>
      )}

      {tab !== 'subjects' && (
        <>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1">
              <Input
                icon={<Search className="size-4" />}
                placeholder="Search materials…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {tab === 'materials' && (
              <>
                <div className="w-full sm:w-52">
                  <Select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    options={[
                      { value: 'all', label: 'All subjects' },
                      ...visibleSubjects.map((s) => ({ value: s.id, label: s.name })),
                    ]}
                  />
                </div>
                <div className="w-full sm:w-44">
                  <Select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    options={TYPE_FILTERS}
                  />
                </div>
              </>
            )}
          </div>

          {tab === 'materials' && (
            <p className="mb-3 flex items-center gap-1.5 text-xs text-muted">
              <ListFilter className="size-3.5" aria-hidden />
              {filtered.length} {pluralize(filtered.length, 'material')} shown
            </p>
          )}

          {materials.loading ? (
            <LoadingState label="Loading materials…" rows={5} />
          ) : (tab === 'materials' ? filtered : recent).length === 0 ? (
            <EmptyState
              icon={<FileText className="size-6" />}
              title="No materials found"
              description={
                query
                  ? `Nothing matches "${query}". Try a different search.`
                  : 'Your teachers have not uploaded material yet.'
              }
            />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {(tab === 'materials' ? filtered : recent).map((material) => (
                <MaterialRow key={material.id} material={material} subject={subjectById.get(material.subjectId)} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

