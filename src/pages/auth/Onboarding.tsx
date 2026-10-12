import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, GraduationCap, LogOut, Sparkles } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { COLLECTIONS } from '@/services/db'
import { db } from '@/services'
import { useCollection } from '@/hooks/useCollection'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Card, PageHeader } from '@/components/ui/Card'
import { InlineError, LoadingState } from '@/components/ui/Feedback'
import type { ClassRoom } from '@/services/types'
import { classLabel } from '@/utils/format'
import { cn } from '@/utils/cn'

interface OnboardingState {
  name: string
  classId: string
  rollNo: string
}

export default function Onboarding() {
  const { authUser, profile, loading, signOut, updateProfile, school } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState<OnboardingState>({
    name: '',
    classId: '',
    rollNo: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [submitError, setSubmitError] = useState('')

  const classes = useCollection<ClassRoom>(COLLECTIONS.classes, undefined, [])
  const classList = classes.data

  // Already onboarded → straight to the right dashboard.
  useEffect(() => {
    if (!loading && profile) {
      navigate(
        profile.role === 'admin' ? '/admin' : profile.role === 'teacher' ? '/teacher' : '/dashboard',
        { replace: true }
      )
    }
  }, [profile, loading, navigate])

  const classById = new Map(classList.map((c) => [c.id, c]))
  const chosen = classById.get(form.classId)

  async function handleContinue() {
    setError('')
    setSubmitError('')

    const name = form.name.trim()
    if (name.length < 2) {
      setError('Please enter your full name.')
      return
    }
    if (!form.classId) {
      setError('Please select your class.')
      return
    }
    if (!authUser) {
      setSubmitError('Your session expired. Please sign in again.')
      return
    }

    setBusy(true)
    try {
      const schoolId = school?.id ?? 'school-abc'
      await db.create(
        COLLECTIONS.users,
        {
          id: authUser.uid,
          schoolId,
          role: 'student',
          name,
          email: authUser.email ?? '',
          academicYear: school?.currentAcademicYear ?? '2026-27',
          classId: form.classId,
          classLevel: chosen?.classLevel,
          section: chosen?.section,
          rollNo: form.rollNo.trim() || undefined,
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        authUser.uid
      )
      // Re-reads the document into `profile`, which triggers the redirect above.
      await updateProfile({})
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Could not finish setting up your account.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg">
        <LoadingState label="Preparing your account…" />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-bg px-5 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-xl bg-brand text-base font-black text-white">
              CX
            </span>
            <div>
              <p className="text-sm font-extrabold text-ink">Welcome to CampusX</p>
              <p className="text-xs text-muted">{school?.name ?? 'Your school'}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" icon={<LogOut className="size-3.5" />} onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>

        <PageHeader
          title="Finish setting up"
          description="Tell us a little about yourself so your teachers and classmates can recognise you."
        />

        <Card>
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-xs font-bold tracking-wide text-muted uppercase">I am joining as</p>
              <div className="flex flex-wrap gap-3">
                <div className="flex flex-1 items-center gap-3 rounded-xl border border-brand/50 bg-brand/10 px-4 py-3 shadow-sm">
                  <GraduationCap className="size-5 text-brand" aria-hidden />
                  <div>
                    <p className="text-sm font-bold text-brand">Student account</p>
                    <p className="text-[11px] text-brand/90">
                      Take quizzes, mock tests, track attendance and see your leaderboard rank.
                    </p>
                  </div>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted">
                Teacher and admin accounts are created by the school principal — contact them if you need access.
              </p>
            </div>

            <Input
              label="Full name"
              placeholder="As it should appear on the leaderboard"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />

            <Select
              label="Class"
              value={form.classId}
              onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
              placeholder="Select your class"
              options={classList.map((c) => ({
                value: c.id,
                label: classLabel(c.classLevel, c.section),
              }))}
              required
            />
            {chosen && (
              <p className="-mt-2 flex items-center gap-1.5 text-xs font-semibold text-brand">
                <GraduationCap className="size-3.5" aria-hidden />
                Section {chosen.section} · {chosen.name}
              </p>
            )}
            <Input
              label="Roll number"
              placeholder="e.g. 14"
              value={form.rollNo}
              onChange={(e) => setForm((f) => ({ ...f, rollNo: e.target.value }))}
              hint="Optional — used by your teacher for attendance."
            />

            {error && <InlineError message={error} />}
            {submitError && <InlineError message={submitError} />}

            <Button
              fullWidth
              size="lg"
              loading={busy}
              icon={<ArrowRight className="size-4" />}
              onClick={() => void handleContinue()}
            >
              Enter CampusX
            </Button>

            <p
              className={cn(
                'flex items-start gap-1.5 rounded-xl bg-surface-2 px-3 py-2.5 text-[11px] leading-relaxed text-muted'
              )}
            >
              <Sparkles className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden />
              A teacher or admin assigns your subjects. You can update your profile any time from the Profile
              page.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}