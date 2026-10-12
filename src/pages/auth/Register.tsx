import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, UserPlus } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { InlineError } from '@/components/ui/Feedback'
import { DEMO_ACCOUNTS, isDemoMode } from '@/services'
import { cn } from '@/utils/cn'

const STRENGTH = [
  { label: 'Too short', test: (v: string) => v.length >= 8 },
  { label: 'Weak', test: (v: string) => /[A-Z]/.test(v) && /[a-z]/.test(v) },
  { label: 'Fair', test: (v: string) => /\d/.test(v) && v.length >= 10 },
  { label: 'Strong', test: (v: string) => /[^A-Za-z0-9]/.test(v) && v.length >= 12 },
]

function strengthOf(value: string) {
  let level = 0
  for (const s of STRENGTH) if (s.test(value)) level += 1
  return level
}

export default function Register() {
  const { signUp, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const strength = strengthOf(password)
  const valid =
    name.trim().length >= 2 &&
    /.+@.+\..+/.test(email.trim()) &&
    strength >= 2 &&
    password === confirm &&
    accepted

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!valid) {
      setError('Please complete every field and meet the password requirements.')
      return
    }
    setBusy(true)
    try {
      await signUp(email.trim().toLowerCase(), password, name.trim())
      navigate('/welcome', { replace: true })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not create your account. Please try again.'
      )
      setBusy(false)
    }
  }

  async function handleGoogle() {
    setError('')
    setBusy(true)
    try {
      await signInWithGoogle()
      navigate('/welcome', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-up failed.')
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1fr]">
      <div className="flex flex-col justify-center px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <Link
            to="/login"
            className="mb-8 inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-brand"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Back to sign in
          </Link>

          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Create your account</h1>
          <p className="mt-1.5 text-sm text-muted">
            Join your school's CampusX workspace. You'll pick your class next.
          </p>

          {isDemoMode && (
            <div className="mt-5 rounded-xl border border-warn/30 bg-warn-soft p-4">
              <p className="text-xs leading-relaxed font-semibold text-ink-2">
                Running in demo mode. New accounts work fully, but they start with an empty class so there is no
                content to show yet. To explore everything, sign in as a seeded account:
              </p>
              <div className="mt-2.5 grid gap-1.5">
                {(['student', 'teacher', 'admin'] as const).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => navigate('/login')}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-left text-xs transition hover:bg-brand-soft'
                    )}
                  >
                    <span className="truncate font-bold text-ink">{DEMO_ACCOUNTS[role].name}</span>
                    <span className="shrink-0 font-mono text-[10px] text-muted">
                      {DEMO_ACCOUNTS[role].email}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <Input
              label="Full name"
              autoComplete="name"
              placeholder="Abhay Mishra"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="School email"
              type="email"
              autoComplete="email"
              placeholder="you@school.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div>
              <Input
                label="Password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {password && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className={cn(
                          'h-1 flex-1 rounded-full transition',
                          i <= strength
                            ? strength <= 1
                              ? 'bg-danger'
                              : strength === 2
                                ? 'bg-warn'
                                : 'bg-success'
                            : 'bg-border'
                        )}
                      />
                    ))}
                  </div>
                  <p className="mt-1 text-[11px] text-muted">
                    {STRENGTH[Math.max(0, strength - 1)].label} — mix upper case, lower case, a number and a symbol
                  </p>
                </div>
              )}
            </div>
            <Input
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat your password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              error={confirm && confirm !== password ? 'Passwords do not match' : undefined}
              required
            />

            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-[var(--cx-brand)]"
              />
              <span className="text-xs leading-relaxed text-muted">
                I agree to the school's acceptable-use policy and to my data being used to show my own progress and
                ranking within CampusX.
              </span>
            </label>

            {error && <InlineError message={error} />}

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={busy}
              disabled={!valid}
              icon={<UserPlus className="size-4" />}
            >
              Create account
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-semibold text-muted">OR</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" fullWidth size="lg" onClick={handleGoogle} disabled={busy}>
            Continue with Google
          </Button>

          <ul className="mt-6 space-y-1.5">
            {['Timed mock tests that survive refreshes', 'Board PYQs and chapter quizzes', 'A fair, transparent leaderboard'].map(
              (item) => (
                <li key={item} className="flex items-center gap-2 text-xs text-muted">
                  <CheckCircle2 className="size-3.5 shrink-0 text-success" aria-hidden />
                  {item}
                </li>
              )
            )}
          </ul>

          <p className="mt-6 text-center text-sm text-muted">
            Already registered?{' '}
            <Link to="/login" className="font-bold text-brand hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-gradient-to-br from-accent via-brand to-brand p-12 lg:flex lg:flex-col lg:justify-center">
        <div className="absolute -top-20 -right-20 size-80 rounded-full bg-white/10 blur-3xl" />
        <div className="relative max-w-md">
          <h2 className="text-3xl leading-tight font-black text-white">
            Everything you need to prepare for boards.
          </h2>
          <ul className="mt-8 space-y-3">
            {[
              ['Chapter-wise study material', 'Notes, PDFs and revision sheets uploaded by your teachers.'],
              ['Practice with instant feedback', 'Every answer comes with an explanation so you learn, not guess.'],
              ['See exactly where you stand', 'Subject mastery, weak chapters and your live rank.'],
            ].map(([title, body]) => (
              <li key={title} className="rounded-xl bg-white/10 p-4 backdrop-blur">
                <p className="text-sm font-bold text-white">{title}</p>
                <p className="mt-0.5 text-xs text-white/70">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}