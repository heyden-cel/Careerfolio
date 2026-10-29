import { HTMLAttributes } from 'react'
import clsx from 'clsx'

type BadgeVariant = 'default' | 'primary' | 'danger' | 'live'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const styles: Record<BadgeVariant, string> = {
  default: 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)]',
  primary: 'bg-[var(--color-primary-subtle)] border-[rgba(34,197,94,.3)] text-[var(--color-primary)]',
  danger:  'bg-[var(--color-danger-subtle)] border-[rgba(239,68,68,.3)] text-[var(--color-danger)]',
  live:    'bg-[var(--color-primary-subtle)] border-[rgba(34,197,94,.3)] text-[var(--color-primary)]',
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border',
      'font-mono text-[10px] font-medium uppercase tracking-wider',
      styles[variant],
      className
    )} {...props}>
      {variant === 'live' && (
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-pulse" />
      )}
      {children}
    </span>
  )
}
