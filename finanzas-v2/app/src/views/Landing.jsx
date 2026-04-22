import { useEffect, useRef, useState, forwardRef } from 'react'

// ─── Color tokens — edit here to retheme the entire page ──────────────────────
const C = {
  bg:           '#080a0e',
  bgCard:       '#0f1117',
  bgCardAlt:    '#131620',
  bgSection:    '#0b0d13',
  border:       'rgba(255,255,255,0.07)',
  borderBright: 'rgba(255,255,255,0.13)',
  accent:       '#2dce89',          // emerald green
  accentDim:    'rgba(45,206,137,0.12)',
  accentGlow:   'rgba(45,206,137,0.25)',
  gold:         '#f0c040',
  goldDim:      'rgba(240,192,64,0.12)',
  textPrimary:  '#f0f2f7',
  textSecondary:'#8a91a8',
  textMuted:    '#555c72',
  white:        '#ffffff',
}

// ─── Google Fonts injection ────────────────────────────────────────────────────
function useFonts() {
  useEffect(() => {
    if (document.getElementById('landing-fonts')) return
    const link = document.createElement('link')
    link.id = 'landing-fonts'
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;0,9..144,700;0,9..144,900;1,9..144,300;1,9..144,700&family=Inter:wght@300;400;500;600&display=swap'
    document.head.appendChild(link)
  }, [])
}

// ─── Animated counter ─────────────────────────────────────────────────────────
function AnimatedCounter({ target, prefix = '', suffix = '', duration = 1800 }) {
  const [value, setValue] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const start = performance.now()
          const tick = (now) => {
            const elapsed = now - start
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setValue(Math.round(eased * target))
            if (progress < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }
      },
      { threshold: 0.5 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target, duration])

  return <span ref={ref}>{prefix}{value.toLocaleString('es-ES')}{suffix}</span>
}

// ─── Fade-in on scroll ────────────────────────────────────────────────────────
function FadeIn({ children, delay = 0, style = {} }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ─── SVG icons ────────────────────────────────────────────────────────────────
const IconMic = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
  </svg>
)
const IconCamera = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
)
const IconChart = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
)
const IconTarget = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
  </svg>
)
const IconShield = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)
const IconCheck = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const IconStar = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={C.gold} stroke="none">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
)
const IconArrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
)
const IconPen = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
  </svg>
)
const IconEye = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)
const IconBrain = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.66z"/>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.66z"/>
  </svg>
)

// ─── Main component ────────────────────────────────────────────────────────────
export default function Landing() {
  useFonts()
  const ctaRef = useRef(null)
  const howItWorksRef = useRef(null)

  const scrollToCTA = () => {
    ctaRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const scrollToHowItWorks = () => {
    document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })
  }

  const goToApp = () => {
    window.location.href = '/?auth'
  }

  return (
    <div style={s.root}>
      <GlobalStyles />
      <Navbar onCTA={goToApp} />
      <HeroSection onCTA={goToApp} onLearnMore={scrollToHowItWorks} />
      <ProblemSection />
      <SolutionSection ref={howItWorksRef} />
      <StatsSection />
      <BenefitsSection />
      <HowItWorksSection />
      <PricingSection />
      <FinalCTA ref={ctaRef} onCTA={goToApp} />
      <Footer />
    </div>
  )
}

