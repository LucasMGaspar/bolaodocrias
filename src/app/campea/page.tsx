'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useRef, Suspense } from 'react'

const COLORS = [
  '#F2CB40', '#FFE87A',
  '#FF48E0', '#C040FF',
  '#3AE0FF', '#40FFC0',
  '#FF7040', '#FF4060',
  '#FFFFFF',
]

type Particle = {
  x: number; y: number
  vx: number; vy: number
  r: number; color: string
  life: number; decay: number
}

type Star = {
  x: number; y: number
  r: number; phase: number; spd: number
}

function useFireworks(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const partsRef = useRef<Particle[]>([])
  const starsRef = useRef<Star[]>([])
  const rafRef   = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    starsRef.current = Array.from({ length: 160 }, () => ({
      x: Math.random(), y: Math.random(),
      r: 0.3 + Math.random() * 1.1,
      phase: Math.random() * Math.PI * 2,
      spd: 0.006 + Math.random() * 0.018,
    }))

    function resize() {
      if (!canvas) return
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    function loop(t: number) {
      if (!canvas) return
      const W = canvas.width, H = canvas.height
      ctx.clearRect(0, 0, W, H)

      for (const s of starsRef.current) {
        const a = 0.15 + 0.45 * (0.5 + 0.5 * Math.sin(s.phase + t * s.spd * 0.001))
        ctx.beginPath()
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(200,215,255,${a})`
        ctx.fill()
      }

      const parts = partsRef.current
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]
        p.x += p.vx; p.y += p.vy
        p.vy += 0.095
        p.vx *= 0.987
        p.life -= p.decay
        if (p.life <= 0) { parts.splice(i, 1); continue }

        const a = p.life * p.life
        ctx.globalAlpha = a * 0.22
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * 3.8, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.fill()

        ctx.globalAlpha = a
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.fill()
      }
      ctx.globalAlpha = 1
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(rafRef.current)
    }
  }, [canvasRef])

  function burst(cx: number, cy: number, n = 62) {
    const c1 = COLORS[Math.random() * COLORS.length | 0]
    const c2 = COLORS[Math.random() * COLORS.length | 0]
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i / n) + (Math.random() - 0.5) * 0.35
      const spd = 1.8 + Math.random() * 5.5
      partsRef.current.push({
        x: cx, y: cy,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 0.8,
        r: 1.3 + Math.random() * 2.1,
        color: Math.random() < 0.25 ? c2 : c1,
        life: 1,
        decay: 0.01 + Math.random() * 0.011,
      })
    }
  }

  function firework(x: number, y: number) {
    burst(x, y)
    setTimeout(() => burst(x + (Math.random() - .5) * 110, y + (Math.random() - .5) * 70, 48), 130)
    setTimeout(() => burst(x + (Math.random() - .5) * 110, y + (Math.random() - .5) * 70, 44), 280)
  }

  function randomFw() {
    if (!canvasRef.current) return
    const W = canvasRef.current.width, H = canvasRef.current.height
    firework(W * (.15 + Math.random() * .7), H * (.05 + Math.random() * .42))
  }

  useEffect(() => {
    if (!canvasRef.current) return
    const W = canvasRef.current.width, H = canvasRef.current.height
    const shots = [2700, 2950, 3250, 3600, 4100]
    const xs = [.25, .5, .75, .3, .65]
    const timers = shots.map((ms, i) =>
      setTimeout(() => firework(W * xs[i], H * (.1 + Math.random() * .35)), ms)
    )
    const interval = setInterval(randomFw, 5200)
    return () => { timers.forEach(clearTimeout); clearInterval(interval) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasRef])

  return { firework }
}

const podiumOrder = [
  { key: 'segundo',  cls: 's2', medal: '🥈', pos: '2º' },
  { key: 'campea',   cls: 's1', medal: '🥇', pos: '1º' },
  { key: 'terceiro', cls: 's3', medal: '🥉', pos: '3º' },
]

function Champion() {
  const params   = useSearchParams()
  const campea   = params.get('campea')   ?? 'CAMPEÃO'
  const pts1     = Number(params.get('pts1'))   || 0
  const segundo  = params.get('segundo')  ?? '2º Lugar'
  const pts2     = Number(params.get('pts2'))   || 0
  const terceiro = params.get('terceiro') ?? '3º Lugar'
  const pts3     = Number(params.get('pts3'))   || 0

  const data: Record<string, { name: string; pts: number }> = {
    campea:   { name: campea,   pts: pts1 },
    segundo:  { name: segundo,  pts: pts2 },
    terceiro: { name: terceiro, pts: pts3 },
  }

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { firework } = useFireworks(canvasRef)

  function handleHeroClick(e: React.MouseEvent) {
    firework(e.clientX, e.clientY)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#06061a', overflow: 'hidden auto', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#f0f0ff' }}>
      <style>{`
        @keyframes rise    { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:none } }
        @keyframes nameIn  { from { opacity:0; transform:scale(0.65) translateY(16px) } to { opacity:1; transform:scale(1) translateY(0) } }
        @keyframes glow    { 0%,100% { text-shadow:0 0 35px rgba(242,203,64,.55),0 0 90px rgba(242,203,64,.2),0 3px 0 #5a3f00,0 5px 16px rgba(0,0,0,.7) } 50% { text-shadow:0 0 55px rgba(242,203,64,.8),0 0 130px rgba(242,203,64,.35),0 3px 0 #5a3f00,0 5px 16px rgba(0,0,0,.7) } }
        @media (prefers-reduced-motion:reduce) { *, *::before, *::after { animation-duration:.01ms!important; animation-delay:0ms!important } }
      `}</style>

      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />

      {/* HERO */}
      <section
        onClick={handleHeroClick}
        style={{ position: 'relative', zIndex: 1, minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 'clamp(2rem,8vw,4rem) clamp(1rem,5vw,2.5rem)', cursor: 'pointer', userSelect: 'none' }}
      >
        <p style={{ fontSize: 'clamp(.6rem,1.8vw,.75rem)', letterSpacing: '.24em', textTransform: 'uppercase', color: 'rgba(140,160,210,.5)', marginBottom: 'clamp(2.5rem,7vw,4rem)', opacity: 0, animation: 'rise .7s ease .4s forwards' }}>
          🏆 Bolão dos Cria · Copa do Mundo 2026
        </p>

        <p style={{ fontSize: 'clamp(.95rem,2.8vw,1.3rem)', letterSpacing: '.05em', color: 'rgba(140,160,210,.45)', marginBottom: '.8rem', opacity: 0, animation: 'rise .7s ease 1.3s forwards' }}>
          O campeão é&hellip;
        </p>

        <span style={{ display: 'block', fontSize: 'clamp(2.2rem,6.5vw,4.5rem)', lineHeight: 1, marginBottom: '.2em', opacity: 0, animation: 'rise .5s ease 2.6s forwards' }}>👑</span>

        <h1 style={{
          fontFamily: "'Impact','Arial Black','Haettenschweiler',sans-serif",
          fontSize: 'clamp(3rem,15vw,10.5rem)',
          fontWeight: 900, lineHeight: .9, letterSpacing: '-.01em',
          textTransform: 'uppercase', color: '#F2CB40',
          textShadow: '0 0 35px rgba(242,203,64,.55),0 0 90px rgba(242,203,64,.2),0 3px 0 #5a3f00,0 5px 16px rgba(0,0,0,.7)',
          maxWidth: '88vw', wordBreak: 'break-word',
          opacity: 0, transform: 'scale(.65) translateY(16px)',
          animation: 'nameIn .85s cubic-bezier(.34,1.56,.64,1) 2.3s forwards, glow 3.5s ease-in-out 3.3s infinite',
        }}>
          {campea.toUpperCase()}
        </h1>

        <p style={{ fontSize: 'clamp(1rem,2.8vw,1.45rem)', fontVariantNumeric: 'tabular-nums', letterSpacing: '.14em', color: 'rgba(242,203,64,.5)', marginTop: '1.1rem', opacity: 0, animation: 'rise .6s ease 3.5s forwards' }}>
          ★ {pts1} pts ★
        </p>

        <p style={{ marginTop: 'clamp(1.8rem,5vw,3rem)', fontSize: 'clamp(.6rem,1.6vw,.72rem)', letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,.12)', opacity: 0, animation: 'rise .6s ease 5.2s forwards' }}>
          toque para mais fogos 🎆
        </p>
      </section>

      {/* PODIUM */}
      <section style={{ position: 'relative', zIndex: 1, padding: 'clamp(3rem,8vw,5rem) clamp(1rem,5vw,2rem) clamp(3.5rem,9vw,6rem)', background: 'linear-gradient(180deg,transparent 0%,rgba(10,10,32,.97) 18%)', opacity: 0, animation: 'rise .9s ease 4.6s forwards' }}>
        <p style={{ textAlign: 'center', fontSize: 'clamp(.58rem,1.6vw,.72rem)', letterSpacing: '.28em', textTransform: 'uppercase', color: 'rgba(140,160,210,.35)', marginBottom: 'clamp(2rem,5vw,3rem)' }}>
          Pódio Final
        </p>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 'clamp(.8rem,3vw,2rem)', maxWidth: 520, margin: '0 auto' }}>
          {podiumOrder.map(({ key, cls, medal, pos }) => {
            const { name, pts } = data[key]
            const blockH = cls === 's1' ? 'clamp(88px,17vw,135px)' : cls === 's2' ? 'clamp(60px,11vw,90px)' : 'clamp(42px,7.5vw,62px)'
            const blockBg = cls === 's1'
              ? 'linear-gradient(155deg,#F2CB40 0%,#7C5008 100%)'
              : cls === 's2'
              ? 'linear-gradient(155deg,#B8C8D8 0%,#485868 100%)'
              : 'linear-gradient(155deg,#C87D32 0%,#603810 100%)'
            const blockShadow = cls === 's1' ? '0 0 36px rgba(242,203,64,.4),0 0 80px rgba(242,203,64,.1)' : undefined
            const nameColor = cls === 's1' ? '#FFE87A' : cls === 's2' ? '#C0D0E0' : '#D89858'

            return (
              <div key={key} style={{ flex: 1, maxWidth: 165, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.55rem' }}>
                <p style={{ fontSize: 'clamp(.8rem,2.4vw,1rem)', fontWeight: 700, textAlign: 'center', wordBreak: 'break-word', lineHeight: 1.3, color: nameColor }}>{name}</p>
                <p style={{ fontSize: 'clamp(.65rem,1.7vw,.78rem)', fontVariantNumeric: 'tabular-nums', letterSpacing: '.04em', color: 'rgba(255,255,255,.3)' }}>{pts} pts</p>
                <div style={{ width: '100%', height: blockH, borderRadius: '8px 8px 0 0', background: blockBg, boxShadow: blockShadow, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(1.6rem,5vw,2.6rem)', flexShrink: 0 }}>{medal}</div>
                <p style={{ fontSize: 'clamp(.58rem,1.5vw,.68rem)', letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,.2)', marginTop: '-.2rem' }}>{pos}</p>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense>
      <Champion />
    </Suspense>
  )
}
