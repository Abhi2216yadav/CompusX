import { useMemo, useState } from 'react'
import { Building2, Save, RotateCcw, Image as ImageIcon } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { COLLECTIONS } from '@/services/db'
import type { School } from '@/services/types'
import { useDocument } from '@/hooks/useCollection'
import { useSaver } from '@/hooks/useSchoolData'
import { resetDemoData } from '@/services'
import { PageHeader, SectionCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Switch } from '@/components/ui/Input'
import { ConfirmDialog } from '@/components/ui/Modal'
import { LoadingState } from '@/components/ui/Feedback'

const YEAR_OPTIONS = ['2026-27', '2025-26', '2027-28']

export default function AdminSettings() {
  const { profile } = useAuth()
  const schoolId = profile?.schoolId ?? ''
  const { save } = useSaver()

  const school = useDocument<School>(COLLECTIONS.schools, schoolId, [schoolId])
  const [saving, setSaving] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetting, setResetting] = useState(false)

  const [form, setForm] = useState<Partial<School>>({})

  const base = school.data
  const value = useMemo(() => {
    return {
      name: form.name ?? base?.name ?? '',
      code: form.code ?? base?.code ?? '',
      address: form.address ?? base?.address ?? '',
      city: form.city ?? base?.city ?? '',
      email: form.email ?? base?.email ?? '',
      phone: form.phone ?? base?.phone ?? '',
      logoUrl: form.logoUrl ?? base?.logoUrl ?? '',
      currentAcademicYear: form.currentAcademicYear ?? base?.currentAcademicYear ?? YEAR_OPTIONS[0],
    }
  }, [form, base])

  function set(patch: Partial<School>) {
    setForm((f) => ({ ...f, ...patch }))
  }

  async function persist(next: Partial<School>, message: string) {
    if (!base) return
    setSaving(true)
    await save(COLLECTIONS.schools, { ...base, ...next } as { id?: string }, {
      id: schoolId,
      success: message,
    })
    setSaving(false)
  }

  const leaderboardPublic = base?.leaderboardPublic ?? true
  const peerLearningEnabled = base?.peerLearningEnabled ?? true

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="School settings"
        description="The identity, contact details and platform switches every CampusX page reads."
      />

      {school.loading ? (
        <LoadingState label="Loading school settings…" rows={4} />
      ) : (
        <div className="space-y-4">
          <SectionCard
            title="School profile"
            subtitle="Shown on every page header and on generated documents."
            icon={<Building2 className="size-4" />}
          >
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Input
                label="School name"
                value={value.name}
                onChange={(e) => set({ name: e.target.value })}
              />
              <Input label="School code" value={value.code} onChange={(e) => set({ code: e.target.value })} />
              <Input
                label="Address"
                className="sm:col-span-2"
                value={value.address}
                onChange={(e) => set({ address: e.target.value })}
              />
              <Input label="City" value={value.city} onChange={(e) => set({ city: e.target.value })} />
              <Input label="Phone" value={value.phone} onChange={(e) => set({ phone: e.target.value })} />
              <Input label="Email" type="email" value={value.email} onChange={(e) => set({ email: e.target.value })} />
              <Input
                label="Current academic year"
                list="cx-academic-years"
                value={value.currentAcademicYear}
                onChange={(e) => set({ currentAcademicYear: e.target.value })}
                hint="e.g. 2026-27"
              />
              <datalist id="cx-academic-years">
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y} />
                ))}
              </datalist>
              <Input
                label="Logo URL"
                value={value.logoUrl}
                onChange={(e) => set({ logoUrl: e.target.value })}
                placeholder="https://…"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <div className="flex items-center gap-3">
                <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-brand-soft text-brand">
                  {value.logoUrl ? (
                    <img src={value.logoUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <ImageIcon className="size-5" aria-hidden />
                  )}
                </span>
                <p className="text-xs text-muted">
                  Logo preview
                  <span className="block text-[11px] text-muted">Leave blank to use the placeholder mark.</span>
                </p>
              </div>
              <Button
                icon={<Save className="size-4" />}
                loading={saving}
                onClick={() => void persist(value, 'School updated')}
              >
                Save changes
              </Button>
            </div>
          </SectionCard>

          <SectionCard title="Platform switches" subtitle="Applied instantly for every student and teacher.">
            <div className="space-y-4">
              <div className="rounded-xl bg-surface-2 p-3.5">
                <Switch
                  label="Public leaderboard"
                  description="When off, students only see their own rank."
                  checked={leaderboardPublic}
                  disabled={saving}
                  onChange={(next) => void persist({ leaderboardPublic: next }, 'Leaderboard visibility updated')}
                />
              </div>
              <div className="rounded-xl bg-surface-2 p-3.5">
                <Switch
                  label="Peer learning"
                  description="Turn off to hide the student Q&A board."
                  checked={peerLearningEnabled}
                  disabled={saving}
                  onChange={(next) => void persist({ peerLearningEnabled: next }, 'Peer learning updated')}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Demo data"
            subtitle="Wipes the local store and rebuilds the seeded school from scratch."
          >
            <Button variant="danger" icon={<RotateCcw className="size-4" />} onClick={() => setConfirmReset(true)}>
              Reset demo data
            </Button>
          </SectionCard>
        </div>
      )}

      <ConfirmDialog
        open={confirmReset}
        title="Reset all demo data?"
        message="Every student, attempt, notice and club goes back to the original seeded state and you will be signed out."
        confirmLabel="Reset everything"
        loading={resetting}
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setResetting(true)
          resetDemoData()
          setResetting(false)
          setConfirmReset(false)
        }}
      />
    </div>
  )
}