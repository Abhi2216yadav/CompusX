import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Download,
  FileText,
  FolderOpen,
  GraduationCap,
  Star,
  Video,
} from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { COLLECTIONS } from '@/services/db'
import { db } from '@/services'
import type { Chapter, Material } from '@/services/types'
import { useAsync, useCollection } from '@/hooks/useCollection'
import { SectionCard, StatTile } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState, LoadingState } from '@/components/ui/Feedback'
import { fileSize, pluralize } from '@/utils/format'
import { relativeTime } from '@/utils/date'

const TYPE_ICON = {
  notes: FileText,
  pdf: FileText,
  important: Star,
  revision: BookOpen,
  pyq: GraduationCap,
  video: Video,
} as const

export default function SubjectPage() {
  const { subjectId = '' } = useParams()
  const { profile } = useAuth()

  const subject = useAsync(
    () => db.get<{ id: string; name: string; code: string; color: string; description?: string }>(
      COLLECTIONS.subjects,
      subjectId
    ),
    [subjectId]
  )

  const chapters = useCollection<Chapter>(
    COLLECTIONS.chapters,
    {
      where: [
        { field: 'schoolId', op: '==', value: profile?.schoolId ?? '' },
        { field: 'subjectId', op: '==', value: subjectId },
        { field: 'classLevel', op: '==', value: profile?.classLevel ?? 10 },
      ],
    },
    [profile?.schoolId, subjectId, profile?.classLevel]
  )

  const materials = useCollection<Material>(
    COLLECTIONS.materials,
    {
      where: [
        { field: 'schoolId', op: '==', value: profile?.schoolId ?? '' },
        { field: 'subjectId', op: '==', value: subjectId },
        { field: 'isApproved', op: '==', value: true },
      ],
    },
    [profile?.schoolId, subjectId]
  )

  const rows = useMemo(() => {
    const list = (materials.data ?? []).filter(
      (m) => m.classLevel === (profile?.classLevel ?? 10)
    )
    return list.sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
  }, [materials.data, profile?.classLevel])

  const sortedChapters = useMemo(
    () => [...(chapters.data ?? [])].sort((a, b) => a.order - b.order),
    [chapters.data]
  )

  if (subject.loading) return <LoadingState label="Loading subject…" rows={5} />
  if (!subject.data) {
    return (
      <EmptyState
        title="Subject not found"
        action={
          <Link to="/study">
            <a className="rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white">Back to Study Hub</a>
          </Link>
        }
      />
    )
  }

  const info = subject.data
  const byType = new Map<string, number>()
  for (const m of rows) byType.set(m.type, (byType.get(m.type) ?? 0) + 1)

  return (
    <div className="mx-auto w-full max-w-6xl">
      <Link
        to="/study"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-brand"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Study Hub
      </Link>

      <div className="mb-4 flex items-start gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <span
          className="grid size-14 shrink-0 place-items-center rounded-2xl text-base font-black text-white"
          style={{ backgroundColor: info.color }}
        >
          {info.code.slice(0, 3)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-extrabold text-ink">{info.name}</h1>
          {info.description && <p className="mt-1 text-sm text-muted">{info.description}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Array.from(byType.entries()).map(([type, count]) => (
              <Badge key={type} tone="neutral">
                {count} {type}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <SectionCard title="Chapters" icon={<FolderOpen className="size-4" />} bodyClassName="px-3 pb-4">
          {chapters.loading ? (
            <LoadingState rows={4} />
          ) : sortedChapters.length === 0 ? (
            <EmptyState compact title="No chapters" />
          ) : (
            <ol className="space-y-1">
              {sortedChapters.map((chapter) => {
                const count = rows.filter((m) => m.chapterId === chapter.id).length
                return (
                  <li
                    key={chapter.id}
                    className="flex items-center gap-3 rounded-xl px-2.5 py-2 transition hover:bg-surface-2"
                  >
                    <span className="tabular grid size-7 shrink-0 place-items-center rounded-lg bg-surface-2 text-[11px] font-bold text-muted">
                      {chapter.order}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{chapter.name}</p>
                      {chapter.summary && (
                        <p className="truncate text-[11px] text-muted">{chapter.summary}</p>
                      )}
                    </div>
                    {count > 0 && (
                      <span className="tabular shrink-0 rounded-md bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold text-brand">
                        {count}
                      </span>
                    )}
                  </li>
                )
              })}
            </ol>
          )}
        </SectionCard>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <StatTile label="Files" value={rows.length} icon={<FileText className="size-4" />} />
            <StatTile label="Chapters" value={sortedChapters.length} icon={<BookOpen className="size-4" />} tone="info" />
            <StatTile
              label="Downloads"
              value={rows.reduce((s, m) => s + m.downloadCount, 0)}
              icon={<Download className="size-4" />}
              tone="success"
            />
          </div>

          <SectionCard
            title="Materials"
            subtitle={`${rows.length} ${pluralize(rows.length, 'file')} for this subject`}
          >
            {materials.loading ? (
              <LoadingState rows={4} />
            ) : rows.length === 0 ? (
              <EmptyState
                compact
                title="No material yet"
                description="Your teacher has not uploaded anything for this subject."
              />
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((material) => {
                  const Icon = TYPE_ICON[material.type] ?? FileText
                  return (
                    <li key={material.id}>
                      <Link
                        to={`/study/material/${material.id}`}
                        className="flex items-start gap-3 py-3 transition hover:bg-surface-2"
                      >
                        <span
                          className="grid size-9 shrink-0 place-items-center rounded-xl"
                          style={{ backgroundColor: `${info.color}1a`, color: info.color }}
                        >
                          <Icon className="size-4" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-ink">
                            {material.title}
                            {material.type === 'important' && <Badge tone="gold">Important</Badge>}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-muted">
                            {material.fileName} · {fileSize(material.fileSize)} ·{' '}
                            {relativeTime(material.createdAt)}
                          </p>
                        </div>
                        <ChevronRight className="mt-1 size-4 shrink-0 text-muted" aria-hidden />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

