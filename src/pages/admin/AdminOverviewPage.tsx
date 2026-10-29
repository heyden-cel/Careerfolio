import { useState, useEffect } from 'react'
import {
  Users, FileText, Globe, Sparkles, TrendingUp, Clock,
  ArrowUp, Activity, RefreshCw, AlertCircle,
} from 'lucide-react'
import { adminApi, OverviewData } from '@/lib/adminApi'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'

function StatCard({
  label, value, icon: Icon, sub, color = 'primary', loading
}: {
  label: string
  value: string | number
  icon: any
  sub?: string
  color?: 'primary' | 'danger' | 'neutral'
  loading?: boolean
}) {
  const colorMap: Record<string, string> = {
    primary: 'text-[var(--color-primary)] bg-[var(--color-primary-subtle)] border-[rgba(34,197,94,0.2)]',
    danger: 'text-[var(--color-danger)] bg-[var(--color-danger-subtle)] border-[rgba(239,68,68,0.2)]',
    neutral: 'text-[var(--color-text-muted)] bg-[var(--color-elevated)] border-[var(--color-border)]',
  }

  if (loading) {
    return (
      <Card elevated className="p-5 animate-pulse">
        <div className="flex items-start justify-between">
          <div className="h-10 w-10 rounded-lg bg-[var(--color-elevated)]" />
          <div className="h-4 w-16 rounded bg-[var(--color-elevated)]" />
        </div>
        <div className="mt-4 h-7 w-20 rounded bg-[var(--color-elevated)]" />
        <div className="mt-1.5 h-3 w-28 rounded bg-[var(--color-elevated)]" />
      </Card>
    )
  }

  return (
    <Card elevated className="p-5 group hover:border-[var(--color-primary)] transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${colorMap[color]}`}>
          <Icon size={20} />
        </div>
        {sub && (
          <span className="text-[10px] font-mono text-[var(--color-text-muted)] mt-0.5">{sub}</span>
        )}
      </div>
      <p className="mt-4 text-2xl font-bold text-[var(--color-text)] tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{label}</p>
    </Card>
  )
}

function MiniBarChart({
  data, loading
}: {
  data: { label: string; count: number }[]
  loading?: boolean
}) {
  if (loading) {
    return (
      <div className="h-32 flex items-end gap-1.5 px-2">
        {Array.from({ length: 14 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-[var(--color-elevated)] animate-pulse"
            style={{ height: `${20 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    )
  }

  const max = Math.max(...data.map(d => d.count), 1)

  return (
    <div className="h-32 flex items-end gap-1.5 px-2" role="img" aria-label="Signups over time chart">
      {data.map((d, i) => {
        const pct = Math.max(4, Math.round((d.count / max) * 100))
        return (
          <div
            key={i}
            className="flex-1 flex flex-col items-center gap-0.5 group/bar"
            title={`${d.label}: ${d.count} signup${d.count !== 1 ? 's' : ''}`}
          >
            <div
              className="w-full rounded-sm bg-[var(--color-primary)] opacity-70 group-hover/bar:opacity-100 transition-all duration-150 relative"
              style={{ height: `${pct}%` }}
            />
          </div>
        )
      })}
    </div>
  )
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

export function AdminOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminApi.getOverview()
      setData(res)
    } catch {
      setError('Failed to load overview data')
      toast.error('Failed to load overview')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const stats = data?.stats

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Site-wide platform health and activity</p>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchData} loading={loading} className="gap-2">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-lg bg-[var(--color-danger-subtle)] border border-[var(--color-danger)]/40 flex items-center gap-2 text-sm text-[var(--color-danger)]">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Total Users" value={stats?.totalUsers ?? '—'} icon={Users} loading={loading} />
        <StatCard label="New This Week" value={stats?.newThisWeek ?? '—'} icon={TrendingUp} color="primary" loading={loading} sub="7 days" />
        <StatCard label="Resumes" value={stats?.resumes ?? '—'} icon={FileText} color="neutral" loading={loading} />
        <StatCard label="Portfolios" value={stats?.portfolios ?? '—'} icon={FileText} color="neutral" loading={loading} />
        <StatCard label="Live Portfolios" value={stats?.livePortfolios ?? '—'} icon={Globe} color="primary" loading={loading} />
        <StatCard label="AI Requests Today" value={stats?.aiRequestsToday ?? '—'} icon={Sparkles} color="primary" loading={loading} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Signups Over Time */}
        <Card elevated className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-sm">Signups Over Time</h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Daily new user registrations — last 14 days</p>
            </div>
            <Activity size={16} className="text-[var(--color-text-muted)]" />
          </div>

          {!loading && data?.signupsOverTime ? (
            <>
              <MiniBarChart data={data.signupsOverTime} loading={false} />
              {/* X-axis labels: first, middle, last only */}
              <div className="flex justify-between mt-2 px-2">
                {[0, Math.floor((data.signupsOverTime.length - 1) / 2), data.signupsOverTime.length - 1].map(i => (
                  <span key={i} className="text-[10px] font-mono text-[var(--color-text-muted)]">
                    {data.signupsOverTime[i]?.label || ''}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <MiniBarChart data={[]} loading />
          )}
        </Card>

        {/* Quick Stats Card */}
        <Card elevated className="p-5">
          <h2 className="font-semibold text-sm mb-4">Platform Stats</h2>
          <div className="space-y-3">
            {[
              { label: 'Total Documents', value: loading ? '—' : ((stats?.resumes ?? 0) + (stats?.portfolios ?? 0)).toString(), color: 'text-[var(--color-text)]' },
              { label: 'Portfolio Publish Rate', value: loading ? '—' : stats ? `${stats.portfolios > 0 ? Math.round((stats.livePortfolios / stats.portfolios) * 100) : 0}%` : '—', color: 'text-[var(--color-primary)]' },
              { label: 'Avg Docs / User', value: loading ? '—' : stats && stats.totalUsers > 0 ? ((stats.resumes + stats.portfolios) / stats.totalUsers).toFixed(1) : '0', color: 'text-[var(--color-text)]' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-[var(--color-border)] last:border-0">
                <span className="text-xs text-[var(--color-text-muted)]">{item.label}</span>
                <span className={`text-sm font-semibold tabular-nums ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card elevated className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={16} className="text-[var(--color-text-muted)]" />
          <h2 className="font-semibold text-sm">Recent Activity</h2>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-7 h-7 rounded-full bg-[var(--color-elevated)]" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-3/4 rounded bg-[var(--color-elevated)]" />
                  <div className="h-2.5 w-1/2 rounded bg-[var(--color-elevated)]" />
                </div>
                <div className="h-3 w-12 rounded bg-[var(--color-elevated)]" />
              </div>
            ))}
          </div>
        ) : data?.recentActivity && data.recentActivity.length > 0 ? (
          <div className="space-y-1">
            {data.recentActivity.map(act => (
              <div key={act.id} className="flex items-start gap-3 py-2.5 border-b border-[var(--color-border)] last:border-0">
                <div className="w-7 h-7 rounded-full bg-[var(--color-primary-subtle)] border border-[rgba(34,197,94,0.25)] flex items-center justify-center shrink-0 mt-0.5">
                  <ArrowUp size={12} className="text-[var(--color-primary)] rotate-45" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--color-text)] truncate">{act.type}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">{act.description}</p>
                </div>
                <span className="text-[10px] font-mono text-[var(--color-text-muted)] shrink-0">{timeAgo(act.timestamp)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-[var(--color-text-muted)]">No recent activity</div>
        )}
      </Card>
    </div>
  )
}

