import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'

import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { InlineError } from '@/components/ui/Feedback'
import { MIN_PASSWORD_LENGTH } from '@/services/teachers'

function homeFor(role: string | null | undefined): string {
  if (role === 'admin') return '/admin'
  if (role === 'teacher') return '/teacher'
  return '/dashboard'
}

/**
 * Shown to accounts created with an administrator-set temporary password. The
 * `RequireAuth` guard keeps the rest of the app unreachable until the flag is
 * cleared here, so a shared temporary password cannot linger.
 */
export default function ChangePassword() {
  const { profile, changePassword, signOut } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Your new password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (password !== confirm) {
      setError('The two passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await changePassword(password)
      toast.success('Password updated')
      navigate(homeFor(profile?.role), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update your password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-5 py-10">
      <div className="w-full max-w-md">
        <Card>
          <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
            <ShieldCheck className="size-6" aria-hidden />
          </span>
          <h1 className="text-lg font-extrabold text-ink">Set a new password</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            Welcome, {profile?.name ?? 'there'}. Your account was created with a temporary
            password — choose a new one to continue.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
            <Input
              label="New password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              required
            />
            <Input
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter your new password"
              required
            />
            {error && <InlineError message={error} />}
            <Button type="submit" fullWidth loading={busy}>
              Update password
            </Button>
          </form>

          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition hover:text-brand"
          >
            <LogOut className="size-3.5" aria-hidden />
            Sign out
          </button>
        </Card>
      </div>
    </div>
  )
}
