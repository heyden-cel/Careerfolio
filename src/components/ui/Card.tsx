import { HTMLAttributes, forwardRef } from 'react'
import clsx from 'clsx'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean
  interactive?: boolean
  as?: 'div' | 'article' | 'section'
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ elevated, interactive, as: As = 'div', className, children, ...props }, ref) => (
    <As
      ref={ref as any}
      className={clsx(
        'rounded-[var(--radius-card)] border p-6 transition-all duration-150',
        elevated
          ? 'bg-[var(--color-elevated)] border-[var(--color-border)]'
          : 'bg-[var(--color-surface)] border-[var(--color-border)]',
        interactive && 'cursor-pointer hover:border-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] focus-visible:outline-offset-2',
        className
      )}
      tabIndex={interactive ? 0 : undefined}
      {...props}
    >
      {children}
    </As>
  )
)
Card.displayName = 'Card'
