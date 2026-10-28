import { forwardRef, TextareaHTMLAttributes } from 'react'
import clsx from 'clsx'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
  required?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, required, className, id, ...props }, ref) => {
    const taId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={taId} className="text-sm font-medium text-[var(--color-text)]">
            {label}{required && <span className="text-[var(--color-danger)] ml-0.5">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={taId}
          className={clsx(
            'w-full px-3 py-2.5 text-sm rounded-[var(--radius-control)] min-h-[120px]',
            'bg-[var(--color-surface)] text-[var(--color-text)]',
            'border transition-all duration-150 resize-y',
            'placeholder:text-[var(--color-text-muted)] placeholder:opacity-70',
            'focus:outline-none focus:ring-2 leading-relaxed',
            error
              ? 'border-[var(--color-danger)] focus:ring-[var(--color-danger-ring)]'
              : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary-ring)]',
            className
          )}
          aria-invalid={!!error}
          {...props}
        />
        {hint && !error && <span className="text-xs text-[var(--color-text-muted)]">{hint}</span>}
        {error && <span className="text-xs text-[var(--color-danger)]">{error}</span>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
