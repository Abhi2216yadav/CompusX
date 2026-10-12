import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, MailCheck, Send } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { InlineError } from '@/components/ui/Feedback'
import { Card } from '@/components/ui/Card'

export default function ForgotPassword() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!/.+@.+\..+/.test(email.trim())) {
      setError('Enter a valid email address.')
      return
    }
    setBusy(true)
    try {
      await resetPassword(email.trim().toLowerCase())
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the reset email.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-5 py-10">
      <div className="w-full max-w-md">
        <Link
          to="/login"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-brand"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Back to sign in
        </Link>

        <Card>
          {sent ? (
            <div className="text-center">
              <span className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-success-soft text-success">
                <MailCheck className="size-6" aria-hidden />
              </span>
              <h1 className="text-lg font-extrabold text-ink">Check your inbox</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                If an account exists for <span className="font-semibold text-ink-2">{email}</span>, we've sent a
                link to reset your password. It expires in one hour.
              </p>
              <Button variant="secondary" fullWidth className="mt-5" onClick={() => setSent(false)}>
                Send again
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-extrabold text-ink">Reset your password</h1>
              <p className="mt-1.5 text-sm text-muted">
                Enter your school email and we'll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
                <Input
                  label="School email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                {error && <InlineError message={error} />}
                <Button type="submit" fullWidth loading={busy} icon={<Send className="size-4" />}>
                  Send reset link
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}