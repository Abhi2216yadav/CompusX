import { useMemo, useState } from 'react'
import { FileText, Download, CheckCircle, Clock, XCircle, Pencil, Trash2 } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { COLLECTIONS } from '@/services/db'
import type { Material, MaterialType } from '@/services/types'
import { useCollection } from '@/hooks/useCollection'
import { subjectOptions, useSaver, useSchoolData } from '@/hooks/useSchoolData'
import { moderateMaterial } from '@/services/contribution'
import { CrudModal, useCrudModal, useRowSearch, type Draft } from '@/components/crud/CrudShell'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageHeader, StatTile } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { ConfirmDialog } from '@/components/ui/Modal'
import { LoadingState } from '@/components/ui/Feedback'
import { formatDateTime } from '@/utils/date'
import { titleCase } from '@/utils/format'

const TYPES: MaterialType[] = ['notes', 'pdf', 'important', 'revision', 'pyq', 'video']
const LEVELS: number[] = [6, 7, 8, 9, 10, 11, 12]

const TYPE_TONE: Record<MaterialType, 'brand' | 'info' | 'warn' | 'danger' | 'gold' | 'neutral'> = {
  notes: 'brand',
  pdf: 'info',
  important: 'danger',
  revision: 'warn',
  pyq: 'gold',
  video: 'neutral',
}

