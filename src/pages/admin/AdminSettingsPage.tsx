import { useState, useEffect } from 'react'
import { Settings, RefreshCw, AlertCircle, Shield, Save, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { adminApi, AdminSettingsData } from '@/lib/adminApi'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/components/ui/Toast'
import { useAdminAuth } from '@/context/AdminAuthContext'

const PALETTES = [
  { id: 'midnight-green', label: 'Midnight Green' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'royal-purple', label: 'Royal Purple' },
  { id: 'sunset', label: 'Sunset' },
  { id: 'forest', label: 'Forest' },
  { id: 'slate-teal', label: 'Slate Teal' },
  { id: 'monochrome', label: 'Monochrome' },
  { id: 'clean-light', label: 'Clean Light' },
  { id: 'black-red', label: 'Black & Red' },
  { id: 'rose-noir', label: 'Rose Noir' },
]

export function AdminSettingsPage() {
  const { isDefaultPassword, setIsDefaultPassword } = useAdminAuth()
  const [settings, setSettings] = useState<AdminSettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Change password form
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [pwError, setPwError] = useState('')
  const [changingPw, setChangingPw] = useState(false)

  const fetchSettings = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminApi.getSettings()
      setSettings(res.settings)
    } catch {
      setError('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSettings() }, [])

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    try {
      const res = await adminApi.updateSettings(settings)
      setSettings(res.settings)
      toast.success('Settings saved successfully')
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    setPwError('')
    if (!currentPw || !newPw || !confirmPw) {
      setPwError('All password fields are required')
      return
    }
    if (newPw.length < 5) {
      setPwError('New password must be at least 5 characters')
      return
    }
    if (newPw !== confirmPw) {
      setPwError('New passwords do not match')
      return
    }
    setChangingPw(true)
    try {
      const res = await adminApi.changePassword(currentPw, newPw)
      toast.success('Password changed successfully')
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
      setIsDefaultPassword(res.isDefaultPassword)
    } catch (err: any) {
      setPwError(err?.response?.data?.error || 'Failed to change password')
    } finally {
      setChangingPw(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-48 rounded animate-pulse bg-[var(--color-elevated)]" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} elevated className="p-5 animate-pulse space-y-4">
            <div className="h-4 w-1/3 rounded bg-[var(--color-elevated)]" />
            <div className="h-8 w-full rounded bg-[var(--color-elevated)]" />
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Site configuration and administrator security</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-[var(--color-danger-subtle)] border border-[var(--color-danger)]/40 flex items-center gap-2 text-sm text-[var(--color-danger)]">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Default Password Warning */}
      {isDefaultPassword && (
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/40 flex items-start gap-3">
          <Shield size={18} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-300">Default password still in use</p>
            <p className="text-xs text-amber-400/80 mt-0.5">
              The admin account is using the factory default password. Update it below for security.
            </p>
          </div>
        </div>
      )}

      {/* Site Configuration */}
      {settings && (
        <Card elevated className="p-6">
          <h2 className="font-semibold text-sm mb-5 flex items-center gap-2">
            <Settings size={16} />
            Site Configuration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Site Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--color-text)]">Site Name</label>
              <input
                type="text"
                value={settings.siteName}
                onChange={e => setSettings(s => s ? { ...s, siteName: e.target.value } : s)}
                className="w-full px-3 py-2 text-sm rounded-[var(--radius-control)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-ring)] focus:border-[var(--color-primary)] transition-all"
                placeholder="FolioAI"
              />
            </div>

            {/* Default Palette */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--color-text)]">Default Portfolio Palette</label>
              <select
                value={settings.defaultPalette}
                onChange={e => setSettings(s => s ? { ...s, defaultPalette: e.target.value } : s)}
                className="w-full px-3 py-2 text-sm rounded-[var(--radius-control)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-ring)] cursor-pointer"
              >
                {PALETTES.map(p => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* Allow Signups */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-elevated)] border border-[var(--color-border)]">
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">Allow Public Sign-ups</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">New users can register on the public login page</p>
              </div>
              <button
                onClick={() => setSettings(s => s ? { ...s, allowSignups: !s.allowSignups } : s)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-ring)] ${
                  settings.allowSignups ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'
                }`}
                role="switch"
                aria-checked={settings.allowSignups}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                    settings.allowSignups ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Maintenance Mode */}
            <div className={`flex items-center justify-between p-3 rounded-lg border ${
              settings.maintenanceMode
                ? 'bg-[var(--color-danger-subtle)] border-[var(--color-danger)]/40'
                : 'bg-[var(--color-elevated)] border-[var(--color-border)]'
            }`}>
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">Maintenance Mode</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  {settings.maintenanceMode ? '⚠️ Site is currently in maintenance mode' : 'Block public access for maintenance'}
                </p>
              </div>
              <button
                onClick={() => setSettings(s => s ? { ...s, maintenanceMode: !s.maintenanceMode } : s)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-danger-ring)] ${
                  settings.maintenanceMode ? 'bg-[var(--color-danger)]' : 'bg-[var(--color-border)]'
                }`}
                role="switch"
                aria-checked={settings.maintenanceMode}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                    settings.maintenanceMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[var(--color-border)] flex justify-end">
            <Button variant="primary" size="md" onClick={handleSave} loading={saving} className="gap-2">
              <Save size={15} />
              Save Settings
            </Button>
          </div>
        </Card>
      )}

      {/* Change Admin Password */}
      <Card elevated className="p-6">
        <h2 className="font-semibold text-sm mb-1 flex items-center gap-2">
          <Shield size={16} />
          Change Administrator Password
        </h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-5">
          Update the admin account password. Minimum 5 characters.
        </p>

        <div className="space-y-4 max-w-sm">
          {/* Current Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--color-text)]">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPw}
                onChange={e => { setCurrentPw(e.target.value); setPwError('') }}
                placeholder="Enter current password"
                className="w-full px-3 py-2 pr-10 text-sm rounded-[var(--radius-control)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-ring)] focus:border-[var(--color-primary)] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(p => !p)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-1 rounded"
              >
                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--color-text)]">New Password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPw}
                onChange={e => { setNewPw(e.target.value); setPwError('') }}
                placeholder="Enter new password (min. 5 chars)"
                className="w-full px-3 py-2 pr-10 text-sm rounded-[var(--radius-control)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-ring)] focus:border-[var(--color-primary)] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowNew(p => !p)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-1 rounded"
              >
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--color-text)]">Confirm New Password</label>
            <input
              type="password"
              value={confirmPw}
              onChange={e => { setConfirmPw(e.target.value); setPwError('') }}
              placeholder="Repeat new password"
              className="w-full px-3 py-2 text-sm rounded-[var(--radius-control)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-ring)] focus:border-[var(--color-primary)] transition-all"
            />
          </div>

          {pwError && (
            <p className="text-xs text-[var(--color-danger)] flex items-center gap-1.5 font-medium">
              <AlertCircle size={13} /> {pwError}
            </p>
          )}

          <Button
            variant="primary"
            size="md"
            onClick={handleChangePassword}
            loading={changingPw}
            className="gap-2"
          >
            <Shield size={15} />
            Change Password
          </Button>
        </div>
      </Card>
    </div>
  )
}

