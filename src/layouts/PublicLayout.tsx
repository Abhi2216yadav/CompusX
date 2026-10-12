import { Suspense } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Menu, Moon, Sun, X } from 'lucide-react'
import { useState } from 'react'

import { useTheme } from '@/context/ThemeContext'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/for-students', label: 'For students' },
  { to: '/for-teachers', label: 'For teachers' },
  { to: '/faq', label: 'FAQ' },
]

export default function PublicLayout() {
  const { theme, toggle } = useTheme()
  const [open, setOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      {/* Announcement bar */}
      <div className="bg-brand text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-2 text-center text-xs font-semibold">
          <span className="hidden sm:inline">Built for Indian school ecosystems — Classes 6 to 12.</span>
          <Link to="/register" className="underline underline-offset-2 hover:no-underline">
            Create your free account
          </Link>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-border bg-surface/85 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-brand text-sm font-black text-white">
              CX
            </span>
            <span className="text-base font-extrabold tracking-tight text-ink">CampusX</span>
          </Link>

          <nav className="ml-auto hidden items-center gap-1 md:flex">
            {LINKS.map((link) => {
              const active =
                link.end ? location.pathname === link.to : location.pathname.startsWith(link.to)
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    'rounded-lg px-3 py-2 text-sm font-semibold transition',
                    active ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-surface-2 hover:text-ink'
                  )}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label="Toggle colour theme"
              icon={theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            />
            <Link to="/login" className="hidden sm:block">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link to="/register" className="hidden sm:block">
              <Button size="sm">Get started</Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle navigation"
              aria-expanded={open}
              icon={open ? <X className="size-5" /> : <Menu className="size-5" />}
            />
          </div>
        </div>

        {open && (
          <nav className="border-t border-border bg-surface px-4 py-2 md:hidden">
            {LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-ink-2 transition hover:bg-surface-2"
              >
                {link.label}
              </Link>
            ))}
            <div className="flex gap-2 px-3 pt-2 pb-1">
              <Link to="/login" className="flex-1">
                <Button variant="outline" fullWidth size="sm">
                  Sign in
                </Button>
              </Link>
              <Link to="/register" className="flex-1">
                <Button fullWidth size="sm">
                  Get started
                </Button>
              </Link>
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Suspense fallback={<div className="min-h-[60vh]" />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-lg bg-brand text-xs font-black text-white">
                  CX
                </span>
                <span className="text-sm font-extrabold text-ink">CampusX</span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted">
                A complete school learning platform — study material, practice, timed tests, rankings and school
                communication in one place.
              </p>
            </div>

            <FooterCol
              title="Product"
              links={[
                { to: '/how-it-works', label: 'How it works' },
                { to: '/for-students', label: 'For students' },
                { to: '/for-teachers', label: 'For teachers' },
              ]}
            />
            <FooterCol
              title="Account"
              links={[
                { to: '/login', label: 'Sign in' },
                { to: '/register', label: 'Create account' },
                { to: '/forgot-password', label: 'Reset password' },
              ]}
            />
            <FooterCol title="Support" links={[{ to: '/faq', label: 'FAQ & help' }]} />
          </div>

          <div className="mt-8 flex flex-col gap-2 border-t border-border pt-6 text-[11px] text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} CampusX. Built for schools.</p>
            <p>Runs in demo mode without Firebase credentials — all data stays in your browser.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FooterCol({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <h3 className="text-xs font-bold tracking-wide text-ink uppercase">{title}</h3>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={link.to}>
            <Link to={link.to} className="text-xs text-muted transition hover:text-brand">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

