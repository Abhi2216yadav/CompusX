import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Bell, Menu, Moon, Sun, Trophy, WifiOff } from 'lucide-react'
import { cn } from '@/utils/cn'
import { MOBILE_TABS, navForRole } from '@/config/navigation'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { useNotifications } from '@/context/NotificationContext'
import { NavItemLink, UserMenu } from './UserMenu'
import { GlobalSearch } from './GlobalSearch'
import { Sheet } from '@/components/ui/Disclosure'
import { Badge, Dot } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Feedback'
import { NotificationPanel } from './NotificationPanel'
import { useAsync } from '@/hooks/useCollection'
import { getMyRank } from '@/services/leaderboard'

const BRAND_ROUTE: Record<string, string> = {
  student: '/dashboard',
  teacher: '/teacher',
  admin: '/admin',
}

/* ── Sidebar ────────────────────────────────────────────────────────────── */

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { profile, school, demoMode } = useAuth()
  const groups = navForRole(profile?.role ?? null)

  return (
    <div className="flex h-full flex-col">
      <Link
        to={BRAND_ROUTE[profile?.role ?? 'student']}
        onClick={onNavigate}
        className="flex items-center gap-2.5 px-4 py-4"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand text-sm font-black text-white">
          CX
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-extrabold tracking-tight text-ink">CampusX</span>
          <span className="block truncate text-[10px] text-muted">{school?.name ?? 'Digital School Platform'}</span>
        </span>
      </Link>

      {demoMode && (
        <div className="mx-3 mb-2 flex items-center gap-2 rounded-lg border border-warn/25 bg-warn-soft px-2.5 py-1.5">
          <WifiOff className="size-3.5 shrink-0 text-warn" aria-hidden />
          <span className="text-[10px] font-semibold text-warn">Demo mode · local data</span>
        </div>
      )}

      <nav className="no-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-3 pb-4" aria-label="Main">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-3 text-[10px] font-bold tracking-widest text-muted uppercase">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItemLink
                  key={item.to}
                  to={item.to}
                  label={item.label}
                  icon={item.icon}
                  end={item.end}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <MyRankCard onNavigate={onNavigate} />
      </div>
    </div>
  )
}

/** Compact "my rank" summary that lives in the desktop sidebar. */
function MyRankCard({ onNavigate }: { onNavigate?: () => void }) {
  const { profile } = useAuth()
  const { data } = useAsync(
    () =>
      profile
        ? getMyRank(profile.schoolId, profile.id, {
            period: 'overall',
            academicYear: profile.academicYear,
            classId: 'all',
            section: 'all',
            subjectId: 'all',
          })
        : Promise.resolve(null),
    [profile?.id, profile?.schoolId]
  )

  if (!profile || profile.role !== 'student') {
    return (
      <div className="rounded-xl bg-surface-2 p-3">
        <p className="text-[10px] font-bold tracking-widest text-muted uppercase">Academic Year</p>
        <p className="mt-1 text-sm font-bold text-ink">{profile?.academicYear ?? '—'}</p>
      </div>
    )
  }

  return (
    <Link
      to="/leaderboard"
      onClick={onNavigate}
      className="block rounded-xl border border-border bg-gradient-to-br from-brand-soft to-surface p-3 transition hover:border-brand/35"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-brand uppercase">
          <Trophy className="size-3" aria-hidden /> Your Rank
        </span>
        <Badge tone="brand">#{data?.rank ?? '—'}</Badge>
      </div>
      <Progress value={data?.progress ?? 0} className="mt-2.5" size="sm" />
      <p className="mt-1.5 text-[11px] text-muted">
        {data ? `${data.progress}% progress · ${data.totalStudents} students` : 'Loading your progress…'}
      </p>
    </Link>
  )
}

/* ── Topbar ─────────────────────────────────────────────────────────────── */

function Topbar({ onMenu, onNotifications }: { onMenu: () => void; onNotifications: () => void }) {
  const { theme, toggle } = useTheme()
  const { unread } = useNotifications()
  const { profile, school } = useAuth()

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur-lg">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-5">
        <button
          type="button"
          onClick={onMenu}
          aria-label="Open navigation menu"
          className="grid size-9 shrink-0 place-items-center rounded-xl text-ink-2 transition hover:bg-surface-2 lg:hidden"
        >
          <Menu className="size-5" aria-hidden />
        </button>

        <Link to={BRAND_ROUTE[profile?.role ?? 'student']} className="flex shrink-0 items-center gap-2 lg:hidden">
          <span className="grid size-8 place-items-center rounded-lg bg-brand text-xs font-black text-white">CX</span>
        </Link>

        <div className="hidden flex-1 sm:block">
          <GlobalSearch />
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <div className="sm:hidden">
            <GlobalSearch compact />
          </div>
          <button
            type="button"
            onClick={onNotifications}
            aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
            className="relative grid size-9 place-items-center rounded-xl text-ink-2 transition hover:bg-surface-2"
          >
            <Bell className="size-[18px]" aria-hidden />
            {unread > 0 && (
              <span className="tabular absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[9px] font-black text-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="hidden size-9 place-items-center rounded-xl text-ink-2 transition hover:bg-surface-2 sm:grid"
          >
            {theme === 'dark' ? <Sun className="size-[18px]" aria-hidden /> : <Moon className="size-[18px]" aria-hidden />}
          </button>
          <UserMenu />
        </div>
      </div>
      <p className="hidden items-center gap-1.5 border-t border-border/60 px-5 py-1.5 text-[10px] text-muted lg:flex">
        <Dot tone="success" />
        {school?.name ?? 'CampusX'} · Academic Year {profile?.academicYear ?? '—'}
      </p>
    </header>
  )
}

/* ── Mobile bottom navigation ───────────────────────────────────────────── */

function BottomNav() {
  const { pathname } = useLocation()

  return (
    <nav
      aria-label="Primary mobile"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur-lg lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-5">
        {MOBILE_TABS.map((tab) => {
          const Icon = tab.icon
          const active = pathname === tab.to || (tab.to !== '/dashboard' && pathname.startsWith(tab.to))
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn(
                'flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition',
                active ? 'text-brand' : 'text-muted'
              )}
            >
              <Icon className={cn('size-[19px]', active && 'stroke-[2.4]')} aria-hidden />
              {tab.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

/* ── Shell ──────────────────────────────────────────────────────────────── */

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()

  // Close transient UI whenever the route changes.
  useEffect(() => {
    setMenuOpen(false)
    setNotifOpen(false)
  }, [pathname])

  return (
    <div className="min-h-dvh bg-bg">
      <a href="#main" className="cx-skip-link">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-surface lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="CampusX">
        <SidebarContent onNavigate={() => setMenuOpen(false)} />
      </Sheet>

      <div className="lg:pl-64">
        <Topbar onMenu={() => setMenuOpen(true)} onNotifications={() => setNotifOpen(true)} />
        <main id="main" className="mx-auto w-full max-w-7xl px-3 pt-4 pb-24 sm:px-5 sm:pt-6 lg:pb-10">
          {children}
        </main>
      </div>

      <BottomNav />

      <NotificationPanel
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        onNavigate={(href) => {
          setNotifOpen(false)
          navigate(href)
        }}
      />
    </div>
  )
}
