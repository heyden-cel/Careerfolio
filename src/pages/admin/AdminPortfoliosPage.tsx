import { useState, useEffect, useCallback } from 'react'
import {
  Search, RefreshCw, AlertCircle, Globe, EyeOff,
  Flag, ExternalLink, Filter, X,
} from 'lucide-react'
import { adminApi, ManagedDocument } from '@/lib/adminApi'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

type ConfirmAction = {
  type: 'unpublish' | 'flag' | 'unflag'
  portfolio: ManagedDocument
}

export function AdminPortfoliosPage() {
  const [portfolios, setPortfolios] = useState<ManagedDocument[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [flagReason, setFlagReason] = useState('')

  const fetchPortfolios = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminApi.getPortfolios({
        search: search.trim() || undefined,
        filter,
      })
      setPortfolios(res.portfolios)
      setTotal(res.total)
    } catch {
      setError('Failed to load portfolios')
      toast.error('Failed to load portfolios')
    } finally {
      setLoading(false)
    }
  }, [search, filter])

  useEffect(() => { fetchPortfolios() }, [fetchPortfolios])

  useEffect(() => {
    const t = setTimeout(() => fetchPortfolios(), 400)
    return () => clearTimeout(t)
  }, [search])

  const executeAction = async () => {
    if (!confirm) return
    setActionLoading(true)
    try {
      if (confirm.type === 'unpublish') {
        await adminApi.unpublishPortfolio(confirm.portfolio.id)
        toast.success('Portfolio unpublished')
      } else if (confirm.type === 'flag') {
        await adminApi.flagPortfolio(confirm.portfolio.id, true, flagReason || undefined)
        toast.success('Portfolio flagged for review')
      } else if (confirm.type === 'unflag') {
        await adminApi.flagPortfolio(confirm.portfolio.id, false)
        toast.success('Flag removed from portfolio')
      }
      fetchPortfolios()
      setConfirm(null)
      setFlagReason('')
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  const flaggedCount = portfolios.filter(p => p.flagged).length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Live Portfolios</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            {total} published portfolios
            {flaggedCount > 0 && <span className="ml-2 text-[var(--color-danger)]">· {flaggedCount} flagged</span>}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchPortfolios} loading={loading} className="gap-2">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card elevated className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Search by title, slug or owner…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-[var(--radius-control)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-ring)] focus:border-[var(--color-primary)] transition-all"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Filter size={14} className="text-[var(--color-text-muted)]" />
            {['all', 'flagged', 'clean'].map(f => (
              <Button
                key={f}
                variant={filter === f ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setFilter(f)}
                className="capitalize text-xs"
              >
                {f === 'all' ? 'All' : f === 'flagged' ? '🚩 Flagged' : '✓ Clean'}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {error && (
        <div className="p-4 rounded-lg bg-[var(--color-danger-subtle)] border border-[var(--color-danger)]/40 flex items-center gap-2 text-sm text-[var(--color-danger)]">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Portfolio Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} elevated className="p-4 animate-pulse space-y-3">
              <div className="h-4 w-3/4 rounded bg-[var(--color-elevated)]" />
              <div className="h-3 w-1/2 rounded bg-[var(--color-elevated)]" />
              <div className="h-3 w-2/3 rounded bg-[var(--color-elevated)]" />
            </Card>
          ))}
        </div>
      ) : portfolios.length === 0 ? (
        <Card elevated className="py-16 text-center">
          <div className="flex flex-col items-center gap-2 text-[var(--color-text-muted)]">
            <Globe size={32} className="opacity-30" />
            <p className="text-sm font-medium">No live portfolios found</p>
            {filter !== 'all' && <p className="text-xs">Try switching to "All"</p>}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {portfolios.map(p => (
            <Card
              key={p.id}
              elevated
              className={`p-4 border transition-all ${p.flagged ? 'border-[var(--color-danger)]/40 bg-[var(--color-danger-subtle)]/10' : ''}`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-[var(--color-text)] truncate">{p.title}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">by {p.ownerName}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Badge variant="live" className="text-[9px]">Live</Badge>
                  {p.flagged && <Badge variant="danger" className="text-[9px]">🚩 Flagged</Badge>}
                </div>
              </div>

              {p.slug && (
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-xs font-mono text-[var(--color-text-muted)] bg-[var(--color-elevated)] px-2 py-0.5 rounded border border-[var(--color-border)] truncate">
                    /p/{p.slug}
                  </span>
                </div>
              )}

              {p.flagged && p.flagReason && (
                <div className="mb-3 p-2 rounded-lg bg-[var(--color-danger-subtle)] border border-[var(--color-danger)]/30 text-xs text-[var(--color-danger)]">
                  <strong>Flag reason:</strong> {p.flagReason}
                </div>
              )}

              <p className="text-xs text-[var(--color-text-muted)] mb-3">
                Last edited {formatDate(p.lastEdited)}
              </p>

              <div className="flex items-center gap-1.5 flex-wrap">
                {p.slug && (
                  <a
                    href={`/p/${p.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-[var(--radius-control)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-all"
                  >
                    <ExternalLink size={12} /> Open
                  </a>
                )}
                <button
                  onClick={() => setConfirm({ type: 'unpublish', portfolio: p })}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-[var(--radius-control)] border border-amber-500/40 text-amber-500 hover:bg-amber-500/10 transition-all"
                >
                  <EyeOff size={12} /> Unpublish
                </button>
                {p.flagged ? (
                  <button
                    onClick={() => setConfirm({ type: 'unflag', portfolio: p })}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-[var(--radius-control)] border border-[var(--color-primary)]/40 text-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)] transition-all"
                  >
                    <X size={12} /> Clear Flag
                  </button>
                ) : (
                  <button
                    onClick={() => { setFlagReason(''); setConfirm({ type: 'flag', portfolio: p }) }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-[var(--radius-control)] border border-[var(--color-danger)]/40 text-[var(--color-danger)] hover:bg-[var(--color-danger-subtle)] transition-all"
                  >
                    <Flag size={12} /> Flag
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Unpublish Modal */}
      <Modal
        open={confirm?.type === 'unpublish'}
        onClose={() => setConfirm(null)}
        title="Unpublish Portfolio?"
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button variant="danger" size="sm" loading={actionLoading} onClick={executeAction}>Unpublish</Button>
          </div>
        }
      >
        <p className="text-sm text-[var(--color-text)]">
          Unpublish <strong>"{confirm?.portfolio?.title}"</strong>? It will no longer be accessible at /p/{confirm?.portfolio?.slug}.
        </p>
      </Modal>

      {/* Flag Modal */}
      <Modal
        open={confirm?.type === 'flag'}
        onClose={() => { setConfirm(null); setFlagReason('') }}
        title="Flag Portfolio for Review"
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => { setConfirm(null); setFlagReason('') }}>Cancel</Button>
            <Button variant="danger" size="sm" loading={actionLoading} onClick={executeAction}>Flag Portfolio</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-text)]">Flag <strong>"{confirm?.portfolio?.title}"</strong> for moderation review.</p>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--color-text)]">Reason (optional)</label>
            <textarea
              value={flagReason}
              onChange={e => setFlagReason(e.target.value)}
              placeholder="Describe why this portfolio is being flagged…"
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-[var(--radius-control)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-ring)] resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* Unflag Modal */}
      <Modal
        open={confirm?.type === 'unflag'}
        onClose={() => setConfirm(null)}
        title="Clear Portfolio Flag?"
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button variant="primary" size="sm" loading={actionLoading} onClick={executeAction}>Clear Flag</Button>
          </div>
        }
      >
        <p className="text-sm text-[var(--color-text)]">
          Remove the flag from <strong>"{confirm?.portfolio?.title}"</strong>? This marks it as reviewed and compliant.
        </p>
      </Modal>
    </div>
  )
}

