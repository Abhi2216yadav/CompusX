import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  CheckCircle2,
  Copy,
  ImagePlus,
  KeyRound,
  Mail,
  RefreshCw,
  UserPlus,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { COLLECTIONS } from '@/services/db'
import { db } from '@/services'
import type { ClassRoom, ID, Subject, UserProfile } from '@/services/types'
import {
  createTeacher,
  emptyTeacherInput,
  hasErrors,
  isTeacherEmailValid,
  MIN_PASSWORD_LENGTH,
  suggestTeacherId,
  teacherInputFromProfile,
  updateTeacher,
  validateTeacherForm,
  type CreateTeacherResult,
  type PasswordMode,
  type TeacherFieldErrors,
  type TeacherInput,
} from '@/services/teachers'
import { makeId } from '@/utils/id'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Input'
import { InlineError } from '@/components/ui/Feedback'
import { cn } from '@/utils/cn'

interface TeacherFormModalProps {
  open: boolean
  onClose: () => void
  schoolId: string
  academicYear: string
  createdBy: ID
  /** Undefined means "add a new teacher". */
  editing: UserProfile | null
  subjects: Subject[]
  classes: ClassRoom[]
  onSaved: (id: string) => void
}

/**
 * Full teacher registration form. Reuses the CampusX form controls and design
 * tokens, collects personal, professional and credential details, and calls the
 * teacher service to create both the Auth account and the profile document.
 */
