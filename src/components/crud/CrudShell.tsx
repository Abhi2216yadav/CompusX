import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Plus } from 'lucide-react'

import { useSaver } from '@/hooks/useSchoolData'
import type { CollectionName } from '@/services/db'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/Feedback'

/** Field values collected by a `CrudModal` form. */
export type Draft = Record<string, unknown>
export type DraftSetter = (patch: Draft) => void
export type FieldsRenderer = (draft: Draft, set: DraftSetter) => ReactNode

/**
 * Create/edit modal used by every teacher and admin content page.
 *
 * The caller supplies the fields as a render function plus a `build` function
 * that turns the draft into a document. Saving, toasts and delete confirmation
 * live here so all CRUD pages behave identically.
 */
export function CrudModal<T>({
  open,
  editing,
  title,
  description,
  size = 'lg',
  deleteLabel,
  build,
  collection,
  fields,
  onClose,
  onSaved,
}: {
  open: boolean
  /** Undefined means "create new". */
  editing: T | null
  title: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  /** When set together with `collection`, a delete button is shown. */
  deleteLabel?: string
  collection?: CollectionName
  build: (draft: Draft) => Record<string, unknown>
  fields: FieldsRenderer
  onClose: () => void
  onSaved?: (id: string) => void
}) {
  const { save, remove } = useSaver()
  const [draft, setDraft] = useState<Draft>(() => seedFrom(editing))
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const editingId = editing ? (editing as { id?: string }).id : undefined

  // Re-seed the form whenever a different row is opened.
  useEffect(() => {
    if (open) {
      setDraft(seedFrom(editing))
      setConfirmDelete(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingId])

  const set = useCallback<DraftSetter>((patch) => setDraft((d) => ({ ...d, ...patch })), [])

  async function handleSave() {
    setSaving(true)
    try {
      const payload = build(draft)
      const id = editingId
        ? await save(collection!, payload as { id?: string }, { id: editingId, success: 'Changes saved' })
        : await save(collection!, payload as { id?: string }, { success: 'Created successfully' })
      if (id) {
        onSaved?.(id)
        onClose()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        size={size}
        dismissible={!saving}
        title={title}
        description={description}
        footer={
          <>
            {deleteLabel && collection && (
              <Button variant="danger" className="mr-auto" disabled={saving} onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            )}
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button loading={saving} onClick={() => void handleSave()}>
              {editingId ? 'Save changes' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">{fields(draft, set)}</div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete this ${deleteLabel ?? 'item'}?`}
        message="This cannot be undone. Students who can see this item will lose it immediately."
        confirmLabel="Delete"
        loading={saving}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          if (!collection || !editingId) return
          setSaving(true)
          try {
            const ok = await remove(collection, editingId, deleteLabel ?? 'Item')
            if (ok) {
              setConfirmDelete(false)
              onClose()
            }
          } finally {
            setSaving(false)
          }
        }}
      />
    </>
  )
}

export interface CrudController<T extends { id: string }> {
  open: boolean
  editing: T | null
  create: () => void
  edit: (row: T) => void
  close: () => void
}

/** Tracks which row is being edited for a `CrudModal`. */
export function useCrudModal<T extends { id: string }>(): CrudController<T> {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<T | null>(null)

  return useMemo<CrudController<T>>(
    () => ({
      open,
      editing,
      create: () => {
        setEditing(null)
        setOpen(true)
      },
      edit: (row) => {
        setEditing(row)
        setOpen(true)
      },
      close: () => {
        setOpen(false)
        setEditing(null)
      },
    }),
    [open, editing]
  )
}

/** Seeds a draft from an existing row so edit forms open pre-filled. */
function seedFrom<T>(row: T | null): Draft {
  return row ? ({ ...(row as unknown as Draft) } satisfies Draft) : {}
}

/** Empty state used when a content page has nothing yet. */
export function NothingYet({
  title,
  description,
  onCreate,
  createLabel = 'Create the first one',
  icon,
}: {
  title: string
  description: string
  onCreate: () => void
  createLabel?: string
  icon?: ReactNode
}) {
  return (
    <EmptyState
      title={title}
      description={description}
      icon={icon}
      action={
        <Button size="sm" icon={<Plus className="size-4" />} onClick={onCreate}>
          {createLabel}
        </Button>
      }
    />
  )
}

/** Local-only text search across a few fields of each row. */
export function useRowSearch<T>(rows: T[], fields: (row: T) => string[], initial = '') {
  const [query, setQuery] = useState(initial)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) => fields(row).some((f) => f.toLowerCase().includes(q)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, query, fields])

  return { query, setQuery, filtered }
}