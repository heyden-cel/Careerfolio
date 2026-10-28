import { useEffect, useRef, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import clsx from 'clsx'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }

export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey) }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className={clsx(
        'w-full bg-[var(--color-elevated)] border border-[var(--color-border)]',
        'rounded-[16px] shadow-2xl',
        'animate-in fade-in-0 zoom-in-95 duration-150',
        sizes[size]
      )}>
        {title && (
          <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border)]">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">{title}</h2>
            <button onClick={onClose} className="flex items-center justify-center w-8 h-8 rounded-[var(--radius-control)] text-[var(--color-text-muted)] hover:bg-[var(--color-primary-subtle)] hover:text-[var(--color-text)] transition-all duration-150">
              <X size={16} />
            </button>
          </div>
        )}
        <div className="px-6 py-6 text-sm text-[var(--color-text-muted)] leading-relaxed">{children}</div>
        {footer && <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-[var(--color-border)]">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}