export function TeacherFormModal({
  open,
  onClose,
  schoolId,
  academicYear,
  createdBy,
  editing,
  subjects,
  classes,
  onSaved,
}: TeacherFormModalProps) {
  const isEdit = Boolean(editing)
  const [draft, setDraft] = useState<TeacherInput>(emptyTeacherInput)
  const [errors, setErrors] = useState<TeacherFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [idLoading, setIdLoading] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [result, setResult] = useState<CreateTeacherResult | null>(null)
  const [copied, setCopied] = useState(false)

  // Re-seed the form every time it opens for a different row.
  useEffect(() => {
    if (!open) return
    setErrors({})
    setFormError(null)
    setResult(null)
    setPhotoFile(null)
    setCopied(false)
    if (editing) {
      setDraft(teacherInputFromProfile(editing))
      setPhotoPreview(editing.photoUrl ?? null)
    } else {
      const fresh = emptyTeacherInput()
      setDraft(fresh)
      setPhotoPreview(null)
      setIdLoading(true)
      suggestTeacherId(schoolId, academicYear)
        .then((id) => setDraft((d) => (d.teacherId ? d : { ...d, teacherId: id })))
        .catch(() => undefined)
        .finally(() => setIdLoading(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id, schoolId, academicYear])

  // Release the object URL created for the local preview.
  useEffect(() => {
    return () => {
      if (photoPreview?.startsWith('blob:')) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  const set = (patch: Partial<TeacherInput>) => setDraft((d) => ({ ...d, ...patch }))

  const toggleSubject = (id: ID) =>
    set({
      subjectIds: draft.subjectIds.includes(id)
        ? draft.subjectIds.filter((s) => s !== id)
        : [...draft.subjectIds, id],
    })

  const toggleClass = (id: ID) =>
    set({
      classIds: draft.classIds.includes(id)
        ? draft.classIds.filter((c) => c !== id)
        : [...draft.classIds, id],
    })

  const classLabel = useMemo(() => {
    const map = new Map(classes.map((c) => [c.id, `Class ${c.classLevel}-${c.section}`]))
    return (id: ID) => map.get(id) ?? 'Class'
  }, [classes])

  function onPickPhoto(file: File | null) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setErrors((e) => ({ ...e, photo: 'Choose an image file.' }))
      return
    }
    if (file.size > 4 * 1024 * 1024) {
      setErrors((e) => ({ ...e, photo: 'Image must be smaller than 4 MB.' }))
      return
    }
    if (photoPreview?.startsWith('blob:')) URL.revokeObjectURL(photoPreview)
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setErrors((e) => {
      const next = { ...e }
      delete next.photo
      return next
    })
  }

  function generatePassword() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%'
    const bytes = new Uint8Array(12)
    if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes)
    else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256)
    const password = Array.from(bytes)
      .map((b) => chars[b % chars.length])
      .join('')
    set({ password, confirmPassword: password })
    setErrors((e) => {
      const next = { ...e }
      delete next.password
      delete next.confirmPassword
      return next
    })
  }

  async function uploadPhoto(uid: string): Promise<string | undefined> {
    if (!photoFile) return undefined
    const path = `avatars/${schoolId}/${uid}/${makeId()}`
    const uploaded = await db.uploadFile(path, photoFile, photoFile.name)
    return uploaded.url
  }

  async function handleSubmit() {
    const nextErrors = validateTeacherForm(draft, {
      requireCredentials: !isEdit,
      originalEmail: editing?.email,
    })
    if (hasErrors(nextErrors)) {
      setErrors(nextErrors)
      setFormError('Please fix the highlighted fields before saving.')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      if (editing) {
        const photoUrl = (await uploadPhoto(editing.id)) ?? undefined
        await updateTeacher(editing.id, {
          name: draft.name,
          email: draft.email,
          phone: draft.phone,
          address: draft.address,
          teacherId: draft.teacherId,
          designation: draft.designation,
          qualification: draft.qualification,
          joiningDate: draft.joiningDate,
          subjectIds: draft.subjectIds,
          classIds: draft.classIds,
          status: draft.status,
          photoUrl,
        })
        toast.success('Teacher updated')
        onSaved(editing.id)
        onClose()
      } else {
        const account = await createTeacher({
          schoolId,
          academicYear,
          createdBy,
          input: draft,
        })
        if (photoFile) {
          try {
            const url = await uploadPhoto(account.uid)
            if (url) await db.update(COLLECTIONS.users, account.uid, { photoUrl: url })
          } catch {
            toast.error('Teacher added, but the profile photo failed to upload.')
          }
        }
        toast.success(`${draft.name.trim()} added as a teacher`)
        setResult({ ...account, email: account.email })
        onSaved(account.uid)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save the teacher.'
      setFormError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function copyCredentials() {
    if (!result) return
    const lines = [
      `Name: ${draft.name.trim()}`,
      `Teacher ID: ${result.teacherId}`,
      `Login email: ${result.email}`,
      result.temporaryPassword ? `Temporary password: ${result.temporaryPassword}` : 'Password setup email sent.',
    ]
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      setCopied(true)
      toast.success('Credentials copied')
    } catch {
      toast.error('Could not copy to clipboard.')
    }
  }

  if (result) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        size="md"
        title="Teacher added"
        description="The account is ready. Share the sign-in details securely."
        footer={
          <Button onClick={onClose} icon={<CheckCircle2 className="size-4" />}>
            Done
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-success/25 bg-success-soft p-4">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink">{draft.name.trim()} now has a teacher account.</p>
              <p className="mt-0.5 text-xs text-muted">
                They can sign in immediately and will see only the classes and subjects you assigned.
              </p>
            </div>
          </div>

          <dl className="space-y-2 rounded-2xl border border-border bg-surface-2 p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Teacher ID</dt>
              <dd className="font-semibold text-ink">{result.teacherId}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Login email</dt>
              <dd className="truncate font-semibold text-ink">{result.email}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Temporary password</dt>
              <dd className="font-mono text-sm font-semibold text-ink">
                {result.temporaryPassword ?? '—'}
              </dd>
            </div>
          </dl>

          {result.inviteSent ? (
            <p className="flex items-start gap-2 text-xs text-muted">
              <Mail className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              A secure password-setup email was sent to {result.email}. They choose their own password on first sign-in.
            </p>
          ) : (
            <p className="flex items-start gap-2 text-xs text-muted">
              <KeyRound className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              Share this temporary password securely. The teacher is asked to change it on first sign-in.
            </p>
          )}

          <Button variant="secondary" fullWidth icon={<Copy className="size-4" />} onClick={() => void copyCredentials()}>
            {copied ? 'Copied' : 'Copy sign-in details'}
          </Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      dismissible={!saving}
      title={isEdit ? `Edit ${editing?.name ?? 'teacher'}` : 'Add teacher'}
      description={
        isEdit
          ? 'Update this teacher’s profile, assignments and account status.'
          : 'Create a teacher account with login credentials and class assignments.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            loading={saving}
            icon={isEdit ? undefined : <UserPlus className="size-4" />}
            onClick={() => void handleSubmit()}
          >
            {isEdit ? 'Save changes' : 'Create teacher'}
          </Button>
        </>
      }
    >
      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault()
          void handleSubmit()
        }}
      >
        {formError && <InlineError message={formError} />}

        {/* ── Personal details ── */}
        <Section title="Personal details">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Input
              label="Full name"
              required
              value={draft.name}
              error={errors.name}
              autoComplete="name"
              onChange={(e) => set({ name: e.target.value })}
              placeholder="Meera Iyer"
            />
            <Input
              label="Email address"
              type="email"
              required
              value={draft.email}
              error={errors.email}
              autoComplete="email"
              onChange={(e) => set({ email: e.target.value })}
              placeholder="meera@abcpubschool.edu.in"
            />
            <Input
              label="Phone number"
              type="tel"
              value={draft.phone}
              error={errors.phone}
              autoComplete="tel"
              onChange={(e) => set({ phone: e.target.value })}
              placeholder="+91 98765 43210"
            />
            <PhotoField
              preview={photoPreview}
              error={errors.photo}
              onPick={onPickPhoto}
              onClear={() => {
                if (photoPreview?.startsWith('blob:')) URL.revokeObjectURL(photoPreview)
                setPhotoFile(null)
                setPhotoPreview(null)
              }}
            />
          </div>
          <Textarea
            label="Address"
            rows={2}
            value={draft.address}
            onChange={(e) => set({ address: e.target.value })}
            placeholder="House / street, area, city"
          />
        </Section>

        {/* ── Professional details ── */}
        <Section title="Professional details">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Input
              label="Teacher ID"
              value={draft.teacherId}
              error={errors.teacherId}
              onChange={(e) => set({ teacherId: e.target.value })}
              placeholder={idLoading ? 'Generating…' : 'TCH-2026-0001'}
              hint="Auto-generated and unique. Edit only if your school uses its own scheme."
              suffix={
                <button
                  type="button"
                  aria-label="Regenerate teacher ID"
                  className="text-muted transition hover:text-brand"
                  onClick={() => {
                    setIdLoading(true)
                    suggestTeacherId(schoolId, academicYear)
                      .then((id) => set({ teacherId: id }))
                      .finally(() => setIdLoading(false))
                  }}
                >
                  <RefreshCw className={cn('size-3.5', idLoading && 'animate-spin')} />
                </button>
              }
            />
            <Input
              label="Designation"
              required
              value={draft.designation}
              error={errors.designation}
              onChange={(e) => set({ designation: e.target.value })}
              placeholder="Senior Mathematics Teacher"
            />
            <Input
              label="Qualification"
              value={draft.qualification}
              onChange={(e) => set({ qualification: e.target.value })}
              placeholder="M.Sc., B.Ed."
            />
            <Input
              label="Joining date"
              type="date"
              required
              value={draft.joiningDate}
              error={errors.joiningDate}
              onChange={(e) => set({ joiningDate: e.target.value })}
            />
          </div>

          <Field label="Employment status">
            <div className="flex flex-wrap gap-2">
              {(['active', 'inactive'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  aria-pressed={draft.status === status}
                  onClick={() => set({ status })}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize transition',
                    draft.status === status
                      ? 'border-brand bg-brand-soft text-brand'
                      : 'border-border bg-surface-2 text-muted hover:text-ink'
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          </Field>

          <ChipSelect
            legend="Assigned subjects"
            hint="Subjects this teacher can create content and questions for."
            error={errors.subjectIds}
            options={subjects.map((s) => ({ id: s.id, label: s.name, color: s.color }))}
            selected={draft.subjectIds}
            onToggle={toggleSubject}
            emptyLabel="No subjects created yet."
          />

          <ChipSelect
            legend="Assigned classes"
            hint="Classes whose students this teacher can see."
            error={errors.classIds}
            options={classes.map((c) => ({ id: c.id, label: classLabel(c.id) }))}
            selected={draft.classIds}
            onToggle={toggleClass}
            emptyLabel="No classes created yet."
          />
        </Section>

        {/* ── Login credentials ── */}
        <Section title="Login credentials">
          <Input
            label="Login email"
            value={draft.email}
            readOnly
            hint="Teachers sign in with their email address."
            className="sm:max-w-sm"
            icon={<Mail className="size-3.5" />}
          />

          {isEdit ? (
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface-2 p-3.5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted">
                Reset this teacher’s password or send them a secure setup link.
              </p>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                icon={<KeyRound className="size-3.5" />}
                onClick={() => {
                  if (!isTeacherEmailValid(draft.email)) {
                    toast.error('Enter a valid email address first.')
                    return
                  }
                  void db
                    .resetPassword(draft.email.trim().toLowerCase())
                    .then(() => toast.success('Password setup email sent'))
                    .catch((e: unknown) =>
                      toast.error(e instanceof Error ? e.message : 'Could not send the email.')
                    )
                }}
              >
                Send password setup email
              </Button>
            </div>
          ) : (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    { value: 'password', title: 'Set a temporary password', body: 'Share it securely; the teacher changes it on first sign-in.' },
                    { value: 'invite', title: 'Email a secure setup link', body: 'The teacher chooses their own password from the email.' },
                  ] as { value: PasswordMode; title: string; body: string }[]
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={draft.passwordMode === opt.value}
                    onClick={() => set({ passwordMode: opt.value })}
                    className={cn(
                      'rounded-xl border p-3 text-left transition',
                      draft.passwordMode === opt.value
                        ? 'border-brand bg-brand-soft ring-2 ring-brand/25'
                        : 'border-border bg-surface-2 hover:border-border-strong'
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                      {opt.value === 'password' ? <KeyRound className="size-4" /> : <Mail className="size-4" />}
                      {opt.title}
                    </span>
                    <span className="mt-1 block text-xs text-muted">{opt.body}</span>
                  </button>
                ))}
              </div>

              {draft.passwordMode === 'password' && (
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <Input
                    label="Temporary password"
                    type="text"
                    required
                    value={draft.password}
                    error={errors.password}
                    autoComplete="new-password"
                    onChange={(e) => set({ password: e.target.value })}
                    placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                    suffix={
                      <button
                        type="button"
                        className="text-muted transition hover:text-brand"
                        onClick={generatePassword}
                      >
                        Generate
                      </button>
                    }
                  />
                  <Input
                    label="Confirm password"
                    type="text"
                    required
                    value={draft.confirmPassword}
                    error={errors.confirmPassword}
                    autoComplete="new-password"
                    onChange={(e) => set({ confirmPassword: e.target.value })}
                    placeholder="Re-enter the password"
                  />
                </div>
              )}
            </>
          )}

          {!isEdit && (
            <p className="flex items-start gap-2 text-xs text-muted">
              <KeyRound className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              Passwords are never stored in plain text — they are managed by the
              authentication provider, and never returned by the API.
            </p>
          )}
        </Section>
      </form>
    </Modal>
  )
}

/* ── Small local building blocks ────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3.5">
      <h3 className="border-b border-border pb-1.5 text-xs font-bold tracking-wide text-muted uppercase">
        {title}
      </h3>
      {children}
    </section>
  )
}

function ChipSelect({
  legend,
  hint,
  error,
  options,
  selected,
  onToggle,
  emptyLabel,
}: {
  legend: string
  hint: string
  error?: string
  options: { id: ID; label: string; color?: string }[]
  selected: ID[]
  onToggle: (id: ID) => void
  emptyLabel: string
}) {
  return (
    <Field label={legend} hint={hint} error={error}>
      {options.length === 0 ? (
        <p className="text-xs text-muted">{emptyLabel}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const active = selected.includes(option.id)
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => onToggle(option.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition',
                  active
                    ? 'border-brand bg-brand-soft text-brand'
                    : 'border-border bg-surface-2 text-muted hover:text-ink'
                )}
              >
                {option.color && (
                  <span className="size-2 rounded-full" style={{ backgroundColor: option.color }} aria-hidden />
                )}
                {option.label}
              </button>
            )
          })}
        </div>
      )}
    </Field>
  )
}

function PhotoField({
  preview,
  error,
  onPick,
  onClear,
}: {
  preview: string | null
  error?: string
  onPick: (file: File | null) => void
  onClear: () => void
}) {
  const inputId = 'teacher-photo-input'
  return (
    <Field label="Profile photo" hint="Optional. PNG or JPG, up to 4 MB." error={error}>
      <div className="flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-surface-2">
          {preview ? (
            <img src={preview} alt="" className="size-full object-cover" />
          ) : (
            <ImagePlus className="size-5 text-muted" aria-hidden />
          )}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => document.getElementById(inputId)?.click()}
            className="rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs font-semibold text-ink transition hover:bg-surface-3"
          >
            Choose photo
          </button>
          {preview && (
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-semibold text-muted transition hover:text-danger"
            >
              Remove
            </button>
          )}
        </div>
        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
      </div>
    </Field>
  )
}
