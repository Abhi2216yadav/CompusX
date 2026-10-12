import { useMemo, useState } from 'react'
import { Check, Download, Library, Pencil, Trash2, X } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { COLLECTIONS } from '@/services/db'
import type { Level, Material, MaterialType } from '@/services/types'
import { useCollection } from '@/hooks/useCollection'
import { useSchoolData, subjectOptions, useSaver } from '@/hooks/useSchoolData'
import { moderateMaterial } from '@/services/contribution'
import { CrudModal, useCrudModal, type Draft } from '@/components/crud/CrudShell'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageHeader, StatTile } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { ConfirmDialog } from '@/components/ui/Modal'
import { LoadingState } from '@/components/ui/Feedback'
import { formatDate } from '@/utils/date'
import { titleCase } from '@/utils/format'

const LEVELS: Level[] = [6, 7, 8, 9, 10, 11, 12]
const TYPES: MaterialType[] = ['notes', 'pdf', 'important', 'revision', 'pyq', 'video']

const TYPE_TONE: Record<MaterialType, 'brand' | 'info' | 'warn' | 'danger' | 'success' | 'neutral'> = {
  notes: 'brand',
  pdf: 'danger',
  important: 'warn',
  revision: 'info',
  pyq: 'success',
  video: 'neutral',
}

