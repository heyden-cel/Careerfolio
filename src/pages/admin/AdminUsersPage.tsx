import { useState, useEffect, useCallback } from 'react'
import {
  Search, ChevronUp, ChevronDown, RefreshCw, AlertCircle,
  UserX, UserCheck, KeyRound, Trash2, Eye, ChevronLeft,
  ChevronRight, Filter, Users,
} from 'lucide-react'
import { adminApi, ManagedUser } from '@/lib/adminApi'
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

function SortHeader({
  label, field, currentSort, currentOrder, onSort
}: {
  label: string; field: string; currentSort: string; currentOrder: 'asc' | 'desc'
  onSort: (f: string) => void
}) {
  const active = currentSort === field
  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors select-none"
    >
      {label}
      <span className={active ? 'text-[var(--color-primary)]' : 'opacity-40'}>
        {active && currentOrder === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </span>
    </button>
  )
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

type ConfirmAction = {
  type: 'suspend' | 'unsuspend' | 'reset' | 'delete' | 'view'
  user: ManagedUser
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sort, setSort] = useState('joined')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)

  const [confirm, setConfirm] = useState<ConfirmAction | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [resetResult, setResetResult] = useState<string | null>(null)
  const [viewedUser, setViewedUser] = useState<any | null>(null)
  const [viewLoading, setViewLoading] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminApi.getUsers({
        search: search.trim() || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        sort, order, page, limit: 10,
      })
      setUsers(res.users)
      setTotal(res.total)
      setTotalPages(res.totalPages)
    } catch {
      setError('Failed to load users')
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [search, roleFilter, statusFilter, sort, order, page])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  // Auto-search debounce
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchUsers() }, 400)
    return () => clearTimeout(t)
  }, [search])

  const handleSort = (field: string) => {
    if (sort === field) {
      setOrder(o => o === 'asc' ? 'desc' : 'asc')
    } else {
      setSort(field)
      setOrder('asc')
    }
    setPage(1)
  }

  const handleView = async (user: ManagedUser) => {
    setConfirm({ type: 'view', user })
    setViewLoading(true)
    try {
      const res = await adminApi.getUserDetails(user.id)
      setViewedUser(res)
    } catch {
      toast.error('Failed to load user details')
    } finally {
      setViewLoading(false)
    }
  }

  const executeAction = async () => {
    if (!confirm) return
    const { type, user } = confirm
    setActionLoading(true)
    try {
      if (type === 'suspend' || type === 'unsuspend') {
        await adminApi.suspendUser(user.id)
        toast.success(`User ${type === 'suspend' ? 'suspended' : 'unsuspended'} successfully`)
        fetchUsers()
        setConfirm(null)
      } else if (type === 'reset') {
        const res = await adminApi.resetUserPassword(user.id)
        setResetResult(res.temporaryPassword)
        toast.success('Temporary password generated')
      } else if (type === 'delete') {
        await adminApi.deleteUser(user.id)
        toast.success('User permanently deleted')
        fetchUsers()
        setConfirm(null)
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{total} total accounts</p>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchUsers} loading={loading} className="gap-2">
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
              placeholder="Search by name or email…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-[var(--radius-control)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-ring)] focus:border-[var(--color-primary)] transition-all"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Filter size={14} className="text-[var(--color-text-muted)]" />
            <select
              value={roleFilter}
              onChange={e => { setRoleFilter(e.target.value); setPage(1) }}
              className="px-2.5 py-2 text-sm rounded-[var(--radius-control)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-ring)] cursor-pointer"
            >
              <option value="all">All Roles</option>
              <option value="user">Users</option>
              <option value="admin">Admins</option>
            </select>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
              className="px-2.5 py-2 text-sm rounded-[var(--radius-control)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-ring)] cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-[var(--color-danger-subtle)] border border-[var(--color-danger)]/40 flex items-center gap-2 text-sm text-[var(--color-danger)]">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Table */}
      <Card elevated className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-elevated)]">
                <th className="text-left px-4 py-3">
                  <SortHeader label="Name" field="name" currentSort={sort} currentOrder={order} onSort={handleSort} />
                </th>
                <th className="text-left px-4 py-3">
                  <SortHeader label="Email" field="email" currentSort={sort} currentOrder={order} onSort={handleSort} />
                </th>
                <th className="text-left px-4 py-3">
                  <SortHeader label="Joined" field="joined" currentSort={sort} currentOrder={order} onSort={handleSort} />
                </th>
                <th className="text-left px-4 py-3">
                  <SortHeader label="Docs" field="documents" currentSort={sort} currentOrder={order} onSort={handleSort} />
                </th>
                <th className="text-left px-4 py-3">
                  <SortHeader label="Status" field="status" currentSort={sort} currentOrder={order} onSort={handleSort} />
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-[var(--color-text-muted)]">
                      <Users size={32} className="opacity-30" />
                      <p className="text-sm font-medium">No users found</p>
                      <p className="text-xs">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr
                    key={user.id}
                    className="border-b border-[var(--color-border)] hover:bg-[var(--color-elevated)]/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[var(--color-primary-subtle)] border border-[rgba(34,197,94,0.25)] flex items-center justify-center text-[var(--color-primary)] font-semibold text-xs shrink-0">
                          {user.name.charAt(0)}
                        </div>
                        <span className="font-medium text-[var(--color-text)] truncate max-w-[120px]">{user.name}</span>
                        {user.role === 'admin' && <Badge variant="primary" className="text-[9px]">Admin</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)] text-xs truncate max-w-[160px]">{user.email}</td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)] text-xs font-mono whitespace-nowrap">{formatDate(user.joined)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs font-mono text-[var(--color-text)]">{user.documentsCount}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={user.status === 'active' ? 'primary' : 'danger'}>
                        {user.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleView(user)}
                          className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-elevated)] transition-colors"
                          title="View details"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => setConfirm({ type: user.status === 'active' ? 'suspend' : 'unsuspend', user })}
                          className={`p-1.5 rounded-lg transition-colors ${user.status === 'active' ? 'text-amber-500 hover:bg-amber-500/10' : 'text-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)]'}`}
                          title={user.status === 'active' ? 'Suspend user' : 'Unsuspend user'}
                          disabled={user.role === 'admin'}
                        >
                          {user.status === 'active' ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>
                        <button
                          onClick={() => { setResetResult(null); setConfirm({ type: 'reset', user }) }}
                          className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)] transition-colors"
                          title="Reset password"
                          disabled={user.role === 'admin'}
                        >
                          <KeyRound size={14} />
                        </button>
                        <button
                          onClick={() => setConfirm({ type: 'delete', user })}
                          className="p-1.5 rounded-lg text-[var(--color-danger)] hover:bg-[var(--color-danger-subtle)] transition-colors"
                          title="Delete user"
                          disabled={user.role === 'admin'}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border)]">
            <span className="text-xs text-[var(--color-text-muted)]">Page {page} of {totalPages} · {total} total</span>
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
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                const pg = Math.max(1, Math.min(page - 2 + i, totalPages - 4 + i))
                return (
                  <Button
                    key={pg}
                    variant={pg === page ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setPage(pg)}
                    className="px-2.5 text-xs min-w-[32px]"
                  >
                    {pg}
                  </Button>
                )
              })}
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

      {/* View User Modal */}
      <Modal
        open={confirm?.type === 'view'}
        onClose={() => { setConfirm(null); setViewedUser(null) }}
        title={`User Details — ${confirm?.user?.name || ''}`}
        size="lg"
        footer={
          <Button variant="secondary" size="sm" onClick={() => { setConfirm(null); setViewedUser(null) }}>
            Close
          </Button>
        }
      >
        {viewLoading ? (
          <div className="flex justify-center py-6"><RefreshCw size={20} className="animate-spin text-[var(--color-primary)]" /></div>
        ) : viewedUser ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-[var(--color-text-muted)]">Email</span><p className="font-medium mt-0.5">{viewedUser.user?.email}</p></div>
              <div><span className="text-[var(--color-text-muted)]">Role</span><p className="font-medium mt-0.5 capitalize">{viewedUser.user?.role}</p></div>
              <div><span className="text-[var(--color-text-muted)]">Status</span><p className="font-medium mt-0.5 capitalize">{viewedUser.user?.status}</p></div>
              <div><span className="text-[var(--color-text-muted)]">Joined</span><p className="font-medium mt-0.5">{formatDate(viewedUser.user?.joined)}</p></div>
              <div><span className="text-[var(--color-text-muted)]">Total AI Requests</span><p className="font-medium mt-0.5">{viewedUser.aiRequestsCount}</p></div>
              <div><span className="text-[var(--color-text-muted)]">Documents</span><p className="font-medium mt-0.5">{viewedUser.documents?.length || 0}</p></div>
            </div>
            {viewedUser.documents?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2">Documents</p>
                <div className="space-y-1.5">
                  {viewedUser.documents.slice(0, 5).map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between p-2 rounded-lg bg-[var(--color-elevated)] border border-[var(--color-border)]">
                      <span className="text-xs font-medium truncate">{doc.title}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="default" className="text-[9px]">{doc.type}</Badge>
                        {doc.live && <Badge variant="live" className="text-[9px]">Live</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {/* Suspend/Unsuspend Modal */}
      <Modal
        open={confirm?.type === 'suspend' || confirm?.type === 'unsuspend'}
        onClose={() => setConfirm(null)}
        title={confirm?.type === 'suspend' ? 'Suspend User?' : 'Unsuspend User?'}
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button
              variant={confirm?.type === 'suspend' ? 'danger' : 'primary'}
              size="sm"
              loading={actionLoading}
              onClick={executeAction}
            >
              {confirm?.type === 'suspend' ? 'Suspend' : 'Unsuspend'}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-[var(--color-text)]">
          {confirm?.type === 'suspend'
            ? `Are you sure you want to suspend ${confirm?.user?.name}? They will be unable to access the platform.`
            : `Are you sure you want to restore access for ${confirm?.user?.name}?`}
        </p>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        open={confirm?.type === 'reset'}
        onClose={() => { setConfirm(null); setResetResult(null) }}
        title="Reset User Password"
        size="sm"
        footer={
          resetResult ? (
            <Button variant="secondary" size="sm" onClick={() => { setConfirm(null); setResetResult(null) }}>Close</Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setConfirm(null)}>Cancel</Button>
              <Button variant="primary" size="sm" loading={actionLoading} onClick={executeAction}>Generate Password</Button>
            </div>
          )
        }
      >
        {resetResult ? (
          <div className="space-y-3">
            <p className="text-sm text-[var(--color-text)]">Temporary password generated for <strong>{confirm?.user?.name}</strong>:</p>
            <div className="p-3 rounded-lg bg-[var(--color-primary-subtle)] border border-[rgba(34,197,94,0.3)] font-mono text-sm text-[var(--color-primary)] text-center select-all tracking-widest">
              {resetResult}
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">Share this password securely. The user should change it upon next login.</p>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text)]">Generate a temporary password for <strong>{confirm?.user?.name}</strong>? Share it with them securely.</p>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={confirm?.type === 'delete'}
        onClose={() => setConfirm(null)}
        title="Delete User?"
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button variant="danger" size="sm" loading={actionLoading} onClick={executeAction}>
              Permanently Delete
            </Button>
          </div>
        }
      >
        <div className="space-y-2">
          <p className="text-sm text-[var(--color-text)]">
            Permanently delete <strong>{confirm?.user?.name}</strong> ({confirm?.user?.email})?
          </p>
          <p className="text-xs text-[var(--color-danger)] font-medium">
            This action cannot be undone. All their documents will be permanently deleted.
          </p>
        </div>
      </Modal>
    </div>
  )
}

