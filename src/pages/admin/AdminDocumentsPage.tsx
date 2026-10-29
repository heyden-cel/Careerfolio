import { useState, useEffect, useCallback } from 'react'
import {
  Search, RefreshCw, AlertCircle, FileText, EyeOff,
  Trash2, ChevronLeft, ChevronRight, Filter, ExternalLink,
} from 'lucide-react'
import { adminApi, ManagedDocument } from '@/lib/adminApi'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3.5 w-full rounded bg-[var(--color-elevated)]" />
        </td>
      ))}
    </tr>
  )
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

type ConfirmAction = {
  type: 'unpublish' | 'delete'
  doc: ManagedDocument
}

export function AdminDocumentsPage() {
  const [docs, setDocs] = useState<ManagedDocument[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminApi.getDocuments({
        search: search.trim() || undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        page, limit: 10,
      })
      setDocs(res.documents)
      setTotal(res.total)
      setTotalPages(res.totalPages)
    } catch {
      setError('Failed to load documents')
      toast.error('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [search, typeFilter, statusFilter, page])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchDocs() }, 400)
    return () => clearTimeout(t)
  }, [search])

  const executeAction = async () => {
    if (!confirm) return
    setActionLoading(true)
    try {
      if (confirm.type === 'unpublish') {
        await adminApi.unpublishDocument(confirm.doc.id)
        toast.success('Document unpublished')
      } else if (confirm.type === 'delete') {
        await adminApi.deleteDocument(confirm.doc.id)
        toast.success('Document deleted')
      }
      fetchDocs()
      setConfirm(null)
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{total} total documents across all users</p>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchDocs} loading={loading} className="gap-2">
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
              placeholder="Search by title, owner name or email…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-[var(--radius-control)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-ring)] focus:border-[var(--color-primary)] transition-all"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Filter size={14} className="text-[var(--color-text-muted)]" />
            <select
              value={typeFilter}
              onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
              className="px-2.5 py-2 text-sm rounded-[var(--radius-control)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-ring)] cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="resume">Resumes</option>
              <option value="portfolio">Portfolios</option>
            </select>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
              className="px-2.5 py-2 text-sm rounded-[var(--radius-control)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-ring)] cursor-pointer"
            >
              <option value="all">Any Status</option>
              <option value="live">Live</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
      </Card>

      {error && (
        <div className="p-4 rounded-lg bg-[var(--color-danger-subtle)] border border-[var(--color-danger)]/40 flex items-center gap-2 text-sm text-[var(--color-danger)]">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <Card elevated className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-elevated)]">
                {['Title', 'Owner', 'Type', 'Status', 'Last Edited', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : docs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-[var(--color-text-muted)]">
                      <FileText size={32} className="opacity-30" />
                      <p className="text-sm font-medium">No documents found</p>
                      <p className="text-xs">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                docs.map(doc => (
                  <tr key={doc.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-elevated)]/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium text-[var(--color-text)] truncate max-w-[180px] block">{doc.title}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">
                        <p className="text-[var(--color-text)] font-medium">{doc.ownerName}</p>
                        <p className="text-[var(--color-text-muted)]">{doc.ownerEmail}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="default" className="capitalize">{doc.type}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {doc.live ? <Badge variant="live">Live</Badge> : <Badge variant="default">Draft</Badge>}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--color-text-muted)] font-mono whitespace-nowrap">{formatDate(doc.lastEdited)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {doc.type === 'portfolio' && doc.live && doc.slug && (
                          <a
                            href={`/p/${doc.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)] transition-colors"
                            title="View public portfolio"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                        {doc.live && (
                          <button
                            onClick={() => setConfirm({ type: 'unpublish', doc })}
                            className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-500/10 transition-colors"
                            title="Unpublish document"
                          >
                            <EyeOff size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => setConfirm({ type: 'delete', doc })}
                          className="p-1.5 rounded-lg text-[var(--color-danger)] hover:bg-[var(--color-danger-subtle)] transition-colors"
                          title="Delete document"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border)]">
            <span className="text-xs text-[var(--color-text-muted)]">Page {page} of {totalPages} · {total} total</span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-2">
                <ChevronLeft size={15} />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-2">
                <ChevronRight size={15} />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Unpublish Modal */}
      <Modal
        open={confirm?.type === 'unpublish'}
        onClose={() => setConfirm(null)}
        title="Unpublish Document?"
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button variant="danger" size="sm" loading={actionLoading} onClick={executeAction}>Unpublish</Button>
          </div>
        }
      >
        <p className="text-sm text-[var(--color-text)]">
          Unpublish <strong>"{confirm?.doc?.title}"</strong>? It will be set to draft and no longer publicly accessible.
        </p>
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={confirm?.type === 'delete'}
        onClose={() => setConfirm(null)}
        title="Delete Document?"
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button variant="danger" size="sm" loading={actionLoading} onClick={executeAction}>Permanently Delete</Button>
          </div>
        }
      >
        <div className="space-y-2">
          <p className="text-sm text-[var(--color-text)]">
            Permanently delete <strong>"{confirm?.doc?.title}"</strong>?
          </p>
          <p className="text-xs text-[var(--color-danger)] font-medium">This cannot be undone.</p>
        </div>
      </Modal>
    </div>
  )
}

