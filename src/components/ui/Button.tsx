import { forwardRef, ButtonHTMLAttributes, ElementType, ComponentPropsWithoutRef } from 'react'
import clsx from 'clsx'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size    = 'sm' | 'md' | 'lg'

type ButtonBaseProps = {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
  as?: ElementType
}

type ButtonProps<T extends ElementType = 'button'> =
  ButtonBaseProps &
  Record<string, any>

const base = [
  'inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap',
  'border rounded-[var(--radius-control)] cursor-pointer select-none',
  'transition-all duration-150 ease-[cubic-bezier(.4,0,.2,1)]',
  'focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] focus-visible:outline-offset-2',
  'disabled:opacity-40 disabled:pointer-events-none',
]

const variants: Record<Variant, string> = {
  primary:   'bg-[var(--color-primary)] text-[var(--color-text-inverse)] border-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] hover:border-[var(--color-primary-hover)]',
  secondary: 'bg-transparent text-[var(--color-text)] border-[var(--color-border)] hover:bg-[var(--color-surface)] hover:border-[var(--color-text-muted)]',
  danger:    'bg-transparent text-[var(--color-danger)] border-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-white',
  ghost:     'bg-transparent text-[var(--color-text-muted)] border-transparent hover:bg-[var(--color-primary-subtle)] hover:text-[var(--color-primary)]',
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export function Button<T extends ElementType = 'button'>({
  as: As = 'button' as T,
  variant = 'primary',
  size = 'md',
  loading,
  fullWidth,
  className,
  children,
  disabled,
  ...props
}: ButtonProps<T>) {
  return (
    <As
      className={clsx(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      disabled={As === 'button' ? (disabled || loading) : undefined}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" size={14} />}
      {children}
    </As>
  )
}
