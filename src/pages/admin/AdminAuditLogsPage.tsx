import { useState, useEffect, useCallback } from 'react'
import { Search, RefreshCw, AlertCircle, ScrollText, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { adminApi, AuditLogEntry } from '@/lib/adminApi'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { toast } from '@/components/ui/Toast'

function formatDateTime(s: string) {
  const d = new Date(s)
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

function getActionColor(action: string): 'primary' | 'danger' | 'default' {
  const a = action.toLowerCase()
  if (a.includes('delete') || a.includes('suspend') || a.includes('lock') || a.includes('flag')) return 'danger'
  if (a.includes('login') || a.includes('password') || a.includes('create') || a.includes('update') || a.includes('save')) return 'primary'
  return 'default'
}

function SkeletonRow() {
  return (
    <div className="flex gap-4 p-4 border-b border-[var(--color-border)] animate-pulse">
      <div className="w-2 h-2 rounded-full bg-[var(--color-elevated)] mt-2 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-1/3 rounded bg-[var(--color-elevated)]" />
        <div className="h-2.5 w-3/4 rounded bg-[var(--color-elevated)]" />
        <div className="h-2 w-1/4 rounded bg-[var(--color-elevated)]" />
      </div>
    </div>
  )
}

export function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminApi.getAuditLogs({
        search: search.trim() || undefined,
        page,
        limit: 15,
      })
      setLogs(res.logs)
      setTotal(res.total)
      setTotalPages(res.totalPages)
    } catch {
      setError('Failed to load audit logs')
      toast.error('Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchLogs() }, 400)
    return () => clearTimeout(t)
  }, [search])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            {total} recorded admin actions — immutable event history
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchLogs} loading={loading} className="gap-2">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <Card elevated className="p-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Search by action, details, or admin name…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-[var(--radius-control)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-ring)] focus:border-[var(--color-primary)] transition-all"
          />
        </div>
      </Card>

      {error && (
        <div className="p-4 rounded-lg bg-[var(--color-danger-subtle)] border border-[var(--color-danger)]/40 flex items-center gap-2 text-sm text-[var(--color-danger)]">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Log Entries */}
      <Card elevated className="overflow-hidden p-0">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
        ) : logs.length === 0 ? (
          <div className="py-16 text-center">
            <div className="flex flex-col items-center gap-2 text-[var(--color-text-muted)]">
              <ScrollText size={32} className="opacity-30" />
              <p className="text-sm font-medium">No audit log entries</p>
              {search && <p className="text-xs">Try adjusting your search</p>}
            </div>
          </div>
        ) : (
          <div>
            {logs.map((log, i) => (
              <div
                key={log.id}
                className="flex gap-4 px-5 py-4 border-b border-[var(--color-border)] hover:bg-[var(--color-elevated)]/50 transition-colors last:border-0"
              >
                {/* Timeline dot */}
                <div className="flex flex-col items-center shrink-0 mt-1">
                  <div className={`w-2 h-2 rounded-full ${getActionColor(log.action) === 'danger' ? 'bg-[var(--color-danger)]' : getActionColor(log.action) === 'primary' ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`} />
                  {i < logs.length - 1 && <div className="w-px flex-1 mt-2 bg-[var(--color-border)]" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={getActionColor(log.action)} className="text-[9px]">
                        {log.action}
                      </Badge>
                      <span className="text-xs font-medium text-[var(--color-text)]">by {log.adminName}</span>
                      {log.ip && log.ip !== '127.0.0.1' && (
                        <span className="text-[10px] font-mono text-[var(--color-text-muted)] bg-[var(--color-elevated)] px-1.5 py-0.5 rounded border border-[var(--color-border)]">
                          {log.ip}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-mono text-[var(--color-text-muted)] shrink-0">
                      <Clock size={10} />
                      {formatDateTime(log.timestamp)}
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs text-[var(--color-text-muted)] leading-relaxed">{log.details}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--color-border)] bg-[var(--color-elevated)]">
            <span className="text-xs text-[var(--color-text-muted)]">Page {page} of {totalPages} · {total} entries</span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2"
              >
                <ChevronLeft size={15} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-2"
              >
                <ChevronRight size={15} />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Info note */}
      <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-2 px-1">
        <ScrollText size={12} />
        Audit logs are append-only. Actions are recorded automatically when admin operations are performed.
      </div>
    </div>
  )
}

