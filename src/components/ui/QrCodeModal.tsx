import { useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { X, Download, Copy, ExternalLink } from 'lucide-react'
import { toast } from '@/components/ui/Toast'

interface QrCodeModalProps {
  url: string
  title: string
  label: string        // e.g. "Portfolio" or "Resume"
  onClose: () => void
}

export function QrCodeModal({ url, title, label, onClose }: QrCodeModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Link copied to clipboard!')
    }).catch(() => {
      toast.error('Failed to copy link')
    })
  }

  const handleDownload = () => {
    if (!svgRef.current) return
    const svgEl = svgRef.current
    const svgData = new XMLSerializer().serializeToString(svgEl)
    const canvas = document.createElement('canvas')
    const size = 512
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 0, 0, size, size)
      const link = document.createElement('a')
      link.download = `${label.toLowerCase()}-qr.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '18px',
          padding: '28px',
          maxWidth: '380px',
          width: '100%',
          boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          position: 'relative',
        }}
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            background: 'var(--color-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '5px',
            cursor: 'pointer',
            color: 'var(--color-text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={15} />
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', paddingRight: '20px' }}>
          <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
            QR Code
          </p>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
            {title}
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Scan to open this {label}
          </p>
        </div>

        {/* QR Code */}
        <div
          style={{
            background: '#ffffff',
            padding: '16px',
            borderRadius: '14px',
            border: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <QRCodeSVG
            ref={svgRef}
            value={url}
            size={200}
            level="H"
            includeMargin={false}
            style={{ display: 'block' }}
          />
        </div>

        {/* URL pill */}
        <div
          style={{
            background: 'var(--color-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '7px 12px',
            fontSize: '11px',
            fontFamily: 'monospace',
            color: 'var(--color-text-muted)',
            wordBreak: 'break-all',
            textAlign: 'center',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          {url}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
          <button
            type="button"
            onClick={handleCopyUrl}
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '9px 14px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '9px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-elevated)',
              color: 'var(--color-text)',
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--color-primary)'
              e.currentTarget.style.color = 'var(--color-primary)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--color-border)'
              e.currentTarget.style.color = 'var(--color-text)'
            }}
          >
            <Copy size={13} /> Copy Link
          </button>

          <button
            type="button"
            onClick={handleDownload}
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '9px 14px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '9px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-elevated)',
              color: 'var(--color-text)',
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--color-primary)'
              e.currentTarget.style.color = 'var(--color-primary)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--color-border)'
              e.currentTarget.style.color = 'var(--color-text)'
            }}
          >
            <Download size={13} /> Save PNG
          </button>

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '9px 13px',
              borderRadius: '9px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-elevated)',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              transition: 'all 150ms',
              textDecoration: 'none',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--color-primary)'
              ;(e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-primary)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--color-border)'
              ;(e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-text-muted)'
            }}
          >
            <ExternalLink size={13} />
          </a>
        </div>
      </div>
    </div>
  )
}

