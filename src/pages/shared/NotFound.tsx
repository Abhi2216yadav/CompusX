import { Link } from 'react-router-dom'
import { Home, LayoutDashboard, Search } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'

export default function NotFound() {
  const { profile } = useAuth()

  const homeForRole = {
    student: '/dashboard',
    teacher: '/teacher',
    admin: '/admin',
  }[profile?.role ?? 'student']

  return (
    <main className="grid min-h-screen place-items-center bg-surface-2 px-5 py-16">
      <div className="w-full max-w-md text-center">
        <p className="text-7xl font-black tracking-tight text-brand/25">404</p>
        <h1 className="mt-3 text-2xl font-extrabold text-ink">We couldn&apos;t find that page</h1>
        <p className="mt-2 text-sm text-muted">
          The link may be broken, or the page may have moved. Try the dashboard, or search CampusX from the top bar.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
          <Link
            to={homeForRole}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover"
          >
            <LayoutDashboard className="size-4" aria-hidden />
            Go to my dashboard
          </Link>
          <Link
            to="/help"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-ink transition hover:bg-surface-2"
          >
            <Search className="size-4" aria-hidden />
            Get help
          </Link>
        </div>

        <p className="mt-8 text-xs text-muted">
          Lost your way?{' '}
          <Link to="/" className="font-semibold text-brand hover:underline">
            Return to the CampusX home page
          </Link>{' '}
          or{' '}
          <Link to="/" className="inline-flex items-center gap-1 font-semibold text-brand hover:underline">
            <Home className="size-3" aria-hidden />
            start over
          </Link>
          .
        </p>
      </div>
    </main>
  )
}