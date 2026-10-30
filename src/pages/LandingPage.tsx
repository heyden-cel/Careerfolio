import { Link } from 'react-router-dom'
import { Zap, FileText, Globe, Sparkles, ArrowRight, CheckCircle, LayoutDashboard } from 'lucide-react'
import { Button, Badge, Card } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'

const features = [
  { icon: FileText,  title: 'Smart Resumes',    desc: 'AI-tailored resumes that match job descriptions. ATS-optimised, one-click export.' },
  { icon: Globe,     title: 'Live Portfolios',  desc: 'Publish a stunning portfolio at your own slug. Share one link everywhere.' },
  { icon: Sparkles,  title: 'AI Writing',       desc: 'Generate compelling summaries, bullet points and bios in seconds.' },
]

const checks = ['No credit card required', 'Free forever plan', 'Your data, your control']

export function LandingPage() {
  const { user } = useAuth()
  const firstName = user?.name?.split(' ')[0] ?? ''

  return (
    <div className="relative overflow-hidden w-full flex flex-col">
      {/* Hero glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'var(--glow-hero)' }} />

      {/* Hero */}
      <section className="w-full relative z-10 pt-24 pb-20 text-center">
        <div className="w-full max-w-6xl mx-auto px-6 flex flex-col items-center text-center">
          <div className="mb-6">
            <Badge variant="live">New · AI Resume Builder</Badge>
          </div>

          {/* Personalised greeting for signed-in users */}
          {user && (
            <p className="text-sm font-medium text-[var(--color-primary)] mb-3 tracking-wide">
              👋 Welcome back{firstName ? `, ${firstName}` : ''}!
            </p>
          )}

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[var(--color-text)] leading-tight mb-6">
            Build a portfolio that<br />
            <span className="text-[var(--color-primary)]">actually lands jobs</span>
          </h1>
          <p className="text-base sm:text-lg text-[var(--color-text-muted)] leading-relaxed max-w-xl mx-auto mb-8">
            FolioAI crafts beautiful, ATS-optimised resumes and live portfolio sites — powered by AI, personalised for you.
          </p>

          <div className="flex flex-row flex-wrap items-center justify-center gap-4 w-full">
            {user ? (
              <Button as={Link} to="/dashboard" className="px-6 py-3 rounded-lg inline-flex items-center justify-center gap-2">
                <LayoutDashboard size={16} /> Go to dashboard
              </Button>
            ) : (
              <Button as={Link} to="/login" className="px-6 py-3 rounded-lg inline-flex items-center justify-center gap-2">
                Get started free <ArrowRight size={16} />
              </Button>
            )}
            <Button as={Link} to="/p/demo" variant="secondary" className="px-6 py-3 rounded-lg inline-flex items-center justify-center gap-2">
              View demo portfolio
            </Button>
          </div>

          <ul className="flex flex-row flex-wrap items-center justify-center gap-4 sm:gap-6 mt-8">
            {checks.map(c => (
              <li key={c} className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                <CheckCircle size={14} className="text-[var(--color-primary)] shrink-0" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Features */}
      <section className="w-full py-20 border-t border-[var(--color-border)]">
        <div className="w-full max-w-6xl mx-auto px-6">
          <div className="mb-10 text-center">
            <p className="text-[10px] font-mono font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
              Everything you need
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {features.map(({ icon: Icon, title, desc }) => (
              <Card key={title} elevated className="p-6 flex flex-col h-full">
                <div className="flex items-center justify-center w-10 h-10 rounded-[var(--radius-control)] bg-[var(--color-primary-subtle)] mb-4 shrink-0">
                  <Icon size={18} className="text-[var(--color-primary)]" />
                </div>
                <h3 className="font-semibold text-[var(--color-text)] mb-2">{title}</h3>
                <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="w-full py-20 border-t border-[var(--color-border)] text-center">
        <div className="w-full max-w-6xl mx-auto px-6 flex flex-col items-center text-center">
          <div className="mb-4 flex items-center justify-center">
            <Zap size={32} className="text-[var(--color-primary)]" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-[var(--color-text)] mb-4">
            Ready to stand out?
          </h2>
          <p className="text-[var(--color-text-muted)] max-w-xl mx-auto mb-8 leading-relaxed">
            Join thousands of professionals who land more interviews with FolioAI.
          </p>
          {user ? (
            <Button as={Link} to="/dashboard" className="px-6 py-3 rounded-lg inline-flex items-center justify-center gap-2">
              <LayoutDashboard size={16} /> Open dashboard
            </Button>
          ) : (
            <Button as={Link} to="/login" className="px-6 py-3 rounded-lg inline-flex items-center justify-center gap-2">
              Start for free <ArrowRight size={16} />
            </Button>
          )}
        </div>
      </section>
    </div>
  )
}
