// ─── FolioAI Color Combinations (Palettes) ───────────────────────────────────

export interface PalettePreset {
  id: string
  name: string
  category: 'dark' | 'light'
  bg: string
  surface: string
  text: string
  muted: string
  accent: string
  accent2: string
}

export const PALETTES: PalettePreset[] = [
  // ── Dark Palettes ──
  {
    id: 'midnight-green',
    name: 'Midnight Green',
    category: 'dark',
    bg: '#0A0A0B',
    surface: '#111113',
    text: '#F4F4F5',
    muted: '#A1A1AA',
    accent: '#22C55E',
    accent2: '#86EFAC',
  },
  {
    id: 'black-red',
    name: 'Black & Red',
    category: 'dark',
    bg: '#0A0A0B',
    surface: '#141112',
    text: '#F4F4F5',
    muted: '#A1A1AA',
    accent: '#EF4444',
    accent2: '#FCA5A5',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    category: 'dark',
    bg: '#0B1220',
    surface: '#111A2E',
    text: '#E6EEF9',
    muted: '#94A3B8',
    accent: '#3B82F6',
    accent2: '#22D3EE',
  },
  {
    id: 'royal-purple',
    name: 'Royal Purple',
    category: 'dark',
    bg: '#0F0B1A',
    surface: '#17122A',
    text: '#F1ECFF',
    muted: '#A599C9',
    accent: '#8B5CF6',
    accent2: '#EC4899',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    category: 'dark',
    bg: '#140B08',
    surface: '#1E1310',
    text: '#FFF3EA',
    muted: '#C4A593',
    accent: '#F97316',
    accent2: '#EAB308',
  },
  {
    id: 'forest',
    name: 'Forest',
    category: 'dark',
    bg: '#0A120D',
    surface: '#101C14',
    text: '#E8F3EC',
    muted: '#95AE9E',
    accent: '#4ADE80',
    accent2: '#A3E635',
  },
  {
    id: 'slate-teal',
    name: 'Slate Teal',
    category: 'dark',
    bg: '#0F172A',
    surface: '#1E293B',
    text: '#F1F5F9',
    muted: '#94A3B8',
    accent: '#14B8A6',
    accent2: '#38BDF8',
  },
  {
    id: 'rose-noir',
    name: 'Rose Noir',
    category: 'dark',
    bg: '#0D0A0B',
    surface: '#181214',
    text: '#FBEFF1',
    muted: '#B59AA0',
    accent: '#F43F5E',
    accent2: '#FDA4AF',
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    category: 'dark',
    bg: '#0A0A0A',
    surface: '#141414',
    text: '#FAFAFA',
    muted: '#A3A3A3',
    accent: '#FAFAFA',
    accent2: '#737373',
  },

  // ── Light Palettes ──
  {
    id: 'clean-light',
    name: 'Clean Light',
    category: 'light',
    bg: '#FFFFFF',
    surface: '#F4F4F5',
    text: '#0A0A0B',
    muted: '#52525B',
    accent: '#16A34A',
    accent2: '#0A0A0B',
  },
  {
    id: 'paper-ink',
    name: 'Paper & Ink',
    category: 'light',
    bg: '#FAF7F2',
    surface: '#FFFFFF',
    text: '#1C1917',
    muted: '#78716C',
    accent: '#B45309',
    accent2: '#1C1917',
  },
  {
    id: 'sky-light',
    name: 'Sky Light',
    category: 'light',
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    text: '#0F172A',
    muted: '#64748B',
    accent: '#2563EB',
    accent2: '#0EA5E9',
  },
]

export const DEFAULT_PALETTE_ID = 'midnight-green'

export function getPalettePreset(id?: string): PalettePreset {
  if (!id) return PALETTES[0]
  // Fallback for legacy template names: 'midnight' -> 'midnight-green', 'light' -> 'clean-light', 'graphite' -> 'monochrome'
  if (id === 'midnight') return PALETTES[0]
  if (id === 'light') return PALETTES.find(p => p.id === 'clean-light') || PALETTES[0]
  if (id === 'graphite') return PALETTES.find(p => p.id === 'slate-teal') || PALETTES[0]
  return PALETTES.find(p => p.id === id) || PALETTES[0]
}

