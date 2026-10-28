import { forwardRef, InputHTMLAttributes } from 'react'
import clsx from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  required?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, required, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-text)]">
            {label}{required && <span className="text-[var(--color-danger)] ml-0.5">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'w-full px-3 py-2 text-sm rounded-[var(--radius-control)]',
            'bg-[var(--color-surface)] text-[var(--color-text)]',
            'border transition-all duration-150',
            'placeholder:text-[var(--color-text-muted)] placeholder:opacity-70',
            'focus:outline-none focus:ring-2',
            error
              ? 'border-[var(--color-danger)] focus:ring-[var(--color-danger-ring)]'
              : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary-ring)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {hint && !error && <span id={`${inputId}-hint`} className="text-xs text-[var(--color-text-muted)]">{hint}</span>}
        {error && <span id={`${inputId}-error`} className="text-xs text-[var(--color-danger)]">{error}</span>}
      </div>
    )
  }
)
Input.displayName = 'Input'
