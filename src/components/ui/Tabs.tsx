import { useState, ReactNode } from 'react'
import clsx from 'clsx'

interface Tab { id: string; label: string }

interface TabsProps {
  tabs: Tab[]
  defaultTab?: string
  children: (activeTab: string) => ReactNode
}

export function Tabs({ tabs, defaultTab, children }: TabsProps) {
  const [active, setActive] = useState(defaultTab || tabs[0]?.id)
  return (
    <div>
      <div className="flex gap-1 border-b border-[var(--color-border)]" role="tablist">
        {tabs.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setActive(t.id)}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-t-[var(--radius-control)] -mb-px border-b-2 transition-all duration-150',
              active === t.id
                ? 'text-[var(--color-primary)] border-b-[var(--color-primary)]'
                : 'text-[var(--color-text-muted)] border-b-transparent hover:text-[var(--color-text)] hover:bg-[var(--color-primary-subtle)]'
            )}
          >{t.label}</button>
        ))}
      </div>
      <div className="mt-4">{children(active)}</div>
    </div>
  )
}
