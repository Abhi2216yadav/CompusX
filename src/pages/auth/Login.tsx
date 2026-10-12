import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, GraduationCap, KeyRound, ShieldCheck, Sparkles } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { InlineError } from '@/components/ui/Feedback'
import { DEMO_ACCOUNTS } from '@/services'
import { cn } from '@/utils/cn'

export default function Login() {
  const { signIn, signInWithGoogle, profile, demoMode } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (profile) navigate(from ?? homeFor(profile.role), { replace: true })
  }, [profile, from, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    setBusy(true)
    try {
      await signIn(email.trim().toLowerCase(), password)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not sign you in. Check your credentials and try again.'
      )
      setBusy(false)
    }
  }

  async function handleGoogle() {
    setError('')
    setBusy(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.')
      setBusy(false)
    }
  }

  const demoAccounts = demoAccountsList

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      {/* Form side */}
      <div className="flex flex-col justify-center px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-brand"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Back to home
          </Link>

          <div className="mb-6 flex items-center gap-2.5">
            <span className="grid size-11 place-items-center rounded-xl bg-brand text-lg font-black text-white">
              CX
            </span>
            <div>
              <p className="text-lg font-extrabold tracking-tight text-ink">CampusX</p>
              <p className="text-xs text-muted">Sign in to continue</p>
            </div>
          </div>

          {demoMode && (
            <p className="mb-5 flex items-start gap-2 rounded-xl border border-info/25 bg-info-soft px-3.5 py-3 text-xs leading-relaxed text-ink-2">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
              <span>
                <span className="font-bold">Demo mode.</span> Running on local data — pick any account below to
                explore the role.
              </span>
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
              <div className="flex items-center justify-between">
                <label className="mb-1.5 block text-xs font-semibold text-ink-2" htmlFor="password">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs font-semibold text-brand hover:underline">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pr-16"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-bold text-muted transition hover:text-ink"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && <InlineError message={error} />}

            <Button type="submit" fullWidth size="lg" loading={busy} icon={<KeyRound className="size-4" />}>
              Sign in
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-semibold text-muted">OR</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            variant="outline"
            fullWidth
            size="lg"
            onClick={handleGoogle}
            disabled={busy}
            icon={
              <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.05l3.66 2.84c.87-2.6 3.3-4.51 6.16-4.51Z"
                />
              </svg>
            }
          >
            Continue with Google
          </Button>

          <p className="mt-6 text-center text-sm text-muted">
            New to CampusX?{' '}
            <Link to="/register" className="font-bold text-brand hover:underline">
              Create an account
            </Link>
          </p>

          {/* Demo quick-fill */}
          <div className="mt-6 rounded-xl border border-border bg-surface-2 p-4">
            <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-muted uppercase">
              <ShieldCheck className="size-3.5" aria-hidden />
              Demo accounts
            </p>
            <div className="grid gap-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => {
                    setEmail(acc.email)
                    setPassword(acc.password)
                  }}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-left transition',
                    'hover:border-brand/40 hover:bg-brand-soft'
                  )}
                >
                  <span
                    className={cn(
                      'grid size-7 shrink-0 place-items-center rounded-md text-[10px] font-black text-white',
                      acc.role === 'student'
                        ? 'bg-brand'
                        : acc.role === 'teacher'
                          ? 'bg-info'
                          : 'bg-accent'
                    )}
                  >
                    {acc.role === 'student' ? (
                      <GraduationCap className="size-3.5" />
                    ) : (
                      acc.role[0].toUpperCase()
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-ink">{acc.name}</span>
                    <span className="block truncate text-[11px] text-muted">{acc.email}</span>
                  </span>
                  <span className="shrink-0 rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold text-muted capitalize">
                    {acc.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Marketing side */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand via-brand to-accent p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 size-80 rounded-full bg-black/10 blur-3xl" />

        <div className="relative">
          <p className="text-sm font-bold tracking-widest text-white/60 uppercase">CampusX</p>
          <h2 className="mt-4 max-w-md text-3xl leading-tight font-black text-white xl:text-4xl">
            One platform for studying, practising and standing out.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/75">
            Quizzes, board PYQs, timed mock tests, live rankings, attendance and school announcements — built for
            students, teachers and administrators.
          </p>
        </div>

        <ul className="relative mt-10 grid gap-4">
          {[
            ['Refresh-safe mock tests', 'Your timer is absolute — reload or switch tabs, you never lose time.'],
            ['Transparent ranking', 'Performance, consistency and help. Never attendance.'],
            ['Role-based access', 'Students, teachers and admins each get exactly what they need.'],
          ].map(([title, body]) => (
            <li key={title} className="flex gap-3 rounded-xl bg-white/10 p-4 backdrop-blur">
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-white/20 text-xs font-bold text-white">
                ✓
              </span>
              <div>
                <p className="text-sm font-bold text-white">{title}</p>
                <p className="mt-0.5 text-xs text-white/70">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function homeFor(role: string | undefined) {
  if (role === 'admin') return '/admin'
  if (role === 'teacher') return '/teacher'
  return '/dashboard'
}

const demoAccountsList = (['student', 'teacher', 'admin'] as const).map((role) => ({
  role,
  email: DEMO_ACCOUNTS[role].email,
  password: DEMO_ACCOUNTS[role].password,
  name: DEMO_ACCOUNTS[role].name,
}))