export default function AdminMaterials() {
  const { profile } = useAuth()
  const schoolId = profile?.schoolId ?? ''
  const { subjects, chapters } = useSchoolData(schoolId)
  const crud = useCrudModal<Material>()

  const [subjectFilter, setSubjectFilter] = useState('all')
  const [classFilter, setClassFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [approvalFilter, setApprovalFilter] = useState('all')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<'delete' | 'reject'>('delete')
  const [busy, setBusy] = useState(false)

  const { remove } = useSaver()

  const materials = useCollection<Material>(
    COLLECTIONS.materials,
    { where: [{ field: 'schoolId', op: '==', value: schoolId }] },
    [schoolId]
  )

  const filtered = useMemo(() => {
    return materials.data.filter((m) => {
      if (subjectFilter !== 'all' && m.subjectId !== subjectFilter) return false
      if (classFilter !== 'all' && m.classLevel !== Number(classFilter)) return false
      if (typeFilter !== 'all' && m.type !== typeFilter) return false
      if (approvalFilter === 'approved' && !m.isApproved) return false
      if (approvalFilter === 'pending' && (m.isApproved || !m.isStudentContribution)) return false
      return true
    })
  }, [materials.data, subjectFilter, classFilter, typeFilter, approvalFilter])

  const search = useRowSearch(filtered, (m) => [
    m.title,
    m.description ?? '',
    m.fileName ?? '',
    ...(m.tags ?? []),
  ])

  const stats = useMemo(() => {
    const pending = materials.data.filter((m) => m.isStudentContribution && !m.isApproved).length
    const downloads = materials.data.reduce((sum, m) => sum + (m.downloadCount ?? 0), 0)
    return { total: materials.data.length, pending, downloads }
  }, [materials.data])

  function build(draft: Draft): Record<string, unknown> {
    const editing = crud.editing as Material | null
    const fileUrl = String(draft.fileUrl ?? '').trim()
    const typedName = String(draft.fileName ?? '').trim()
    const fileName = typedName || fileNameFromUrl(fileUrl)

    return {
      ...(editing ?? {}),
      schoolId,
      title: String(draft.title ?? '').trim(),
      description: String(draft.description ?? '').trim(),
      subjectId: String(draft.subjectId ?? ''),
      chapterId: draft.chapterId ? String(draft.chapterId) : undefined,
      classLevel: Number(draft.classLevel ?? 6),
      type: String(draft.type ?? 'notes') as MaterialType,
      fileUrl,
      fileName,
      tags: String(draft.tags ?? '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      ...(editing
        ? { downloadCount: editing.downloadCount ?? 0 }
        : {
            academicYear: profile?.academicYear ?? '',
            uploadedBy: profile?.id ?? '',
            uploadedByName: profile?.name ?? '',
            isStudentContribution: false,
            isApproved: true,
            downloadCount: 0,
            createdAt: Date.now(),
          }),
    }
  }

  const columns: Column<Material>[] = [
    {
      key: 'title',
      header: 'Title',
      cell: (m) => (
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={TYPE_TONE[m.type] ?? 'neutral'}>{titleCase(m.type)}</Badge>
            <p className="truncate text-sm font-semibold text-ink">{m.title}</p>
          </div>
          {m.description ? <p className="line-clamp-1 text-[11px] text-muted">{m.description}</p> : null}
        </div>
      ),
    },
    {
      key: 'subject',
      header: 'Subject',
      hideBelow: 'md',
      cell: (m) => subjects.find((s) => s.id === m.subjectId)?.name ?? '—',
    },
    {
      key: 'class',
      header: 'Class',
      cell: (m) => `Class ${m.classLevel}`,
    },
    {
      key: 'file',
      header: 'File',
      hideBelow: 'lg',
      cell: (m) =>
        m.fileUrl ? (
          <a
            href={m.fileUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
          >
            <Download className="size-3.5" aria-hidden />
            <span className="max-w-32 truncate">{m.fileName || 'Download'}</span>
            <span className="tabular text-muted">({m.downloadCount ?? 0})</span>
          </a>
        ) : (
          <span className="text-xs text-muted">No file</span>
        ),
    },
    {
      key: 'uploader',
      header: 'Uploader',
      hideBelow: 'lg',
      cell: (m) => (
        <div className="flex items-center gap-1.5">
          <span className="truncate text-xs text-ink-2">{m.uploadedByName}</span>
          {m.isStudentContribution ? <Badge tone="warn">Student</Badge> : null}
        </div>
      ),
    },
    {
      key: 'approval',
      header: 'Approval',
      cell: (m) =>
        m.isApproved ? (
          <Badge tone="success" icon={<CheckCircle className="size-3" />}>
            Approved
          </Badge>
        ) : m.isStudentContribution ? (
          <Badge tone="warn" icon={<Clock className="size-3" />}>
            Pending
          </Badge>
        ) : (
          <Badge tone="danger" icon={<XCircle className="size-3" />}>
            Rejected
          </Badge>
        ),
    },
    {
      key: 'posted',
      header: 'Posted',
      align: 'right',
      hideBelow: 'md',
      cell: (m) => <span className="text-xs text-muted">{formatDateTime(m.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (m) => (
        <div className="flex items-center justify-end gap-1">
          {m.isStudentContribution && !m.isApproved ? (
            <>
              <button
                type="button"
                aria-label={`Approve ${m.title}`}
                onClick={async () => {
                  setBusy(true)
                  await moderateMaterial(m.id, true)
                  setBusy(false)
                }}
                className="grid size-8 place-items-center rounded-lg text-success transition hover:bg-success-soft"
              >
                <CheckCircle className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                aria-label={`Reject ${m.title}`}
                onClick={() => {
                  setConfirmAction('reject')
                  setConfirmId(m.id)
                }}
                className="grid size-8 place-items-center rounded-lg text-danger transition hover:bg-danger-soft"
              >
                <XCircle className="size-4" aria-hidden />
              </button>
            </>
          ) : null}
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
            onClick={() => {
              setConfirmAction('delete')
              setConfirmId(m.id)
            }}
            className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      ),
    },
  ]

  if (materials.loading) return <LoadingState label="Loading materials…" rows={6} />

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Materials"
        description="The school-wide library. Student uploads wait here for your approval before anyone can open them."
        action={
          <Button size="sm" icon={<FileText className="size-4" />} onClick={crud.create}>
            Add material
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatTile label="Materials" value={stats.total} tone="brand" />
        <StatTile label="Pending approval" value={stats.pending} tone={stats.pending > 0 ? 'warn' : 'info'} />
        <StatTile label="Total downloads" value={stats.downloads} tone="success" icon={<Download className="size-4" />} />
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Input
          label="Search"
          value={search.query}
          onChange={(e) => search.setQuery(e.target.value)}
          placeholder="Title, tags, filename…"
        />
        <Select label="Subject" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} options={subjectOptions(subjects)} />
        <Select
          label="Class"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          options={[{ value: 'all', label: 'All classes' }, ...LEVELS.map((l) => ({ value: String(l), label: `Class ${l}` }))]}
        />
        <Select
          label="Type"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          options={[{ value: 'all', label: 'All types' }, ...TYPES.map((t) => ({ value: t, label: titleCase(t) }))]}
        />
        <Select
          label="Approval"
          value={approvalFilter}
          onChange={(e) => setApprovalFilter(e.target.value)}
          options={[
            { value: 'all', label: 'Everything' },
            { value: 'approved', label: 'Approved' },
            { value: 'pending', label: 'Pending' },
          ]}
        />
      </div>

      <DataTable
        rows={search.filtered}
        columns={columns}
        rowKey={(m) => m.id}
        empty={{
          title: 'No materials match',
          description: 'Upload notes, PDFs or revision sheets and every targeted class sees them straight away.',
        }}
      />

      <CrudModal<Material>
        open={crud.open}
        editing={crud.editing}
        title={crud.editing ? 'Edit material' : 'Add material'}
        description="Paste a link to the file. Students open it from their materials page."
        collection={COLLECTIONS.materials}
        deleteLabel="material"
        build={build}
        fields={(d, set) => {
          const subjectId = String(d.subjectId ?? '')
          const chapterOptions = [
            { value: '', label: 'No specific chapter' },
            ...chapters
              .filter((c) => c.subjectId === subjectId)
              .map((c) => ({ value: c.id, label: `${c.order}. ${c.name}` })),
          ]
          return (
            <>
              <Input
                label="Title"
                required
                value={String(d.title ?? '')}
                onChange={(e) => set({ title: e.target.value })}
                placeholder="Photosynthesis — full revision sheet"
              />
              <Textarea
                label="Description"
                rows={3}
                value={String(d.description ?? '')}
                onChange={(e) => set({ description: e.target.value })}
                placeholder="What this covers and who it is for."
              />
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Select
                  label="Subject"
                  value={subjectId}
                  onChange={(e) => set({ subjectId: e.target.value, chapterId: '' })}
                  options={subjectOptions(subjects, false)}
                />
                <Select
                  label="Chapter"
                  value={String(d.chapterId ?? '')}
                  onChange={(e) => set({ chapterId: e.target.value })}
                  options={chapterOptions}
                />
                <Select
                  label="Class level"
                  value={String(d.classLevel ?? '')}
                  onChange={(e) => set({ classLevel: Number(e.target.value) })}
                  options={LEVELS.map((l) => ({ value: String(l), label: `Class ${l}` }))}
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
                value={String(d.fileName ?? '')}
                onChange={(e) => set({ fileName: e.target.value })}
                hint="Leave blank to derive it from the URL."
              />
              <Input
                label="Tags"
                value={String(d.tags ?? '')}
                onChange={(e) => set({ tags: e.target.value })}
                placeholder="revision, formula sheet"
                hint="Comma separated."
              />
            </>
          )
        }}
        onClose={crud.close}
      />

      <ConfirmDialog
        open={Boolean(confirmId)}
        tone={confirmAction === 'delete' ? 'danger' : 'primary'}
        title={confirmAction === 'delete' ? 'Delete this material?' : 'Reject this material?'}
        message={
          confirmAction === 'delete'
            ? 'It disappears from every student library straight away.'
            : 'The student who uploaded it stops seeing it in their contributions.'
        }
        confirmLabel={confirmAction === 'delete' ? 'Delete' : 'Reject'}
        loading={busy}
        onCancel={() => setConfirmId(null)}
        onConfirm={async () => {
          if (!confirmId) return
          setBusy(true)
          try {
            if (confirmAction === 'delete') {
              await remove(COLLECTIONS.materials, confirmId, 'Material')
            } else {
              await moderateMaterial(confirmId, false)
            }
            setConfirmId(null)
          } finally {
            setBusy(false)
          }
        }}
      />
    </div>
  )
}

function fileNameFromUrl(url: string): string {
  if (!url) return ''
  const cleaned = url.split('?')[0].split('#')[0]
  const segment = cleaned.split('/').filter(Boolean).pop()
  return segment ?? url
}