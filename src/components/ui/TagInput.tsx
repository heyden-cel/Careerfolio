import { useState, KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'

interface TagInputProps {
  label?: string
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  hint?: string
}

export function TagInput({ label, tags, onChange, placeholder = 'Type and press Enter', hint }: TagInputProps) {
  const [val, setVal] = useState('')

  const add = () => {
    const t = val.trim()
    if (t && !tags.includes(t)) onChange([...tags, t])
    setVal('')
  }

  const remove = (i: number) => onChange(tags.filter((_, idx) => idx !== i))

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() }
    if (e.key === 'Backspace' && !val) remove(tags.length - 1)
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-sm font-medium text-[var(--color-text)]">{label}</span>}
      <div className={clsx(
        'flex flex-wrap gap-1.5 px-3 py-2 rounded-[var(--radius-control)]',
        'bg-[var(--color-surface)] border border-[var(--color-border)]',
        'focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-[var(--color-primary-ring)]',
        'transition-all duration-150'
      )}>
        {tags.map((t, i) => (
          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-primary-subtle)] border border-[rgba(34,197,94,.3)] text-[var(--color-primary)] text-xs font-mono">
            {t}
            <button type="button" onClick={() => remove(i)} className="hover:text-[var(--color-primary-hover)] transition-colors">
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={onKey}
          onBlur={add}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-70 outline-none"
        />
      </div>
      {hint && <span className="text-xs text-[var(--color-text-muted)]">{hint}</span>}
    </div>
  )
}
