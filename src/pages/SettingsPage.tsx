import { useState } from 'react'
import { getProfile, setProfile, getFlatSkills } from '@/lib/storage'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Textarea, Card, Modal, TagInput } from '@/components/ui'
import { toast } from '@/components/ui/Toast'
import { Sun, Moon, Trash2 } from 'lucide-react'

export function SettingsPage() {
  const { logout }      = useAuth()
  const { theme, toggle } = useTheme()
  const navigate        = useNavigate()
  const [profile, setPr]  = useState(() => getProfile())
  const [showDanger, setShowDanger] = useState(false)

  const save = () => { setProfile(profile); toast.success("Settings saved!") }

  const deleteAll = () => {
    localStorage.clear()
    logout()
    navigate('/')
    toast.success("All data deleted")
  }

  return (
    <div style={{width:"100%",maxWidth:"640px",marginLeft:"auto",marginRight:"auto",paddingLeft:"1.5rem",paddingRight:"1.5rem",paddingTop:"3rem",paddingBottom:"3rem"}}>
      <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)] mb-8">Settings</h1>

      <div className="flex flex-col gap-6">
        {/* Profile */}
        <Card elevated>
          <h2 className="font-semibold text-[var(--color-text)] mb-4">Profile</h2>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Full name" required value={profile.name}     onChange={e => setPr(p => ({ ...p, name:     e.target.value }))} />
              <Input label="Email"     type="email" value={profile.email}    onChange={e => setPr(p => ({ ...p, email:    e.target.value }))} />
              <Input label="Headline"  value={profile.headline} onChange={e => setPr(p => ({ ...p, headline: e.target.value }))} />
              <Input label="Location"  value={profile.location} onChange={e => setPr(p => ({ ...p, location: e.target.value }))} />
              <Input label="Website"   type="url" value={profile.website}  onChange={e => setPr(p => ({ ...p, website:  e.target.value }))} className="col-span-2" />
            </div>
            <Textarea label="Summary" value={profile.summary} onChange={e => setPr(p => ({ ...p, summary: e.target.value }))} />
            <TagInput label="Skills" tags={getFlatSkills(profile.skills)} onChange={skills => setPr(p => ({ ...p, skills }))} />
            <Button onClick={save}>Save profile</Button>
          </div>
        </Card>

        {/* Appearance */}
        <Card elevated>
          <h2 className="font-semibold text-[var(--color-text)] mb-4">Appearance</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-text)]">Theme</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Currently: {theme === 'dark' ? 'Dark' : 'Light'} mode</p>
            </div>
            <Button variant="secondary" onClick={toggle}>
              {theme === 'dark' ? <><Sun size={14} /> Light mode</> : <><Moon size={14} /> Dark mode</>}
            </Button>
          </div>
        </Card>

        {/* Danger zone */}
        <Card elevated className="border-[var(--color-danger)]/20">
          <h2 className="font-semibold text-[var(--color-danger)] mb-4 flex items-center gap-2"><Trash2 size={15} /> Danger zone</h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-4">Permanently delete all your data. This cannot be undone.</p>
          <Button variant="danger" onClick={() => setShowDanger(true)}>Delete all my data</Button>
        </Card>
      </div>

      <Modal
        open={showDanger} onClose={() => setShowDanger(false)}
        title="Delete all data"
        footer={<>
          <Button variant="secondary" onClick={() => setShowDanger(false)}>Cancel</Button>
          <Button variant="danger" onClick={deleteAll}>Yes, delete everything</Button>
        </>}
      >
        <p>This will permanently delete your profile, all resumes, and all portfolio sites. <strong>This cannot be undone.</strong></p>
      </Modal>
    </div>
  )
}
