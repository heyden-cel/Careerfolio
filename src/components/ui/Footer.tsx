import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'

export function Footer() {
  return (
    <footer className="w-full border-t border-[var(--color-border)] bg-[var(--color-bg)] py-20">
      <div className="w-full max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 py-12">
          <div>
            <Link to="/" className="flex items-center gap-2 font-bold text-[var(--color-text)] mb-3 hover:text-[var(--color-primary)] transition-colors tracking-tight">
              <Zap size={16} className="text-[var(--color-primary)]" />
              FolioAI
            </Link>
            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
              AI-powered portfolio and resume builder for professionals.
            </p>
          </div>
          {[
            { title: 'Product', links: [['Dashboard', '/dashboard'], ['Templates', '#'], ['Pricing', '#']] },
            { title: 'Company', links: [['About', '#'], ['Blog', '#'], ['Careers', '#']] },
            { title: 'Legal',   links: [['Privacy', '#'], ['Terms', '#'], ['Security', '#']] },
          ].map(col => (
            <div key={col.title}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] mb-4 font-mono">{col.title}</p>
              <ul className="space-y-3">
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    <Link to={href} className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-6 border-t border-[var(--color-border)] text-center">
          <p className="text-xs text-[var(--color-text-muted)] text-center">
            © 2026 FolioAI. MIT License.
          </p>
        </div>
      </div>
    </footer>
  )
}
