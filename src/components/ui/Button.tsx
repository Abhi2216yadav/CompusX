import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'success' | 'soft'
type Size = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
  iconRight?: ReactNode
  fullWidth?: boolean
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand text-white shadow-sm hover:bg-brand-hover active:scale-[.98] disabled:hover:bg-brand',
  secondary:
    'bg-surface-2 text-ink border border-border hover:bg-surface-3 active:scale-[.98]',
  outline:
    'border border-brand/40 text-brand bg-transparent hover:bg-brand-soft active:scale-[.98]',
  ghost: 'text-ink-2 hover:bg-surface-2 active:scale-[.98]',
  danger: 'bg-danger text-white shadow-sm hover:brightness-95 active:scale-[.98]',
  success: 'bg-success text-white shadow-sm hover:brightness-105 active:scale-[.98]',
  soft: 'bg-brand-soft text-brand hover:brightness-97 active:scale-[.98]',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2.5 rounded-xl',
  icon: 'h-10 w-10 rounded-xl',
  'icon-sm': 'h-8 w-8 rounded-lg',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    iconRight,
    fullWidth,
    className,
    children,
    disabled,
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center font-semibold whitespace-nowrap',
        'transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-55',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
      {iconRight}
    </button>
  )
})