export default function TeacherMaterials() {
  const { profile } = useAuth()
  const schoolId = profile?.schoolId ?? ''
  const { subjects, subjectById, chapters } = useSchoolData(schoolId)
  const { remove } = useSaver()

  const [subjectFilter, setSubjectFilter] = useState('all')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [moderating, setModerating] = useState<string | null>(null)

  const crud = useCrudModal<Material>()

  const materials = useCollection<Material>(
    COLLECTIONS.materials,
    {
      where: [
        { field: 'schoolId', op: '==', value: schoolId },
        ...(subjectFilter !== 'all'
          ? [{ field: 'subjectId', op: 'array-contains' as const, value: subjectFilter }]
          : []),
      ],
      orderBy: [{ field: 'createdAt', dir: 'desc' }],
    },
    [schoolId, subjectFilter]
  )

  const rows = useMemo(() => materials.data, [materials.data])
  const pending = rows.filter((m) => m.isStudentContribution && !m.isApproved).length
  const downloads = rows.reduce((sum, m) => sum + (m.downloadCount ?? 0), 0)

  async function handleModerate(id: string, approve: boolean) {
    setModerating(id)
    try {
      await moderateMaterial(id, approve)
    } finally {
      setModerating(null)
    }
  }

  function buildMaterial(draft: Draft): Record<string, unknown> {
    const isNew = !crud.editing
    const fileUrl = String(draft.fileUrl ?? '').trim()

    return {
      ...(crud.editing ?? {}),
      schoolId,
      subjectId: String(draft.subjectId ?? ''),
      chapterId: String(draft.chapterId ?? '') || undefined,
      classLevel: Number(draft.classLevel ?? 10) as Level,
      title: String(draft.title ?? '').trim(),
      description: String(draft.description ?? '').trim() || undefined,
      type: String(draft.type ?? 'notes') as MaterialType,
      fileUrl,
      fileName: String(draft.fileName ?? '').trim() || fileUrl.split('/').pop() || 'material',
      uploadedBy: profile?.id ?? '',
      uploadedByName: profile?.name ?? '',
      academicYear: profile?.academicYear ?? '2026-27',
      isStudentContribution: false,
      isApproved: true,
      downloadCount: isNew ? 0 : (crud.editing?.downloadCount ?? 0),
      tags: String(draft.tags ?? '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      ...(isNew ? { createdAt: Date.now() } : {}),
    }
  }

  const columns: Column<Material>[] = [
    {
      key: 'title',
      header: 'Material',
      cell: (m) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{m.title}</p>
          {m.isStudentContribution && !m.isApproved && (
            <Badge tone="warn" className="mt-1">
              Pending approval
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      hideBelow: 'sm',
      cell: (m) => <Badge tone={TYPE_TONE[m.type] ?? 'neutral'}>{titleCase(m.type)}</Badge>,
    },
    {
      key: 'subject',
      header: 'Subject',
      hideBelow: 'md',
      cell: (m) => subjectById.get(m.subjectId)?.name ?? '—',
    },
    {
      key: 'class',
      header: 'Class',
      hideBelow: 'lg',
      cell: (m) => `Class ${m.classLevel}`,
    },
    {
      key: 'file',
      header: 'File',
      hideBelow: 'md',
      cell: (m) => (
        <a
          href={m.fileUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
        >
          <Download className="size-3.5" aria-hidden />
          <span className="max-w-40 truncate">{m.fileName}</span>
          <span className="tabular text-muted">({m.downloadCount ?? 0})</span>
        </a>
      ),
    },
    {
      key: 'approved',
      header: 'Status',
      align: 'right',
      hideBelow: 'sm',
      cell: (m) =>
        m.isStudentContribution && !m.isApproved ? (
          <Badge tone="warn">Pending</Badge>
        ) : (
          <Badge tone="success">Approved</Badge>
        ),
    },
    {
      key: 'posted',
      header: 'Posted',
      align: 'right',
      hideBelow: 'lg',
      cell: (m) => <span className="text-xs text-muted">{formatDate(m.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (m) => {
        const needsReview = m.isStudentContribution && !m.isApproved
        return (
          <div className="flex items-center justify-end gap-1">
            {needsReview && (
              <>
                <button
                  type="button"
                  aria-label={`Approve ${m.title}`}
                  disabled={moderating === m.id}
                  onClick={() => void handleModerate(m.id, true)}
                  className="grid size-8 place-items-center rounded-lg text-success transition hover:bg-success-soft"
                >
                  <Check className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={`Reject ${m.title}`}
                  disabled={moderating === m.id}
                  onClick={() => void handleModerate(m.id, false)}
                  className="grid size-8 place-items-center rounded-lg text-danger transition hover:bg-danger-soft"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </>
            )}
            <button
              type="button"
              aria-label={`Edit ${m.title}`}
              onClick={() => crud.edit(m)}
              className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-surface-2"
            >
              <Pencil className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-label={`Delete ${m.title}`}
              onClick={() => setConfirmId(m.id)}
              className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-danger-soft hover:text-danger"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </div>
        )
      },
    },
  ]

  if (materials.loading) return <LoadingState label="Loading materials…" rows={5} />

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Study Materials"
        description="Share notes, PDFs and revision material with your students."
        action={
          <Button size="sm" onClick={crud.create}>
            Upload material
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatTile label="Materials" value={rows.length} icon={<Library className="size-4" />} />
        <StatTile label="Pending approval" value={pending} tone={pending > 0 ? 'warn' : 'info'} />
        <StatTile label="Downloads" value={downloads} tone="success" />
      </div>

      <div className="mb-4">
        <Select
          aria-label="Filter by subject"
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          options={subjectOptions(subjects)}
          className="h-9 w-auto min-w-32 text-xs font-semibold"
        />
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(m) => m.id}
        onRowClick={(m) => crud.edit(m)}
        empty={{
          title: 'No materials yet',
          description: 'Upload your first set of notes and every student can open it instantly.',
        }}
      />

      <CrudModal<Material>
        open={crud.open}
        editing={crud.editing}
        title={crud.editing ? 'Edit material' : 'Upload material'}
        description="Link any file — a Drive share, a CDN URL or a direct PDF link all work."
        collection={COLLECTIONS.materials}
        deleteLabel="material"
        build={buildMaterial}
        fields={(d, set) => {
          const subjectId = String(d.subjectId ?? '')
          const level = Number(d.classLevel ?? 10)
          const chapterChoices = chapters
            .filter((c) => c.subjectId === subjectId && Number(c.classLevel) === level)
            .map((c) => ({ value: c.id, label: `Ch ${c.order} · ${c.name}` }))

          return (
            <>
              <Input
                label="Title"
                required
                value={String(d.title ?? '')}
                onChange={(e) => set({ title: e.target.value })}
                placeholder="Quadratic equations — revision notes"
              />
              <Textarea
                label="Description"
                rows={3}
                value={String(d.description ?? '')}
                onChange={(e) => set({ description: e.target.value })}
                placeholder="What does this material cover?"
              />
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Select
                  label="Subject"
                  required
                  value={subjectId}
                  onChange={(e) => set({ subjectId: e.target.value, chapterId: '' })}
                  options={subjectOptions(subjects, false)}
                />
                <Select
                  label="Class"
                  required
                  value={String(d.classLevel ?? 10)}
                  onChange={(e) => set({ classLevel: Number(e.target.value), chapterId: '' })}
                  options={LEVELS.map((l) => ({ value: String(l), label: `Class ${l}` }))}
                />
                <Select
                  label="Chapter"
                  placeholder="Whole subject"
                  value={String(d.chapterId ?? '')}
                  onChange={(e) => set({ chapterId: e.target.value })}
                  options={chapterChoices}
                />
                <Select
                  label="Type"
                  value={String(d.type ?? 'notes')}
                  onChange={(e) => set({ type: e.target.value })}
                  options={TYPES.map((t) => ({ value: t, label: titleCase(t) }))}
                />
              </div>
              <Input
                label="File URL"
                required
                value={String(d.fileUrl ?? '')}
                onChange={(e) => set({ fileUrl: e.target.value })}
                placeholder="https://…"
              />
              <Input
                label="File name"
                hint="Left blank we use the last part of the URL."
                value={String(d.fileName ?? '')}
                onChange={(e) => set({ fileName: e.target.value })}
                placeholder="quadratic-notes.pdf"
              />
              <Input
                label="Tags"
                hint="Comma separated, e.g. algebra, class 10, exam prep"
                value={Array.isArray(d.tags) ? (d.tags as string[]).join(', ') : String(d.tags ?? '')}
                onChange={(e) => set({ tags: e.target.value })}
                placeholder="algebra, revision"
              />
            </>
          )
        }}
        onClose={crud.close}
      />

      <ConfirmDialog
        open={Boolean(confirmId)}
        title="Delete this material?"
        message="Students lose access to this file straight away."
        loading={busy}
        onCancel={() => setConfirmId(null)}
        onConfirm={async () => {
          if (!confirmId) return
          setBusy(true)
          try {
            await remove(COLLECTIONS.materials, confirmId, 'Material')
            setConfirmId(null)
          } finally {
            setBusy(false)
          }
        }}
      />
    </div>
  )
}