import { useState, useEffect } from 'react'
import { Sparkles, RefreshCw, AlertCircle, TrendingUp, Zap } from 'lucide-react'
import { adminApi, AiAnalyticsData } from '@/lib/adminApi'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'

function BarSegment({ pct, color }: { pct: number; color: string }) {
  return (
    <div
      className="h-2 rounded-full transition-all duration-500"
      style={{ width: `${Math.max(2, pct)}%`, backgroundColor: color }}
    />
  )
}

const ACTION_COLORS: Record<string, string> = {
  summary: '#22C55E',
  bullets: '#3B82F6',
  project: '#A855F7',
  starter: '#F59E0B',
  tailor: '#EF4444',
  tagline: '#06B6D4',
  role: '#EC4899',
  suggest_palette: '#8B5CF6',
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function timeAgo(s: string) {
  const diff = Date.now() - new Date(s).getTime()
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

export function AdminAiPage() {
  const [data, setData] = useState<AiAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [limitInput, setLimitInput] = useState('')
  const [updatingLimit, setUpdatingLimit] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminApi.getAiAnalytics()
      setData(res)
      setLimitInput(String(res.dailyLimit))
    } catch {
      setError('Failed to load AI analytics')
      toast.error('Failed to load AI analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleUpdateLimit = async () => {
    const n = parseInt(limitInput, 10)
    if (isNaN(n) || n < 1) { toast.error('Enter a valid daily limit (minimum 1)'); return }
    setUpdatingLimit(true)
    try {
      await adminApi.updateAiDailyLimit(n)
      toast.success(`Daily AI limit updated to ${n} requests/user`)
      fetchData()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update limit')
    } finally {
      setUpdatingLimit(false)
    }
  }

  const maxDay = data ? Math.max(...data.usageByDay.map(d => d.count), 1) : 1
  const totalRequests = data?.usageByDay.reduce((s, d) => s + d.count, 0) || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Analytics</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Usage patterns, request trends and per-user limits</p>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchData} loading={loading} className="gap-2">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-[var(--color-danger-subtle)] border border-[var(--color-danger)]/40 flex items-center gap-2 text-sm text-[var(--color-danger)]">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card elevated className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-primary-subtle)] border border-[rgba(34,197,94,0.25)] flex items-center justify-center">
              <Sparkles size={18} className="text-[var(--color-primary)]" />
            </div>
            <span className="text-xs text-[var(--color-text-muted)]">Total (14 days)</span>
          </div>
          {loading ? (
            <div className="h-7 w-20 rounded animate-pulse bg-[var(--color-elevated)]" />
          ) : (
            <p className="text-2xl font-bold tabular-nums">{totalRequests}</p>
          )}
          <p className="text-xs text-[var(--color-text-muted)] mt-1">Total AI requests</p>
        </Card>
        <Card elevated className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-primary-subtle)] border border-[rgba(34,197,94,0.25)] flex items-center justify-center">
              <TrendingUp size={18} className="text-[var(--color-primary)]" />
            </div>
            <span className="text-xs text-[var(--color-text-muted)]">Today</span>
          </div>
          {loading ? (
            <div className="h-7 w-20 rounded animate-pulse bg-[var(--color-elevated)]" />
          ) : (
            <p className="text-2xl font-bold tabular-nums">{data?.usageByDay[data.usageByDay.length - 1]?.count || 0}</p>
          )}
          <p className="text-xs text-[var(--color-text-muted)] mt-1">Requests today</p>
        </Card>
        <Card elevated className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Zap size={18} className="text-amber-400" />
            </div>
            <span className="text-xs text-[var(--color-text-muted)]">Per-user limit</span>
          </div>
          <p className="text-2xl font-bold tabular-nums">{data?.dailyLimit ?? '—'}</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">Daily request cap</p>
        </Card>
      </div>

      {/* Daily Usage Chart */}
      <Card elevated className="p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-semibold text-sm">Daily Request Volume</h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Last 14 days of AI generation activity</p>
          </div>
        </div>
        {loading ? (
          <div className="h-32 flex items-end gap-2 animate-pulse">
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="flex-1 rounded-sm bg-[var(--color-elevated)]" style={{ height: `${20 + Math.random() * 60}%` }} />
            ))}
          </div>
        ) : data?.usageByDay ? (
          <>
            <div className="h-32 flex items-end gap-1.5">
              {data.usageByDay.map((d, i) => {
                const pct = Math.max(4, Math.round((d.count / maxDay) * 100))
                return (
                  <div key={i} className="flex-1 flex flex-col items-center group/bar" title={`${d.label}: ${d.count} requests`}>
                    <div
                      className="w-full rounded-sm bg-[var(--color-primary)] opacity-70 group-hover/bar:opacity-100 transition-all duration-150"
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between mt-2 px-1">
              {[0, 6, 13].map(i => (
                <span key={i} className="text-[10px] font-mono text-[var(--color-text-muted)]">
                  {data.usageByDay[i]?.label || ''}
                </span>
              ))}
            </div>
          </>
        ) : null}
      </Card>

      {/* Action Type Breakdown + Per-User Counts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By Action Type */}
        <Card elevated className="p-5">
          <h2 className="font-semibold text-sm mb-4">Requests by Action</h2>
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-3 w-1/3 rounded bg-[var(--color-elevated)]" />
                  <div className="h-2 rounded bg-[var(--color-elevated)]" />
                </div>
              ))}
            </div>
          ) : data?.usageByAction ? (
            <div className="space-y-3">
              {data.usageByAction
                .filter(a => a.count > 0)
                .sort((a, b) => b.count - a.count)
                .map(a => (
                  <div key={a.action}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium capitalize text-[var(--color-text)]">{a.action.replace('_', ' ')}</span>
                      <span className="text-xs text-[var(--color-text-muted)] tabular-nums">{a.count} ({a.percentage}%)</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--color-elevated)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(2, a.percentage)}%`,
                          backgroundColor: ACTION_COLORS[a.action] || '#22C55E',
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          ) : null}
        </Card>

        {/* Per-User Requests */}
        <Card elevated className="p-5">
          <h2 className="font-semibold text-sm mb-4">Top Users by AI Usage</h2>
          {loading ? (
            <div className="space-y-2 animate-pulse">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-3 w-1/2 rounded bg-[var(--color-elevated)]" />
                  <div className="h-3 w-12 rounded bg-[var(--color-elevated)]" />
                </div>
              ))}
            </div>
          ) : data?.perUserCounts && data.perUserCounts.length > 0 ? (
            <div className="space-y-1">
              {data.perUserCounts.slice(0, 8).map((u, i) => (
                <div key={u.userId} className="flex items-center gap-3 py-2 border-b border-[var(--color-border)] last:border-0">
                  <span className="text-xs font-mono text-[var(--color-text-muted)] w-5 text-center">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[var(--color-text)] truncate">{u.userEmail}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">Last: {u.lastAction} · {timeAgo(u.lastUsed)}</p>
                  </div>
                  <span className="text-sm font-bold text-[var(--color-primary)] tabular-nums shrink-0">{u.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-[var(--color-text-muted)]">No AI request data yet</div>
          )}
        </Card>
      </div>

      {/* Daily Limit Settings */}
      <Card elevated className="p-5">
        <h2 className="font-semibold text-sm mb-2">Daily Request Limit</h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          Maximum AI requests each user can make per day. Current limit: <strong className="text-[var(--color-text)]">{data?.dailyLimit ?? '—'}</strong>
        </p>
        <div className="flex items-center gap-3 max-w-xs">
          <input
            type="number"
            min="1"
            max="10000"
            value={limitInput}
            onChange={e => setLimitInput(e.target.value)}
            className="flex-1 px-3 py-2 text-sm rounded-[var(--radius-control)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-ring)] focus:border-[var(--color-primary)] transition-all"
            placeholder="e.g. 50"
          />
          <Button variant="primary" size="sm" onClick={handleUpdateLimit} loading={updatingLimit} className="shrink-0">
            Save Limit
          </Button>
        </div>
      </Card>
    </div>
  )
}