// ─── Color & Luminance Math ──────────────────────────────────────────────────

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '').trim()
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16)
    const g = parseInt(clean[1] + clean[1], 16)
    const b = parseInt(clean[2] + clean[2], 16)
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null
    return { r, g, b }
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16)
    const g = parseInt(clean.slice(2, 4), 16)
    const b = parseInt(clean.slice(4, 6), 16)
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null
    return { r, g, b }
  }
  return null
}

export function isValidHex(hex: string): boolean {
  return /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex.trim())
}

export function normalizeHex(hex: string): string {
  let clean = hex.trim()
  if (!clean.startsWith('#')) clean = `#${clean}`
  return clean.toUpperCase()
}

/**
 * Calculates relative luminance according to WCAG 2.1 specifications:
 * https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
export function getRelativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0
  const transform = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  const r = transform(rgb.r)
  const g = transform(rgb.g)
  const b = transform(rgb.b)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Contrast ratio: (L1 + 0.05) / (L2 + 0.05) where L1 is lighter
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hex1)
  const l2 = getRelativeLuminance(hex2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Returns readable text color (#000000 or #FFFFFF) for buttons based on contrast.
 */
export function getOnAccentColor(accentHex: string): '#000000' | '#FFFFFF' {
  const contrastWithBlack = getContrastRatio(accentHex, '#000000')
  const contrastWithWhite = getContrastRatio(accentHex, '#FFFFFF')
  return contrastWithBlack >= contrastWithWhite ? '#000000' : '#FFFFFF'
}

/**
 * Generates RGBA string at specified opacity (default 12% = 0.12)
 */
export function getAccentTint(hex: string, alpha = 0.12): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return `rgba(34, 197, 94, ${alpha})`
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

/**
 * Checks WCAG AA compliance (4.5:1 for normal text, 3.0:1 for graphical/large text).
 */
export function checkWcagAA(foregroundHex: string, backgroundHex: string): {
  passesText: boolean
  passesLarge: boolean
  ratio: number
} {
  const ratio = Math.round(getContrastRatio(foregroundHex, backgroundHex) * 100) / 100
  return {
    passesText: ratio >= 4.5,
    passesLarge: ratio >= 3.0,
    ratio,
  }
}

// ─── Active Theme Resolution ──────────────────────────────────────────────────

export interface ResolvedPalette {
  id: string
  name: string
  category: 'dark' | 'light'
  bg: string
  surface: string
  text: string
  muted: string
  accent: string
  accent2: string
  accentTint: string
  onAccent: '#000000' | '#FFFFFF'
  isCustomAccent: boolean
  isCustomAccent2: boolean
  wcag: {
    passesText: boolean
    passesLarge: boolean
    ratio: number
  }
  cssVariables: Record<string, string>
}

export function resolvePalette(
  paletteId?: string,
  customAccent?: string,
  customAccent2?: string
): ResolvedPalette {
  const preset = getPalettePreset(paletteId)

  const finalAccent = customAccent && isValidHex(customAccent) ? normalizeHex(customAccent) : preset.accent
  const finalAccent2 = customAccent2 && isValidHex(customAccent2) ? normalizeHex(customAccent2) : preset.accent2

  const onAccent = getOnAccentColor(finalAccent)
  const accentTint = getAccentTint(finalAccent, 0.12)
  const wcag = checkWcagAA(finalAccent, preset.bg)

  return {
    id: preset.id,
    name: preset.name,
    category: preset.category,
    bg: preset.bg,
    surface: preset.surface,
    text: preset.text,
    muted: preset.muted,
    accent: finalAccent,
    accent2: finalAccent2,
    accentTint,
    onAccent,
    isCustomAccent: Boolean(customAccent && isValidHex(customAccent) && normalizeHex(customAccent) !== preset.accent),
    isCustomAccent2: Boolean(customAccent2 && isValidHex(customAccent2) && normalizeHex(customAccent2) !== preset.accent2),
    wcag,
    cssVariables: {
      '--bg': preset.bg,
      '--surface': preset.surface,
      '--text': preset.text,
      '--muted': preset.muted,
      '--accent': finalAccent,
      '--accent2': finalAccent2,
      '--accent-tint': accentTint,
      '--on-accent': onAccent,
    },
  }
}
