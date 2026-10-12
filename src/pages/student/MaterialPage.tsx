import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Download, FileText, Star, Video } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { db } from '@/services'
import { COLLECTIONS } from '@/services/db'
import type { Material } from '@/services/types'
import { useCollection } from '@/hooks/useCollection'
import { useSchoolData, subjectOptions } from '@/hooks/useSchoolData'
import { PageHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Input'
import { Tabs } from '@/components/ui/Disclosure'
import { EmptyState, LoadingState } from '@/components/ui/Feedback'
import { fileSize } from '@/utils/format'
import { relativeTime } from '@/utils/date'

const TYPE_ICON = {
  notes: FileText,
  pdf: FileText,
  important: Star,
  revision: BookOpen,
  pyq: BookOpen,
  video: Video,
} as const

const TYPE_TABS = [
  { value: 'all', label: 'All' },
  { value: 'notes', label: 'Notes' },
  { value: 'important', label: 'Important' },
  { value: 'revision', label: 'Revision' },
  { value: 'pyq', label: 'PYQ' },
  { value: 'video', label: 'Video' },
]

/**
 * Full material library for one class. `StudyHub` links here for the complete
 * list; this page adds per-document download tracking.
 */
export default function MaterialPage() {
  const { profile } = useAuth()
  const { subjects, subjectById } = useSchoolData(profile?.schoolId)
  const [subjectId, setSubjectId] = useState('all')
  const [type, setType] = useState('all')

  const materials = useCollection<Material>(
    COLLECTIONS.materials,
    {
      where: [
        { field: 'schoolId', op: '==', value: profile?.schoolId ?? '' },
        { field: 'classLevel', op: '==', value: profile?.classLevel ?? 10 },
        { field: 'isApproved', op: '==', value: true },
      ],
      orderBy: [{ field: 'createdAt', dir: 'desc' }],
    },
    [profile?.schoolId, profile?.classLevel]
  )

const filtered = useMemo(() => {
    return materials.data.filter((m) => {
      if (subjectId !== 'all' && m.subjectId !== subjectId) return false
      if (type !== 'all' && m.type !== type) return false
      return true
    })
  }, [materials.data, subjectId, type])

  /** Download counters feed the "most used material" signal for teachers. */
  async function trackDownload(material: Material) {
    try {
      await db.update(COLLECTIONS.materials, material.id, {
        downloadCount: (material.downloadCount ?? 0) + 1,
      })
    } catch {
      /* counting a download must never break the download */
    }
  }

  if (materials.loading) return <LoadingState label="Loading materials…" rows={6} />

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Materials"
        description={`Everything your teachers have shared for Class ${profile?.classLevel ?? ''}-${profile?.section ?? ''}.`}
        breadcrumb={
          <Link to="/study" className="inline-flex items-center gap-1 hover:text-brand">
            Study
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-60">
          <Select
            label="Subject"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            options={subjectOptions(subjects)}
          />
        </div>
        <p className="text-xs text-muted">
          {filtered.length} of {materials.data.length} documents
        </p>
      </div>

      <div className="mb-4">
        <Tabs items={TYPE_TABS} value={type} onChange={setType} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No materials match"
          description="Try a different subject or type. Teachers upload new material throughout the year."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((m) => {
            const Icon = TYPE_ICON[m.type] ?? FileText
            return (
              <article
                key={m.id}
                className="flex flex-col rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:border-brand/30"
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-sm font-bold text-ink">{m.title}</h3>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {subjectById.get(m.subjectId)?.name ?? 'General'} · {m.uploadedByName}
                    </p>
                  </div>
                </div>

                {m.description && <p className="mt-3 line-clamp-2 text-xs text-muted">{m.description}</p>}

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <Badge tone={m.type === 'important' ? 'warn' : 'neutral'}>{m.type}</Badge>
                  {m.isStudentContribution && <Badge tone="gold">Student contribution</Badge>}
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
                  <span className="truncate text-[11px] text-muted">
                    {m.fileSize ? `${fileSize(m.fileSize)} · ` : ''}
                    {relativeTime(m.createdAt)}
                  </span>
                  <a
                    href={m.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    download={m.fileName}
                    onClick={() => void trackDownload(m)}
                    className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-brand hover:underline"
                  >
                    <Download className="size-3.5" aria-hidden />
                    Download
                    <ArrowRight className="size-3" aria-hidden />
                  </a>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <p className="mt-6 text-center text-xs text-muted">
        Every download helps your teacher see which material matters most. Materials are kept for the current academic
        year.
      </p>
    </div>
  )
}