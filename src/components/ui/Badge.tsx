import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'

type Tone = 'brand' | 'success' | 'warn' | 'danger' | 'info' | 'neutral' | 'gold' | 'accent'

const TONES: Record<Tone, string> = {
  brand: 'bg-brand-soft text-brand border-brand/25',
  success: 'bg-success-soft text-success border-success/25',
  warn: 'bg-warn-soft text-warn border-warn/25',
  danger: 'bg-danger-soft text-danger border-danger/25',
  info: 'bg-info-soft text-info border-info/25',
  neutral: 'bg-surface-2 text-muted border-border',
  gold: 'bg-warn-soft text-gold border-gold/30',
  accent: 'bg-brand-soft text-accent border-accent/25',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
  size?: 'sm' | 'md'
  icon?: ReactNode
}

export function Badge({ tone = 'neutral', size = 'sm', icon, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-semibold whitespace-nowrap',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        TONES[tone],
        className
      )}
      {...rest}
    >
      {icon}
      {children}
    </span>
  )
}

/** Rank medal for the leaderboard. */
export function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-sm font-black text-white shadow-sm">
        🥇
      </span>
    )
  }
  if (rank === 2) {
    return (
      <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-slate-300 to-slate-500 text-sm font-black text-white shadow-sm">
        🥈
      </span>
    )
  }
  if (rank === 3) {
    return (
      <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-orange-300 to-orange-600 text-sm font-black text-white shadow-sm">
        🥉
      </span>
    )
  }
  return (
    <span className="tabular grid size-8 place-items-center rounded-full bg-surface-2 text-xs font-bold text-muted">
      {rank}
    </span>
  )
}

export function Avatar({
  name,
  src,
  size = 40,
  className,
}: {
  name: string
  src?: string
  size?: number
  className?: string
}) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center overflow-hidden rounded-full font-bold text-white',
        className
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: src ? undefined : gradientFor(name),
      }}
      aria-hidden
    >
      {src ? <img src={src} alt="" className="size-full object-cover" /> : letters}
    </span>
  )
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
  'linear-gradient(135deg,#0ea5e9,#10b981)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#ec4899,#8b5cf6)',
  'linear-gradient(135deg,#14b8a6,#3b82f6)',
  'linear-gradient(135deg,#f97316,#eab308)',
  'linear-gradient(135deg,#3b82f6,#6366f1)',
  'linear-gradient(135deg,#10b981,#84cc16)',
]

function gradientFor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length]
}

export function Dot({ tone = 'brand', pulse }: { tone?: Tone; pulse?: boolean }) {
  return (
    <span className="relative inline-flex size-2">
      {pulse && (
        <span
          className={cn('absolute inline-flex size-full animate-ping rounded-full opacity-70', DOT[tone])}
        />
      )}
      <span className={cn('relative inline-flex size-2 rounded-full', DOT[tone])} />
    </span>
  )
}

const DOT: Record<Tone, string> = {
  brand: 'bg-brand',
  success: 'bg-success',
  warn: 'bg-warn',
  danger: 'bg-danger',
  info: 'bg-info',
  neutral: 'bg-muted',
  gold: 'bg-gold',
  accent: 'bg-accent',
}
