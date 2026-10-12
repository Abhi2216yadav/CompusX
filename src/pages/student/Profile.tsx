import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  BellOff,
  CheckCheck,
  Flame,
  HelpCircle,
  LogOut,
  Medal,
  Save,
  Settings,
  Shield,
  UserCog,
} from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { COLLECTIONS } from '@/services/db'
import { resetDemoData } from '@/services'
import type { Contribution } from '@/services/types'
import { useCollection } from '@/hooks/useCollection'
import { useSchoolData } from '@/hooks/useSchoolData'
import { PageHeader, SectionCard, StatTile } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { ConfirmDialog } from '@/components/ui/Modal'
import { EmptyState, LoadingState, Progress } from '@/components/ui/Feedback'
import { nextLevelInfo, reputationLevel, CONTRIBUTION_LABELS } from '@/services/ranking'
import { formatDate, relativeTime } from '@/utils/date'

const ROLES: { value: 'student' | 'teacher' | 'admin'; label: string; description: string }[] = [
  { value: 'student', label: 'Student', description: 'Study, tests and school updates' },
  { value: 'teacher', label: 'Teacher', description: 'Classes, content and moderation' },
  { value: 'admin', label: 'Admin', description: 'Full school management' },
]

export default function Profile() {
  const { profile, school, updateProfile, signOut, demoMode } = useAuth()
  const { classById, subjectById } = useSchoolData(profile?.schoolId)
  const { theme, setTheme } = useTheme()

  const [name, setName] = useState(profile?.name ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [saving, setSaving] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const contributions = useCollection<Contribution>(
    COLLECTIONS.contributions,
    {
      where: [
        { field: 'schoolId', op: '==', value: profile?.schoolId ?? '' },
        { field: 'studentId', op: '==', value: profile?.id ?? '' },
      ],
      orderBy: [{ field: 'createdAt', dir: 'desc' }],
    },
    [profile?.schoolId, profile?.id]
  )

  const totalPoints = useMemo(
    () => contributions.data.reduce((sum, c) => sum + (c.points ?? 0), 0),
    [contributions.data]
  )

  if (!profile) return <LoadingState label="Loading your profile…" rows={3} />

  const classRoom = profile.classId ? classById.get(profile.classId) : null
  const level = reputationLevel(totalPoints)
  const next = nextLevelInfo(totalPoints)

  async function save() {
    setSaving(true)
    try {
      await updateProfile({ name: name.trim(), bio: bio.trim() || undefined, phone: phone.trim() || undefined })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Profile"
        description="Your CampusX account, study contribution history and preferences."
        action={
          <Button
            variant="secondary"
            size="sm"
            icon={<LogOut className="size-4" />}
            onClick={() => void signOut()}
          >
            Sign out
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="rounded-2xl bg-gradient-to-br from-brand to-brand-hover p-5 text-white shadow-card">
            <div className="flex items-center gap-3">
              <span className="grid size-14 place-items-center rounded-full bg-white/20 text-lg font-black">
                {name.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-base font-extrabold">{name}</h2>
                <p className="truncate text-xs text-white/75">{profile.email}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              <span className="rounded-lg bg-white/20 px-2 py-1 text-[11px] font-bold capitalize">
                {ROLES.find((r) => r.value === profile.role)?.label ?? profile.role}
              </span>
              {profile.rollNo && (
                <span className="rounded-lg bg-white/20 px-2 py-1 text-[11px] font-bold">Roll {profile.rollNo}</span>
              )}
            </div>

            <dl className="mt-4 space-y-1.5 text-xs text-white/85">
              <div className="flex justify-between gap-3">
                <dt className="opacity-75">School</dt>
                <dd className="truncate font-semibold">{school?.name ?? '—'}</dd>
              </div>
              {classRoom && (
                <div className="flex justify-between gap-3">
                  <dt className="opacity-75">Class</dt>
                  <dd className="font-semibold">
                    {classRoom.classLevel}-{classRoom.section}
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="opacity-75">Academic year</dt>
                <dd className="font-semibold">{profile.academicYear}</dd>
              </div>
              {profile.subjects && profile.subjects.length > 0 && (
                <div>
                  <dt className="opacity-75">Subjects</dt>
                  <dd className="mt-1 flex flex-wrap gap-1">
                    {profile.subjects.map((id) => (
                      <span key={id} className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">
                        {subjectById.get(id)?.code ?? id}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {profile.role === 'student' && (
            <div className="mt-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-ink">
                  <Flame className="size-3.5 text-gold" aria-hidden />
                  {level}
                </span>
                <Badge tone="brand">{totalPoints} pts</Badge>
              </div>
              <Progress className="mt-2.5" value={next.progress} tone="brand" />
              <p className="mt-1.5 text-[11px] text-muted">
                {next.next
                  ? `${next.pointsToNext} more to reach ${next.next}`
                  : 'Highest reputation level reached'}
              </p>
              <Link
                to="/leaderboard/me"
                className="mt-2.5 inline-flex text-[11px] font-bold text-brand hover:underline"
              >
                View my leaderboard report
              </Link>
            </div>
          )}

          {demoMode && (
            <div className="mt-3 rounded-2xl border border-info/25 bg-info-soft p-4">
              <p className="text-xs font-bold text-info">Demo mode</p>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-2">
                All data lives in this browser only. Resetting restores the seeded demo school.
              </p>
              <Button
                size="sm"
                variant="secondary"
                className="mt-2.5"
                onClick={() => setConfirmReset(true)}
              >
                Reset demo data
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-4 lg:col-span-2">
          <SectionCard title="Your details" icon={<UserCog className="size-4" />}>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
              <Input label="Email" value={profile.email} disabled hint="Contact your admin to change this" />
              <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
              <Input
                label="Class"
                value={
                  profile.role === 'student'
                    ? classRoom
                      ? `${classRoom.classLevel}-${classRoom.section}`
                      : 'Not assigned'
                    : profile.designation ?? 'Staff'
                }
                disabled
              />
            </div>
            <div className="mt-3.5">
              <Textarea
                label="About"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A short bio shown to your classmates and teachers."
              />
            </div>
            <Button
              className="mt-3.5"
              loading={saving}
              disabled={!name.trim() || name.trim() === profile.name}
              icon={<Save className="size-4" />}
              onClick={() => void save()}
            >
              Save changes
            </Button>
          </SectionCard>

          <SectionCard title="Appearance" icon={<Settings className="size-4" />}>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={theme === 'light' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setTheme('light')}
              >
                Light
              </Button>
              <Button
                variant={theme === 'dark' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setTheme('dark')}
              >
                Dark
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted">Your choice is remembered on this device.</p>
          </SectionCard>

          <SectionCard title="What this role can do" icon={<Shield className="size-4" />}>
            <ul className="space-y-2 text-sm text-ink-2">
              <RoleRow icon={<Medal className="size-3.5" />} label="Leaderboard" value="View the school leaderboard and drill into any student's progress." />
              <RoleRow icon={<Bell className="size-3.5" />} label="Notifications" value="Receive homework, notice and event notifications." />
              <RoleRow icon={<BellOff className="size-3.5" />} label="Privacy" value="You only ever see data for your own school." />
              <RoleRow icon={<CheckCheck className="size-3.5" />} label="Role" value={`Signed in as ${profile.role}. An admin can change your role.`} />
            </ul>
          </SectionCard>

          <SectionCard
            title="Recent contributions"
            subtitle={profile.role === 'student' ? 'How you have helped the school community' : undefined}
            icon={<HelpCircle className="size-4" />}
          >
            {contributions.loading ? (
              <LoadingState rows={2} />
            ) : contributions.data.length === 0 ? (
              <EmptyState
                compact
                title="No contributions yet"
                description="Share material, answer a classmate or register for an event to start earning points."
              />
            ) : (
              <ul className="divide-y divide-border">
                {contributions.data.slice(0, 8).map((c) => (
                  <li key={c.id} className="flex items-center gap-3 py-2.5">
                    <span className="tabular w-10 shrink-0 text-right text-xs font-bold text-brand">
                      +{c.points}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ink">{CONTRIBUTION_LABELS[c.kind] ?? c.kind}</span>
                      <span className="block text-[11px] text-muted">{relativeTime(c.createdAt)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Account" icon={<Settings className="size-4" />}>
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Member since" value={formatDate(profile.createdAt)} tone="info" />
              <StatTile
                label="Collections"
                value={Object.keys(COLLECTIONS).length}
                tone="brand"
                hint="Firestore collections in this schema"
              />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Never share your password. CampusX staff will never ask for it. If you suspect someone has accessed your
              account, sign out and contact your school admin.
            </p>
          </SectionCard>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset demo data?"
        message="This clears everything stored in this browser and restores the seeded demo school. You will be signed out."
        confirmLabel="Reset and sign out"
        loading={false}
        onCancel={() => setConfirmReset(false)}
        onConfirm={async () => {
          resetDemoData()
          setConfirmReset(false)
          await signOut()
        }}
      />
    </div>
  )
}

function RoleRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-0.5 shrink-0 text-brand">{icon}</span>
      <span>
        <strong className="text-ink">{label}</strong> — {value}
      </span>
    </li>
  )
}