// ─── Global style injection ───────────────────────────────────────────────────
function GlobalStyles() {
  useEffect(() => {
    if (document.getElementById('landing-global-style')) return
    const style = document.createElement('style')
    style.id = 'landing-global-style'
    style.textContent = `
      .landing-btn-primary:hover { background: #25b878 !important; transform: translateY(-1px) !important; box-shadow: 0 8px 32px rgba(45,206,137,0.35) !important; }
      .landing-btn-ghost:hover { background: rgba(255,255,255,0.07) !important; border-color: rgba(255,255,255,0.2) !important; transform: translateY(-1px) !important; }
      .landing-pain-card:hover { border-color: rgba(255,255,255,0.15) !important; transform: translateY(-3px) !important; }
      .landing-benefit-card:hover { border-color: rgba(45,206,137,0.3) !important; transform: translateY(-4px) !important; background: rgba(45,206,137,0.05) !important; }
      .landing-plan-card:hover { transform: translateY(-4px) !important; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html { scroll-behavior: smooth; }
      ::selection { background: rgba(45,206,137,0.3); color: #fff; }

      /* ── Tablet (≤768px) ─────────────────────────────────────────────── */
      @media (max-width: 768px) {
        .landing-steps-grid  { grid-template-columns: 1fr !important; }
        .landing-benefits-grid { grid-template-columns: repeat(2, 1fr) !important; }
        .landing-features-grid { grid-template-columns: repeat(2, 1fr) !important; }
        .landing-pain-grid   { grid-template-columns: 1fr !important; }
        .landing-stats-grid  { grid-template-columns: repeat(2, 1fr) !important; }
        .landing-pricing-grid { grid-template-columns: 1fr !important; max-width: 100% !important; }
      }

      /* ── Mobile (≤480px) ─────────────────────────────────────────────── */
      @media (max-width: 480px) {
        .landing-container   { padding: 0 1rem !important; }
        .landing-section     { padding: 3rem 0 !important; }
        .landing-hero        { padding-top: 6rem !important; padding-bottom: 3rem !important; }
        .landing-hero-headline { font-size: 2.4rem !important; }
        .landing-hero-ctas   { flex-direction: column !important; align-items: stretch !important; }
        .landing-hero-ctas .landing-btn-primary,
        .landing-hero-ctas .landing-btn-ghost { width: 100% !important; justify-content: center !important; }
        .landing-widget      { max-width: 100% !important; width: 100% !important; }
        .landing-hero-stats  { gap: 1.5rem !important; }
        .landing-benefits-grid { grid-template-columns: 1fr !important; }
        .landing-features-grid { grid-template-columns: 1fr !important; }
        .landing-stats-grid  { grid-template-columns: repeat(2, 1fr) !important; }
        .landing-final-cta   { padding: 4rem 0 !important; }
        .landing-section-sub { margin-bottom: 2rem !important; }
        .landing-navbar      { padding: 0 1rem !important; }
      }
    `
    document.head.appendChild(style)
    return () => style.remove()
  }, [])
  return null
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ onCTA }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <nav className="landing-navbar" style={{
      ...s.navbar,
      background: scrolled ? 'rgba(8,10,14,0.95)' : 'transparent',
      borderBottomColor: scrolled ? C.border : 'transparent',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
    }}>
      <div style={s.navInner}>
        <div style={s.navLogo}>
          <img src="/logo/bilans-logo-positive.svg" height="32" alt="Bilans" style={{ display: 'block' }} />
          <span style={s.logoText}>Bilans</span>
        </div>
        <button
          className="landing-btn-primary"
          style={s.btnPrimary}
          onClick={onCTA}
        >
          Empezar gratis
        </button>
      </div>
    </nav>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function HeroSection({ onCTA, onLearnMore }) {
  return (
    <section className="landing-hero" style={s.hero}>
      <div style={s.heroGlow} />
      <div style={s.heroBgGrid} />
      <div className="landing-container" style={s.container}>
        <div style={s.heroBadge}>
          <span style={s.heroBadgeDot} />
          Control financiero personal
        </div>

        <h1 className="landing-hero-headline" style={s.heroHeadline}>
          Deja de adivinar.<br />
          <em style={s.heroItalic}>Empieza a decidir.</em>
        </h1>

        <p style={s.heroSub}>
          Sabe exactamente cuánto puedes gastar hoy, cuánto ahorraste este mes
          y qué pasará con tu dinero el mes que viene. Sin hojas de cálculo.
          Sin sorpresas.
        </p>

        <div className="landing-hero-ctas" style={s.heroCTAs}>
          <button
            className="landing-btn-primary"
            style={{ ...s.btnPrimary, ...s.btnLarge }}
            onClick={onCTA}
          >
            Empezar gratis
            <span style={{ marginLeft: 8 }}><IconArrow /></span>
          </button>
          <button
            className="landing-btn-ghost"
            style={{ ...s.btnGhost, ...s.btnLarge }}
            onClick={onLearnMore}
          >
            Ver cómo funciona
          </button>
        </div>

        <div style={s.heroVisual}>
          <BalanceWidget />
        </div>

        <div className="landing-hero-stats" style={s.heroStats}>
          {[
            { label: 'transacciones registradas', value: 2847, suffix: '' },
            { label: 'presupuestos creados', value: 341, suffix: '' },
            { label: 'ahorro promedio mensual', value: 18, suffix: '%' },
          ].map(({ label, value, suffix }) => (
            <div key={label} style={s.heroStat}>
              <div style={s.heroStatNum}>
                <AnimatedCounter target={value} suffix={suffix} />
              </div>
              <div style={s.heroStatLabel}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function BalanceWidget() {
  const [counter, setCounter] = useState(0)

  useEffect(() => {
    const target = 1450
    const duration = 2200
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 4)
      setCounter(Math.round(eased * target))
      if (p < 1) requestAnimationFrame(tick)
    }
    const raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="landing-widget" style={s.widget}>
      <div style={s.widgetHeader}>
        <div style={s.widgetDots}>
          {['#ff5f57','#ffbd2e','#28ca41'].map(c => (
            <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
          ))}
        </div>
        <span style={s.widgetTitle}>Mi balance actual</span>
      </div>
      <div style={s.widgetBalance}>
        <span style={s.widgetCurrency}>€</span>
        <span style={s.widgetAmount}>{counter.toLocaleString('es-ES')}</span>
      </div>
      <div style={s.widgetRows}>
        {[
          { label: 'Ingresos este mes', amount: '+€3,200', color: C.accent },
          { label: 'Gastos fijos', amount: '−€850', color: '#e05d5d' },
          { label: 'Gastos variables', amount: '−€420', color: '#e05d5d' },
          { label: 'Ahorro', amount: '+€480', color: '#60a5fa' },
        ].map(({ label, amount, color }) => (
          <div key={label} style={s.widgetRow}>
            <span style={s.widgetRowLabel}>{label}</span>
            <span style={{ ...s.widgetRowAmount, color }}>{amount}</span>
          </div>
        ))}
      </div>
      <div style={s.widgetBar}>
        <div style={s.widgetBarTrack}>
          <div style={{ ...s.widgetBarFill, width: '71%' }} />
        </div>
        <span style={s.widgetBarLabel}>71% del mes restante</span>
      </div>
    </div>
  )
}

// ─── Problem ──────────────────────────────────────────────────────────────────
function ProblemSection() {
  const pains = [
    {
      emoji: '😬',
      title: 'Llegas a fin de mes y no sabes en qué se fue',
      text: 'Miras el saldo y no encaja. Sabes que gastaste, pero no sabes dónde. Ese dinero simplemente desapareció.',
    },
    {
      emoji: '🙏',
      title: 'Pagas sin mirar el saldo y esperas lo mejor',
      text: '"Creo que tengo suficiente." Ese momento de incertidumbre cuando pasan la tarjeta. No debería ser así.',
    },
    {
      emoji: '📊',
      title: 'Abres una hoja de cálculo y la cierras a los 5 minutos',
      text: 'Lo intentas. De verdad. Pero es complicado, tedioso, y nunca está actualizado. Así que no sirve de nada.',
    },
    {
      emoji: '💸',
      title: 'Quieres ahorrar, pero nunca sabes cuánto puedes',
      text: 'Al final del mes ya no queda nada para ahorrar. Siempre mañana. Siempre el mes que viene.',
    },
  ]

  return (
    <section className="landing-section" style={{ ...s.section, background: C.bgSection }}>
      <div className="landing-container" style={s.container}>
        <FadeIn>
          <div style={s.sectionLabel}>El problema</div>
          <h2 style={s.sectionHeadline}>¿Reconoces esto?</h2>
          <p className="landing-section-sub" style={s.sectionSub}>
            No estás solo. La mayoría vivimos en un vago "creo que tengo dinero suficiente"
            que genera más estrés del que parece.
          </p>
        </FadeIn>

        <div className="landing-pain-grid" style={s.painGrid}>
          {pains.map((pain, i) => (
            <FadeIn key={pain.title} delay={i * 80} style={{ height: '100%' }}>
              <div className="landing-pain-card" style={s.painCard}>
                <div style={s.painEmoji}>{pain.emoji}</div>
                <h3 style={s.painTitle}>{pain.title}</h3>
                <p style={s.painText}>{pain.text}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Solution ─────────────────────────────────────────────────────────────────
const SolutionSection = forwardRef((props, ref) => {
  return (
    <section id="como-funciona" ref={ref} className="landing-section" style={s.section}>
      <div className="landing-container" style={s.container}>
        <FadeIn>
          <div style={s.sectionLabel}>La solución</div>
          <h2 style={{ ...s.sectionHeadline, maxWidth: 640, margin: '0 auto 1.5rem' }}>
            Con Finanzas, el dinero deja de ser un misterio
          </h2>
          <p className="landing-section-sub" style={s.sectionSub}>
            Tres pasos. Menos de un minuto al día. Y siempre sabrás exactamente dónde estás.
          </p>
        </FadeIn>

        <div className="landing-steps-grid" style={s.stepsGrid}>
          {[
            {
              num: '01',
              icon: <IconPen />,
              title: 'Apunta lo que entra y sale',
              text: 'Escríbelo, dilo por voz, o fotografía el ticket. Sin fricción. En segundos.',
              color: C.accent,
            },
            {
              num: '02',
              icon: <IconEye />,
              title: 'Ve exactamente en qué se va tu dinero',
              text: 'Gráficas claras, categorías automáticas, presupuestos por tipo de gasto. Todo visible de un vistazo.',
              color: C.gold,
            },
            {
              num: '03',
              icon: <IconBrain />,
              title: 'Toma decisiones con datos reales',
              text: 'Pregúntale a tu asesor IA, revisa tus metas, y actúa con la confianza de quien sabe lo que tiene.',
              color: '#a78bfa',
            },
          ].map((step, i) => (
            <FadeIn key={step.num} delay={i * 120} style={{ height: '100%' }}>
              <div style={s.stepCard}>
                <div style={{ ...s.stepNum, color: step.color, borderColor: `${step.color}30` }}>
                  {step.num}
                </div>
                <div style={{ ...s.stepIcon, color: step.color, background: `${step.color}15` }}>
                  {step.icon}
                </div>
                <h3 style={s.stepTitle}>{step.title}</h3>
                <p style={s.stepText}>{step.text}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
})

// ─── Stats ────────────────────────────────────────────────────────────────────
function StatsSection() {
  const stats = [
    { display: null, value: 100, suffix: '%', prefix: '', label: 'gratis para siempre en el plan base' },
    { display: null, value: 18, suffix: '%', prefix: '+', label: 'de ahorro promedio al primer mes' },
    { display: '< 2 min', value: null, label: 'para tener todo configurado' },
    { display: '24/7', value: null, label: 'tu asesor IA disponible siempre' },
  ]

  return (
    <section className="landing-section" style={{ ...s.section, background: C.bgSection, paddingTop: '4rem', paddingBottom: '4rem' }}>
      <div className="landing-container" style={s.container}>
        <div className="landing-stats-grid" style={s.statsGrid}>
          {stats.map(({ display, value, suffix, prefix, label }, i) => (
            <FadeIn key={label} delay={i * 80}>
              <div style={s.statCard}>
                <div style={s.statNum}>
                  {display
                    ? display
                    : <AnimatedCounter target={value} prefix={prefix} suffix={suffix} />
                  }
                </div>
                <div style={s.statLabel}>{label}</div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Benefits ─────────────────────────────────────────────────────────────────
function BenefitsSection() {
  const benefits = [
    {
      icon: '🎯',
      title: 'Sabes si puedes permitirte esa cena esta semana',
      text: 'No más "creo que sí". Una sola mirada y tienes la respuesta.',
    },
    {
      icon: '📈',
      title: 'Ves tu ahorro crecer cada mes',
      text: 'No es una promesa vaga. Es una barra que sube. Una cifra que aumenta. Real y tuya.',
    },
    {
      icon: '🤫',
      title: 'Nunca más te sorprende el extracto bancario',
      text: 'Ya lo sabías antes de abrirlo. Porque llevas el control tú, no el banco.',
    },
    {
      icon: '🤖',
      title: 'Tu asesor IA disponible 24/7',
      text: '"¿Puedo darme ese capricho?" — pregúntalo y recibe una respuesta honesta basada en tus datos.',
    },
    {
      icon: '📷',
      title: 'Un ticket foto y ya está registrado',
      text: 'Saca foto al ticket. La IA extrae importe, comercio y fecha. Listo.',
    },
    {
      icon: '🧘',
      title: 'Sin hojas de cálculo, sin complicaciones',
      text: 'Diseñado para personas normales, no para contables. Si puedes pedir comida por el móvil, puedes usar esto.',
    },
  ]

  return (
    <section className="landing-section" style={s.section}>
      <div className="landing-container" style={s.container}>
        <FadeIn>
          <div style={s.sectionLabel}>Resultados reales</div>
          <h2 style={s.sectionHeadline}>Lo que cambia de verdad</h2>
          <p className="landing-section-sub" style={s.sectionSub}>
            No son funciones de software. Son cosas que ocurren en tu vida cuando
            dejas de improvisar con tu dinero.
          </p>
        </FadeIn>

        <div className="landing-benefits-grid" style={s.benefitsGrid}>
          {benefits.map((b, i) => (
            <FadeIn key={b.title} delay={i * 70} style={{ height: '100%' }}>
              <div className="landing-benefit-card" style={s.benefitCard}>
                <div style={s.benefitEmoji}>{b.icon}</div>
                <h3 style={s.benefitTitle}>{b.title}</h3>
                <p style={s.benefitText}>{b.text}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── How it works (features with context) ────────────────────────────────────
function HowItWorksSection() {
  const features = [
    {
      icon: <IconPen />,
      color: C.accent,
      title: 'Registro rápido',
      text: 'Añade una transacción en 3 toques. O di "gasté 12 euros en el super" y ya está.',
    },
    {
      icon: <IconMic />,
      color: C.gold,
      title: 'Entrada por voz',
      text: 'Habla como si le dijeras a un amigo. La app lo interpreta y lo clasifica sola.',
    },
    {
      icon: <IconCamera />,
      color: '#a78bfa',
      title: 'Escaneo de tickets',
      text: 'Fotografía cualquier ticket y la IA extrae importe, comercio, fecha y categoría automáticamente.',
    },
    {
      icon: <IconChart />,
      color: '#60c5f1',
      title: 'Análisis visual',
      text: 'Gráficas mensuales, evolución del ahorro, desglose por categorías. Todo claro, todo tuyo.',
    },
    {
      icon: <IconTarget />,
      color: '#f97316',
      title: 'Metas de ahorro',
      text: 'Define un objetivo —vacaciones, fondo de emergencia, lo que sea— y sigue tu progreso cada mes.',
    },
    {
      icon: <IconShield />,
      color: C.accent,
      title: 'Tus datos, seguros',
      text: 'Backend real con Supabase. Autenticación segura. Tus datos no se venden ni se comparten.',
    },
  ]

  return (
    <section className="landing-section" style={{ ...s.section, background: C.bgSection }}>
      <div className="landing-container" style={s.container}>
        <FadeIn>
          <div style={s.sectionLabel}>Las herramientas</div>
          <h2 style={s.sectionHeadline}>Todo lo que necesitas, nada de lo que no</h2>
        </FadeIn>
        <div className="landing-features-grid" style={s.featuresGrid}>
          {features.map((f, i) => (
            <FadeIn key={f.title} delay={i * 70} style={{ height: '100%' }}>
              <div style={s.featureCard}>
                <div style={{ ...s.featureIcon, color: f.color, background: `${f.color}15` }}>
                  {f.icon}
                </div>
                <h3 style={s.featureTitle}>{f.title}</h3>
                <p style={s.featureText}>{f.text}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Pricing ──────────────────────────────────────────────────────────────────
function PricingSection() {
  const freeItems = [
    'Transacciones ilimitadas',
    'Todas las cuentas bancarias',
    'Categorías personalizadas',
    'Presupuestos mensuales',
    'Metas de ahorro',
    'Análisis y gráficas',
    'Transacciones recurrentes',
    '10 consultas IA al mes',
    '5 audios por voz al mes',
    '3 fotos de ticket al mes',
  ]
  const proItems = [
    'Todo lo del plan Gratis',
    'Chat IA sin límite de consultas',
    'Entrada por voz ilimitada',
    'Escaneo de tickets ilimitado',
    'Historial financiero extendido',
    'Exportación de datos',
    'Soporte prioritario',
    'Próximas funciones antes que nadie',
  ]

  return (
    <section className="landing-section" style={s.section}>
      <div className="landing-container" style={s.container}>
        <FadeIn>
          <div style={s.sectionLabel}>Planes</div>
          <h2 style={s.sectionHeadline}>Simple y honesto</h2>
          <p className="landing-section-sub" style={s.sectionSub}>
            El plan Gratis no es un anzuelo. Es una app completa, para siempre.
            El Pro es para quien quiere más IA.
          </p>
        </FadeIn>

        <div className="landing-pricing-grid" style={s.pricingGrid}>
          {/* FREE */}
          <FadeIn delay={0}>
            <div className="landing-plan-card" style={{ ...s.planCard, transition: 'all 0.25s ease' }}>
              <div style={s.planHeader}>
                <div style={s.planName}>Gratis</div>
                <div style={s.planPrice}>
                  <span style={s.planPriceNum}>€0</span>
                  <span style={s.planPricePer}> / para siempre</span>
                </div>
                <p style={s.planDesc}>
                  Una app completa, sin límite de tiempo. Sin trucos.
                </p>
              </div>
              <ul style={s.planList}>
                {freeItems.map(item => (
                  <li key={item} style={s.planItem}>
                    <span style={{ ...s.planCheck, color: C.accent }}><IconCheck /></span>
                    {item}
                  </li>
                ))}
              </ul>
              <button
                className="landing-btn-ghost"
                style={{ ...s.btnGhost, width: '100%', marginTop: '2rem', justifyContent: 'center' }}
                onClick={() => window.location.href = '/'}
              >
                Empezar gratis
              </button>
            </div>
          </FadeIn>

          {/* PRO */}
          <FadeIn delay={120}>
            <div
              className="landing-plan-card"
              style={{
                ...s.planCard,
                border: `1px solid ${C.accent}40`,
                background: `linear-gradient(135deg, ${C.bgCard} 0%, rgba(45,206,137,0.05) 100%)`,
                transition: 'all 0.25s ease',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={s.planProBadge}>Próximamente</div>
              <div style={{
                position: 'absolute', top: 0, right: 0, width: 180, height: 180,
                background: `radial-gradient(circle, ${C.accentGlow} 0%, transparent 70%)`,
                pointerEvents: 'none',
              }} />
              <div style={s.planHeader}>
                <div style={{ ...s.planName, color: C.accent }}>Pro</div>
                <div style={s.planPrice}>
                  <span style={{ ...s.planPriceNum, color: C.accent }}>€?</span>
                  <span style={s.planPricePer}> / mes</span>
                </div>
                <p style={s.planDesc}>
                  Para quien quiere que la IA trabaje sin límites de su lado.
                </p>
              </div>
              <ul style={s.planList}>
                {proItems.map(item => (
                  <li key={item} style={s.planItem}>
                    <span style={{ ...s.planCheck, color: C.accent }}><IconCheck /></span>
                    {item}
                  </li>
                ))}
              </ul>
              <button
                className="landing-btn-ghost"
                style={{
                  ...s.btnGhost,
                  width: '100%',
                  marginTop: '2rem',
                  justifyContent: 'center',
                  borderColor: `${C.accent}50`,
                  color: C.accent,
                  opacity: 0.7,
                  cursor: 'default',
                }}
              >
                Avisarme cuando esté disponible
              </button>
            </div>
          </FadeIn>
        </div>

        <FadeIn delay={200}>
          <div style={s.pricingNote}>
            <div style={s.starRow}>
              {[0,1,2,3,4].map(i => <IconStar key={i} />)}
            </div>
            <p style={s.pricingNoteText}>
              "Llevo 3 meses usando la versión gratuita y ya sé exactamente qué ocurre con mi dinero cada mes."
            </p>
            <p style={s.pricingNoteAuthor}>— Beta tester</p>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

// ─── Final CTA ────────────────────────────────────────────────────────────────
const FinalCTA = ({ onCTA, ref: forwardedRef }) => (
  <section ref={forwardedRef} className="landing-section landing-final-cta" style={s.finalCTA}>
    <div style={s.finalCTAGlow} />
    <div className="landing-container" style={{ ...s.container, position: 'relative', zIndex: 1 }}>
      <FadeIn>
        <div style={s.finalCTAInner}>
          <div style={s.finalCTABadge}>Empieza hoy</div>
          <h2 style={s.finalHeadline}>
            Tu yo del futuro<br />
            <em style={{ ...s.heroItalic, fontSize: 'inherit' }}>te lo agradecerá.</em>
          </h2>
          <p style={s.finalSub}>
            Cada día que sigues sin llevar el control es un día más de incertidumbre.
            El cambio empieza con un registro. Uno solo.
          </p>
          <button
            className="landing-btn-primary"
            style={{ ...s.btnPrimary, ...s.btnXL }}
            onClick={onCTA}
          >
            Empezar gratis
            <span style={{ marginLeft: 8 }}><IconArrow /></span>
          </button>
          <p style={s.finalNote}>Disponible en web y móvil · Se guarda en la nube · Sin límite de tiempo</p>
        </div>
      </FadeIn>
    </div>
  </section>
)

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={s.footer}>
      <div style={s.footerInner}>
        <div style={s.navLogo}>
          <img src="/logo/bilans-logo-positive.svg" height="32" alt="Bilans" style={{ display: 'block' }} />
          <span style={{ ...s.logoText, fontSize: '1rem' }}>Bilans</span>
        </div>
        <p style={s.footerText}>
          Control financiero personal · Hecho con cuidado
        </p>
      </div>
    </footer>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const FONT_DISPLAY = "'Fraunces', Georgia, serif"
const FONT_BODY = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"

const s = {
  root: {
    background: C.bg,
    color: C.textPrimary,
    fontFamily: FONT_BODY,
    fontWeight: 400,
    lineHeight: 1.6,
    overflowX: 'hidden',
    minHeight: '100vh',
  },

  // Navbar
  navbar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottom: `1px solid transparent`,
    transition: 'all 0.3s ease',
    padding: '0 1.5rem',
  },
  navInner: {
    maxWidth: 1100,
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 64,
  },
  navLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  logoDot: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: `linear-gradient(135deg, ${C.accent}, #1aa86a)`,
    boxShadow: `0 0 12px ${C.accentGlow}`,
  },
  logoText: {
    fontFamily: FONT_BODY,
    fontWeight: 800,
    fontSize: '1.25rem',
    color: C.white,
    letterSpacing: '-0.03em',
  },

  // Buttons
  btnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    background: C.accent,
    color: '#061a10',
    border: 'none',
    borderRadius: 10,
    padding: '0.65rem 1.4rem',
    fontSize: '0.9rem',
    fontWeight: 600,
    fontFamily: FONT_BODY,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
    minHeight: 44,
  },
  btnGhost: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    background: 'transparent',
    color: C.textPrimary,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: '0.65rem 1.4rem',
    fontSize: '0.9rem',
    fontWeight: 500,
    fontFamily: FONT_BODY,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
    minHeight: 44,
  },
  btnLarge: {
    padding: '0.85rem 2rem',
    fontSize: '1rem',
    borderRadius: 12,
  },
  btnXL: {
    padding: '1.1rem 2.8rem',
    fontSize: '1.1rem',
    borderRadius: 14,
    fontWeight: 700,
  },

  // Sections
  container: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '0 1.5rem',
  },
  section: {
    padding: '6rem 0',
  },
  sectionLabel: {
    display: 'inline-block',
    fontSize: '0.75rem',
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: C.accent,
    marginBottom: '1rem',
    padding: '0.35rem 0.9rem',
    background: C.accentDim,
    borderRadius: 100,
    border: `1px solid ${C.accent}30`,
  },
  sectionHeadline: {
    fontFamily: FONT_DISPLAY,
    fontSize: 'clamp(2rem, 5vw, 3rem)',
    fontWeight: 700,
    lineHeight: 1.15,
    color: C.white,
    marginBottom: '1rem',
    letterSpacing: '-0.02em',
    textAlign: 'center',
  },
  sectionSub: {
    fontSize: '1.05rem',
    color: C.textSecondary,
    maxWidth: 560,
    margin: '0 auto 3.5rem',
    textAlign: 'center',
    lineHeight: 1.7,
  },

  // Hero
  hero: {
    position: 'relative',
    paddingTop: '9rem',
    paddingBottom: '5rem',
    textAlign: 'center',
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: '10%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 800,
    height: 500,
    background: `radial-gradient(ellipse at center, ${C.accentGlow} 0%, transparent 65%)`,
    pointerEvents: 'none',
  },
  heroBgGrid: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `linear-gradient(${C.border} 1px, transparent 1px), linear-gradient(90deg, ${C.border} 1px, transparent 1px)`,
    backgroundSize: '60px 60px',
    maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
    pointerEvents: 'none',
    opacity: 0.5,
  },
  heroBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: C.accentDim,
    border: `1px solid ${C.accent}30`,
    borderRadius: 100,
    padding: '0.4rem 1rem',
    fontSize: '0.8rem',
    fontWeight: 500,
    color: C.accent,
    marginBottom: '1.75rem',
  },
  heroBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: C.accent,
    boxShadow: `0 0 6px ${C.accent}`,
  },
  heroHeadline: {
    fontFamily: FONT_DISPLAY,
    fontSize: 'clamp(2.8rem, 7vw, 5.5rem)',
    fontWeight: 700,
    lineHeight: 1.05,
    color: C.white,
    letterSpacing: '-0.03em',
    marginBottom: '1.5rem',
    position: 'relative',
    zIndex: 1,
  },
  heroItalic: {
    fontStyle: 'italic',
    color: C.accent,
    fontWeight: 300,
  },
  heroSub: {
    fontSize: 'clamp(1rem, 2vw, 1.2rem)',
    color: C.textSecondary,
    maxWidth: 560,
    margin: '0 auto 2.5rem',
    lineHeight: 1.7,
    position: 'relative',
    zIndex: 1,
  },
  heroCTAs: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem',
    justifyContent: 'center',
    marginBottom: '4rem',
    position: 'relative',
    zIndex: 1,
  },
  heroVisual: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '4rem',
    position: 'relative',
    zIndex: 1,
  },
  heroStats: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '3rem',
    position: 'relative',
    zIndex: 1,
  },
  heroStat: { textAlign: 'center' },
  heroStatNum: {
    fontFamily: FONT_DISPLAY,
    fontSize: '2rem',
    fontWeight: 700,
    color: C.white,
    letterSpacing: '-0.02em',
  },
  heroStatLabel: {
    fontSize: '0.8rem',
    color: C.textMuted,
    marginTop: 4,
  },

  // Balance widget
  widget: {
    background: C.bgCard,
    border: `1px solid ${C.borderBright}`,
    borderRadius: 18,
    padding: '1.5rem',
    width: '100%',
    maxWidth: 380,
    boxShadow: `0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px ${C.border}`,
    textAlign: 'left',
  },
  widgetHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: '1.25rem',
  },
  widgetDots: { display: 'flex', gap: 6 },
  widgetTitle: {
    fontSize: '0.8rem',
    color: C.textMuted,
    fontWeight: 500,
  },
  widgetBalance: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: '1.25rem',
  },
  widgetCurrency: {
    fontSize: '1.75rem',
    fontWeight: 300,
    color: C.textSecondary,
    fontFamily: FONT_DISPLAY,
  },
  widgetAmount: {
    fontFamily: FONT_DISPLAY,
    fontSize: '3rem',
    fontWeight: 700,
    color: C.white,
    letterSpacing: '-0.03em',
    lineHeight: 1,
  },
  widgetRows: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginBottom: '1.25rem',
    borderTop: `1px solid ${C.border}`,
    paddingTop: '1rem',
  },
  widgetRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  widgetRowLabel: { fontSize: '0.82rem', color: C.textSecondary },
  widgetRowAmount: { fontSize: '0.85rem', fontWeight: 600, fontFamily: FONT_BODY },
  widgetBar: {
    borderTop: `1px solid ${C.border}`,
    paddingTop: '1rem',
  },
  widgetBarTrack: {
    height: 6,
    background: 'rgba(255,255,255,0.06)',
    borderRadius: 100,
    marginBottom: '0.5rem',
    overflow: 'hidden',
  },
  widgetBarFill: {
    height: '100%',
    background: `linear-gradient(90deg, ${C.accent}, #1aa86a)`,
    borderRadius: 100,
  },
  widgetBarLabel: { fontSize: '0.75rem', color: C.textMuted },

  // Pain section
  painGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1.25rem',
    alignItems: 'stretch',
  },
  painCard: {
    background: C.bgCard,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: '1.75rem',
    transition: 'all 0.25s ease',
    cursor: 'default',
    height: '100%',
  },
  painEmoji: { fontSize: '2rem', marginBottom: '0.75rem' },
  painTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: C.white,
    marginBottom: '0.5rem',
    lineHeight: 1.4,
    fontFamily: FONT_BODY,
  },
  painText: {
    fontSize: '0.875rem',
    color: C.textSecondary,
    lineHeight: 1.65,
  },

  // Steps
  stepsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1.5rem',
    marginTop: '1rem',
    alignItems: 'stretch',
  },
  stepCard: {
    background: C.bgCard,
    border: `1px solid ${C.border}`,
    borderRadius: 18,
    padding: '2rem 1.75rem',
    position: 'relative',
    height: '100%',
  },
  stepNum: {
    fontFamily: FONT_DISPLAY,
    fontSize: '3.5rem',
    fontWeight: 700,
    lineHeight: 1,
    marginBottom: '1rem',
    border: '1px solid',
    display: 'inline-block',
    width: 72,
    height: 72,
    borderRadius: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.02)',
  },
  stepIcon: {
    display: 'inline-flex',
    padding: '0.75rem',
    borderRadius: 14,
    marginBottom: '1rem',
  },
  stepTitle: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: C.white,
    marginBottom: '0.6rem',
    lineHeight: 1.3,
    fontFamily: FONT_BODY,
  },
  stepText: {
    fontSize: '0.875rem',
    color: C.textSecondary,
    lineHeight: 1.65,
  },

  // Stats
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1.5rem',
  },
  statCard: {
    textAlign: 'center',
    padding: '1.5rem',
    background: C.bgCard,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
  },
  statNum: {
    fontFamily: FONT_DISPLAY,
    fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
    fontWeight: 700,
    color: C.accent,
    lineHeight: 1,
    marginBottom: '0.5rem',
    letterSpacing: '-0.02em',
  },
  statLabel: {
    fontSize: '0.8rem',
    color: C.textSecondary,
    lineHeight: 1.4,
  },

  // Benefits
  benefitsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1.25rem',
    alignItems: 'stretch',
  },
  benefitCard: {
    background: C.bgCard,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: '1.75rem',
    transition: 'all 0.25s ease',
    cursor: 'default',
    height: '100%',
  },
  benefitEmoji: { fontSize: '2rem', marginBottom: '0.75rem' },
  benefitTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: C.white,
    marginBottom: '0.5rem',
    lineHeight: 1.4,
    fontFamily: FONT_BODY,
  },
  benefitText: {
    fontSize: '0.875rem',
    color: C.textSecondary,
    lineHeight: 1.65,
  },

  // Features
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1.25rem',
    marginTop: '1rem',
    alignItems: 'stretch',
  },
  featureCard: {
    background: C.bgCard,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: '1.75rem',
    height: '100%',
  },
  featureIcon: {
    display: 'inline-flex',
    padding: '0.75rem',
    borderRadius: 14,
    marginBottom: '1rem',
  },
  featureTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: C.white,
    marginBottom: '0.4rem',
    fontFamily: FONT_BODY,
  },
  featureText: {
    fontSize: '0.875rem',
    color: C.textSecondary,
    lineHeight: 1.65,
  },

  // Pricing
  pricingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.5rem',
    maxWidth: 760,
    margin: '0 auto 3rem',
  },
  planCard: {
    background: C.bgCard,
    border: `1px solid ${C.border}`,
    borderRadius: 20,
    padding: '2rem',
    position: 'relative',
  },
  planProBadge: {
    position: 'absolute',
    top: '1.25rem',
    right: '1.25rem',
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: C.accent,
    background: C.accentDim,
    border: `1px solid ${C.accent}30`,
    borderRadius: 100,
    padding: '0.3rem 0.7rem',
  },
  planHeader: { marginBottom: '1.5rem' },
  planName: {
    fontSize: '0.8rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: C.textSecondary,
    marginBottom: '0.75rem',
  },
  planPrice: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 2,
    marginBottom: '0.75rem',
  },
  planPriceNum: {
    fontFamily: FONT_DISPLAY,
    fontSize: '2.8rem',
    fontWeight: 700,
    color: C.white,
    letterSpacing: '-0.03em',
    lineHeight: 1,
  },
  planPricePer: {
    fontSize: '0.85rem',
    color: C.textMuted,
  },
  planDesc: {
    fontSize: '0.875rem',
    color: C.textSecondary,
    lineHeight: 1.6,
  },
  planList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.65rem',
  },
  planItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.6rem',
    fontSize: '0.875rem',
    color: C.textSecondary,
    lineHeight: 1.4,
  },
  planCheck: {
    flexShrink: 0,
    marginTop: 1,
  },
  pricingNote: {
    textAlign: 'center',
    maxWidth: 500,
    margin: '0 auto',
    padding: '2rem',
    background: C.bgCard,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
  },
  starRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: 4,
    marginBottom: '1rem',
  },
  pricingNoteText: {
    fontSize: '1rem',
    color: C.textPrimary,
    fontStyle: 'italic',
    fontFamily: FONT_DISPLAY,
    lineHeight: 1.6,
    marginBottom: '0.75rem',
  },
  pricingNoteAuthor: {
    fontSize: '0.8rem',
    color: C.textMuted,
  },

  // Final CTA
  finalCTA: {
    position: 'relative',
    padding: '8rem 0',
    textAlign: 'center',
    overflow: 'hidden',
    background: `linear-gradient(180deg, ${C.bg} 0%, #060d0a 50%, ${C.bg} 100%)`,
  },
  finalCTAGlow: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%,-50%)',
    width: 700,
    height: 400,
    background: `radial-gradient(ellipse, rgba(45,206,137,0.18) 0%, transparent 65%)`,
    pointerEvents: 'none',
  },
  finalCTAInner: {
    maxWidth: 680,
    margin: '0 auto',
  },
  finalCTABadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: C.accentDim,
    border: `1px solid ${C.accent}30`,
    borderRadius: 100,
    padding: '0.4rem 1rem',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: C.accent,
    marginBottom: '1.75rem',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  finalHeadline: {
    fontFamily: FONT_DISPLAY,
    fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
    fontWeight: 700,
    lineHeight: 1.1,
    color: C.white,
    letterSpacing: '-0.03em',
    marginBottom: '1.5rem',
  },
  finalSub: {
    fontSize: '1.05rem',
    color: C.textSecondary,
    maxWidth: 480,
    margin: '0 auto 2.5rem',
    lineHeight: 1.7,
  },
  finalNote: {
    marginTop: '1.25rem',
    fontSize: '0.8rem',
    color: C.textMuted,
  },

  // Footer
  footer: {
    borderTop: `1px solid ${C.border}`,
    padding: '2rem 1.5rem',
  },
  footerInner: {
    maxWidth: 1100,
    margin: '0 auto',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
  },
  footerText: {
    fontSize: '0.8rem',
    color: C.textMuted,
  },
}
