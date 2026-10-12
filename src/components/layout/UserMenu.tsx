import type { ComponentType } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LogOut, Moon, Sun } from 'lucide-react'
import { Avatar, Badge } from '@/components/ui/Badge'
import { Dropdown } from '@/components/ui/Disclosure'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'
import { useNotifications } from '@/context/NotificationContext'
import { cn } from '@/utils/cn'
import { classLabel } from '@/utils/format'

export interface NavLinkItem {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  end?: boolean
}

export function UserMenu({ compact }: { compact?: boolean }) {
  const { profile, signOut } = useAuth()
  const { theme, toggle } = useTheme()
  const { unread, markAllRead } = useNotifications()
  const navigate = useNavigate()

  if (!profile) return null

  return (
    <Dropdown
      align="right"
      trigger={
        <button
          type="button"
          aria-label="Account menu"
          className={cn(
            'flex items-center gap-2.5 rounded-xl border border-border bg-surface py-1.5 pr-2.5 pl-1.5 transition hover:bg-surface-2',
            compact && 'pr-1.5'
          )}
        >
          <Avatar name={profile.name} src={profile.photoUrl} size={32} />
          {!compact && (
            <span className="hidden min-w-0 text-left sm:block">
              <span className="block max-w-32 truncate text-xs font-bold text-ink">{profile.name}</span>
              <span className="block text-[10px] text-muted">
                {profile.role === 'student'
                  ? `Class ${classLabel(profile.classLevel, profile.section)}`
                  : (profile.designation ?? profile.role)}
              </span>
            </span>
          )}
        </button>
      }
      items={[
        { label: profile.email, disabled: true },
        {
          label: 'My profile',
          icon: <Avatar name={profile.name} size={16} />,
          onClick: () => navigate('/profile'),
        },
        { divider: true, label: '' },
        {
          label: theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
          icon: theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />,
          onClick: toggle,
        },
        {
          label: unread ? `Mark all as read (${unread})` : 'You are all caught up',
          icon: <span className="size-4 text-center text-xs">✓</span>,
          onClick: () => void markAllRead(),
          disabled: !unread,
        },
        { divider: true, label: '' },
        { label: 'Sign out', icon: <LogOut className="size-4" />, onClick: () => void signOut(), tone: 'danger' },
      ]}
    />
  )
}

export function RoleBadge() {
  const { profile } = useAuth()
  if (!profile) return null
  const tone = profile.role === 'admin' ? 'gold' : profile.role === 'teacher' ? 'info' : 'brand'
  return (
    <Badge tone={tone} size="md">
      {profile.role}
    </Badge>
  )
}

export function navLinkClass(isActive: boolean) {
  return cn(
    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
    isActive ? 'bg-brand text-white shadow-sm' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
  )
}

export function NavItemLink({
  to,
  label,
  icon: Icon,
  end,
  onNavigate,
}: NavLinkItem & { onNavigate?: () => void }) {
  return (
    <NavLink to={to} end={end} onClick={onNavigate} className={({ isActive }) => navLinkClass(isActive)}>
      {({ isActive }) => (
        <>
          <Icon
            className={cn('size-[18px] shrink-0', isActive ? 'text-white' : 'text-muted group-hover:text-ink')}
          />
          <span className="truncate">{label}</span>
        </>
      )}
    </NavLink>
  )
}
