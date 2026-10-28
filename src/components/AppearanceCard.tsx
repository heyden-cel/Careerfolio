import { useState } from 'react'
import axios from 'axios'
import {
  Palette, Shuffle, Sparkles, Check, RotateCcw,
  AlertTriangle, ChevronDown, ChevronUp
} from 'lucide-react'
import {
  PALETTES, PalettePreset, resolvePalette,
  isValidHex, normalizeHex
} from '@/lib/palettes'
import { toast } from '@/components/ui/Toast'

interface AppearanceCardProps {
  paletteId?: string
  customAccent?: string
  customAccent2?: string
  jobTitle?: string
  onChange: (paletteId: string, accent?: string, accent2?: string) => void
}

export function AppearanceCard({
  paletteId = 'midnight-green',
  customAccent,
  customAccent2,
  jobTitle,
  onChange,
}: AppearanceCardProps) {
  const [showCustomize, setShowCustomize] = useState(Boolean(customAccent || customAccent2))
  const [loadingAI, setLoadingAI] = useState(false)

  const resolved = resolvePalette(paletteId, customAccent, customAccent2)
  const darkPresets = PALETTES.filter(p => p.category === 'dark')
  const lightPresets = PALETTES.filter(p => p.category === 'light')

  // Shuffle random palette
  const handleShuffle = () => {
    const currentIndex = PALETTES.findIndex(p => p.id === resolved.id)
    let nextIndex = Math.floor(Math.random() * PALETTES.length)
    if (nextIndex === currentIndex) {
      nextIndex = (nextIndex + 1) % PALETTES.length
    }
    const chosen = PALETTES[nextIndex]
    onChange(chosen.id, undefined, undefined)
    toast.success(`Switched to "${chosen.name}" palette!`)
  }

  // ✨ AI Palette suggestion
  const handleAiSuggest = async () => {
    setLoadingAI(true)
    try {
      const res = await axios.post('/api/ai', {
        action: 'suggest_palette',
        jobTitle: jobTitle || '',
      })
      const recommendedId = res.data?.paletteId || res.data?.result
      if (recommendedId) {
        const found = PALETTES.find(p => p.id === recommendedId)
        onChange(recommendedId, undefined, undefined)
        toast.success(`✨ Recommended "${found?.name || recommendedId}" for your role!`)
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to get AI palette recommendation.')
    } finally {
      setLoadingAI(false)
    }
  }

  // Select Preset Tile
  const handleSelectPreset = (preset: PalettePreset) => {
    // Preserve custom overrides if user explicitly customized, else reset
    onChange(preset.id, customAccent, customAccent2)
  }

  // Accent Override Handlers
  const handleAccentChange = (val: string) => {
    onChange(resolved.id, val, customAccent2)
  }

  const handleAccent2Change = (val: string) => {
    onChange(resolved.id, customAccent, val)
  }

  const handleResetToPreset = () => {
    onChange(resolved.id, undefined, undefined)
    toast.success('Reset accent colors to preset defaults.')
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-sm">
      {/* ── Card Header ── */}
      <div className="p-3.5 bg-[var(--color-elevated)] border-b border-[var(--color-border)] flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Palette size={16} className="text-[var(--color-primary)]" />
          <span className="text-xs sm:text-sm font-bold text-[var(--color-text)]">
            Appearance & Color Palettes
          </span>
        </div>

        {/* Action Controls: Shuffle & AI Suggest */}
        <div className="flex items-center gap-1.5">
          <button
            id="btn-shuffle-palette"
            type="button"
            onClick={handleShuffle}
            title="Pick a random palette"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)] transition-all bg-[var(--color-surface)] active:scale-95 cursor-pointer"
          >
            <Shuffle size={11} />
            <span>Shuffle</span>
          </button>

          <button
            id="btn-suggest-palette"
            type="button"
            disabled={loadingAI}
            onClick={handleAiSuggest}
            title="Get AI recommended palette for your job title"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-[var(--color-primary-subtle)] text-[var(--color-primary)] border border-[var(--color-primary)]/30 hover:opacity-90 transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            <Sparkles size={11} />
            <span>{loadingAI ? 'Suggesting...' : '✨ Suggest'}</span>
          </button>
        </div>
      </div>

      {/* ── Palettes Content ── */}
      <div className="p-4 sm:p-5 flex flex-col gap-5">
        {/* Dark Palettes Grid */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            Dark Palettes ({darkPresets.length})
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {darkPresets.map(preset => {
              const isSelected = resolved.id === preset.id
              return (
                <button
                  key={preset.id}
                  id={`palette-tile-${preset.id}`}
                  data-palette-id={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`p-2.5 rounded-lg border text-left flex flex-col gap-2 transition-all cursor-pointer relative ${
                    isSelected
                      ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)] shadow-sm'
                      : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
                  }`}
                  style={{ background: preset.surface }}
                >
                  {/* Color Preview Bar */}
                  <div
                    className="w-full h-7 rounded-md p-1.5 flex items-center justify-between border"
                    style={{ background: preset.bg, borderColor: 'rgba(255,255,255,0.08)' }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-3 h-3 rounded-full shadow-sm"
                        style={{ background: preset.accent }}
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full shadow-sm"
                        style={{ background: preset.accent2 }}
                      />
                    </div>

                    {isSelected && (
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center text-black"
                        style={{ background: 'var(--color-primary)' }}
                      >
                        <Check size={11} strokeWidth={3} />
                      </div>
                    )}
                  </div>

                  {/* Preset Name */}
                  <span
                    className="text-[11px] font-semibold truncate leading-tight"
                    style={{ color: preset.text }}
                  >
                    {preset.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Light Palettes Grid */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            Light Palettes ({lightPresets.length})
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {lightPresets.map(preset => {
              const isSelected = resolved.id === preset.id
              return (
                <button
                  key={preset.id}
                  id={`palette-tile-${preset.id}`}
                  data-palette-id={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`p-2.5 rounded-lg border text-left flex flex-col gap-2 transition-all cursor-pointer relative ${
                    isSelected
                      ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)] shadow-sm'
                      : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
                  }`}
                  style={{ background: preset.surface }}
                >
                  {/* Color Preview Bar */}
                  <div
                    className="w-full h-7 rounded-md p-1.5 flex items-center justify-between border"
                    style={{ background: preset.bg, borderColor: 'rgba(0,0,0,0.08)' }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-3 h-3 rounded-full shadow-sm"
                        style={{ background: preset.accent }}
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full shadow-sm"
                        style={{ background: preset.accent2 }}
                      />
                    </div>

                    {isSelected && (
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center text-black"
                        style={{ background: 'var(--color-primary)' }}
                      >
                        <Check size={11} strokeWidth={3} />
                      </div>
                    )}
                  </div>

                  {/* Preset Name */}
                  <span
                    className="text-[11px] font-semibold truncate leading-tight"
                    style={{ color: preset.text }}
                  >
                    {preset.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Customize Accent Colors ── */}
        <div className="pt-3 border-t border-[var(--color-border)] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <button
              id="btn-toggle-customize"
              type="button"
              onClick={() => setShowCustomize(s => !s)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
            >
              <span>Customize Colors</span>
              {showCustomize ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {(resolved.isCustomAccent || resolved.isCustomAccent2) && (
              <button
                id="btn-reset-preset"
                type="button"
                onClick={handleResetToPreset}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
              >
                <RotateCcw size={11} />
                <span>Reset to preset</span>
              </button>
            )}
          </div>

          {showCustomize && (
            <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] flex flex-col gap-3.5">
              {/* Primary Accent Picker */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Primary Accent (Buttons, Active Nav, Links)
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-[var(--color-border)] shrink-0">
                    <input
                      type="color"
                      value={isValidHex(resolved.accent) ? normalizeHex(resolved.accent) : '#22C55E'}
                      onChange={e => handleAccentChange(e.target.value)}
                      className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer border-none bg-transparent"
                    />
                  </div>
                  <input
                    id="input-accent-hex"
                    type="text"
                    value={customAccent !== undefined ? customAccent : resolved.accent}
                    onChange={e => handleAccentChange(e.target.value)}
                    placeholder="#22C55E"
                    className="flex-1 px-3 py-1.5 text-xs font-mono rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
              </div>

              {/* Secondary Accent Picker */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Secondary Accent (Gradients, Highlights, Dots)
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-[var(--color-border)] shrink-0">
                    <input
                      type="color"
                      value={isValidHex(resolved.accent2) ? normalizeHex(resolved.accent2) : '#86EFAC'}
                      onChange={e => handleAccent2Change(e.target.value)}
                      className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer border-none bg-transparent"
                    />
                  </div>
                  <input
                    id="input-accent2-hex"
                    type="text"
                    value={customAccent2 !== undefined ? customAccent2 : resolved.accent2}
                    onChange={e => handleAccent2Change(e.target.value)}
                    placeholder="#86EFAC"
                    className="flex-1 px-3 py-1.5 text-xs font-mono rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
              </div>

              {/* WCAG AA Contrast Warning */}
              {!resolved.wcag.passesText && (
                <div className="p-2.5 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-500 text-xs flex items-start gap-2">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold">Low Contrast Notice</span>
                    <span className="text-[11px] leading-relaxed opacity-90">
                      {resolved.accent} has a {resolved.wcag.ratio}:1 contrast ratio against the background. WCAG AA requires at least 4.5:1 for body text (3.0:1 for large graphical elements).
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
