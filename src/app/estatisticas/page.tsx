'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Stats = {
  uid: string
  name: string
  total: number
  exatos: number
  ganhador: number
  wc_exato: number
  wc_ganhador: number
  wc_erro: number
  pts_calculado: number
}

function computeStats(
  preds: any[],
  ftMap: Record<number, { score_a: number; score_b: number }>
): Stats[] {
  const map: Record<string, Stats> = {}
  for (const p of preds) {
    const uid = p.user_id as string
    const name = (p.profiles as any)?.full_name ?? 'Anônimo'
    if (!map[uid]) map[uid] = { uid, name, total: 0, exatos: 0, ganhador: 0, wc_exato: 0, wc_ganhador: 0, wc_erro: 0, pts_calculado: 0 }
    map[uid].total++
    const m = ftMap[p.match_id]
    if (!m) continue
    const isExact = p.guess_a === m.score_a && p.guess_b === m.score_b
    const pw = Math.sign(p.guess_a - p.guess_b)
    const rw = Math.sign(m.score_a - m.score_b)
    const isResult = (pw === rw && rw !== 0) || (pw === 0 && rw === 0)
    if (isExact) {
      map[uid].exatos++
      map[uid].pts_calculado += p.wildcard ? 6 : 3
      if (p.wildcard) map[uid].wc_exato++
    } else if (isResult) {
      map[uid].ganhador++
      map[uid].pts_calculado += p.wildcard ? 2 : 1
      if (p.wildcard) map[uid].wc_ganhador++
    } else {
      if (p.wildcard) { map[uid].wc_erro++; map[uid].pts_calculado -= 1 }
    }
  }
  return Object.values(map).sort((a, b) => {
    const pa = a.total > 0 ? (a.exatos + a.ganhador) / a.total : 0
    const pb = b.total > 0 ? (b.exatos + b.ganhador) / b.total : 0
    return pb - pa || (b.exatos + b.ganhador) - (a.exatos + a.ganhador)
  })
}

const MEDAL = ['🥇', '🥈', '🥉']

function StatBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs tabular-nums w-5 text-right" style={{ color }}>{value}</span>
    </div>
  )
}

export default function EstatisticasPage() {
  const [stats, setStats] = useState<Stats[]>([])
  const [totalMatches, setTotalMatches] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: matches } = await supabase
        .from('matches')
        .select('id, score_a, score_b')
        .eq('status', 'FT')

      const ftMap: Record<number, { score_a: number; score_b: number }> = {}
      for (const m of matches ?? []) ftMap[m.id] = { score_a: m.score_a, score_b: m.score_b }
      setTotalMatches(Object.keys(ftMap).length)

      const ftIds = Object.keys(ftMap).map(Number)
      if (!ftIds.length) { setLoading(false); return }

      const { data: preds } = await supabase
        .from('predictions')
        .select('user_id, match_id, guess_a, guess_b, wildcard, profiles(full_name)')
        .in('match_id', ftIds)

      setStats(computeStats(preds ?? [], ftMap))
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div style={{ minHeight: '100svh', background: '#06061a', color: '#e8eaf6', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:none } }
        .card { animation: fadeUp .45s ease both }
        .ring { background: conic-gradient(var(--c) var(--p), rgba(255,255,255,.08) 0) }
      `}</style>

      {/* Header */}
      <div style={{ background: 'linear-gradient(90deg,rgba(0,35,12,.97),rgba(0,55,18,.99),rgba(0,35,12,.97))', borderBottom: '1px solid rgba(255,193,7,.18)', padding: '10px 16px', textAlign: 'center' }}>
        <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(242,203,64,.9)' }}>
          🏆 Bolão dos Cria · Copa do Mundo 2026
        </p>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px 48px' }}>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.01em', color: '#F2CB40', marginBottom: 4 }}>
            📊 Estatísticas Finais
          </h1>
          {totalMatches > 0 && (
            <p style={{ fontSize: 12, color: 'rgba(200,210,240,.45)', letterSpacing: '.06em' }}>
              {totalMatches} jogos disputados
            </p>
          )}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', paddingTop: 60, color: 'rgba(200,210,240,.4)', fontSize: 14 }}>
            Carregando…
          </div>
        )}

        {/* Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {stats.map((s, i) => {
            const acertos = s.exatos + s.ganhador
            const pct = s.total > 0 ? Math.round((acertos / s.total) * 100) : 0
            const wcGanho = s.wc_exato * 3 + s.wc_ganhador * 1
            const wcPerdido = s.wc_erro

            const ringColor = i === 0 ? '#F2CB40' : i === 1 ? '#B8C8D8' : i === 2 ? '#C87D32' : '#6070a0'
            const cardBorder = i === 0 ? 'rgba(242,203,64,.25)' : i === 1 ? 'rgba(184,200,216,.15)' : i === 2 ? 'rgba(200,125,50,.18)' : 'rgba(255,255,255,.07)'

            return (
              <div key={s.uid} className="card" style={{ animationDelay: `${i * 80}ms`, background: 'rgba(255,255,255,.04)', border: `1px solid ${cardBorder}`, borderRadius: 16, padding: '18px 20px', backdropFilter: 'blur(6px)' }}>

                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>

                  {/* Accuracy ring */}
                  <div style={{ flexShrink: 0, width: 56, height: 56, borderRadius: '50%', background: `conic-gradient(${ringColor} ${pct}%, rgba(255,255,255,.08) 0)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#06061a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: ringColor, lineHeight: 1 }}>{pct}%</span>
                    </div>
                  </div>

                  {/* Name + position */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 11, color: 'rgba(200,210,240,.4)', fontWeight: 600 }}>{MEDAL[i] ?? `${i + 1}º`}</span>
                      <span style={{ fontSize: 16, fontWeight: 800, color: '#e8eaf6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                    </div>
                    <p style={{ fontSize: 11, color: 'rgba(200,210,240,.4)' }}>{s.total} palpites feitos</p>
                  </div>

                  {/* Total pts */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 18, fontWeight: 800, color: ringColor, lineHeight: 1 }}>{s.pts_calculado}</p>
                    <p style={{ fontSize: 10, color: 'rgba(200,210,240,.35)', letterSpacing: '.05em' }}>pts</p>
                  </div>
                </div>

                {/* Acertos breakdown */}
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(200,210,240,.35)', marginBottom: 8 }}>Acertos</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 11, color: '#60d060' }}>🥅 Placar exato</span>
                        <span style={{ fontSize: 11, color: 'rgba(200,210,240,.5)' }}>{s.exatos} × 3pts</span>
                      </div>
                      <StatBar value={s.exatos} max={s.total} color="#60d060" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 11, color: '#60b0ff' }}>✅ Ganhador/Empate</span>
                        <span style={{ fontSize: 11, color: 'rgba(200,210,240,.5)' }}>{s.ganhador} × 1pt</span>
                      </div>
                      <StatBar value={s.ganhador} max={s.total} color="#60b0ff" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 11, color: 'rgba(200,210,240,.3)' }}>❌ Erros</span>
                        <span style={{ fontSize: 11, color: 'rgba(200,210,240,.3)' }}>{s.total - acertos - s.wc_erro}</span>
                      </div>
                      <StatBar value={s.total - acertos - s.wc_erro} max={s.total} color="rgba(200,210,240,.2)" />
                    </div>
                  </div>
                </div>

                {/* Wildcard section */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,.07)', paddingTop: 12 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(200,210,240,.35)', marginBottom: 8 }}>Wildcards ⚡</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>

                    <div style={{ background: 'rgba(242,203,64,.08)', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                      <p style={{ fontSize: 18, fontWeight: 800, color: '#F2CB40', lineHeight: 1, marginBottom: 2 }}>{s.wc_exato}</p>
                      <p style={{ fontSize: 9, color: 'rgba(242,203,64,.6)', letterSpacing: '.04em', lineHeight: 1.3 }}>exato{'\n'}+6pts cada</p>
                      {s.wc_exato > 0 && <p style={{ fontSize: 9, color: 'rgba(242,203,64,.5)', marginTop: 2 }}>+{s.wc_exato * 3} bônus</p>}
                    </div>

                    <div style={{ background: 'rgba(96,176,255,.08)', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                      <p style={{ fontSize: 18, fontWeight: 800, color: '#60b0ff', lineHeight: 1, marginBottom: 2 }}>{s.wc_ganhador}</p>
                      <p style={{ fontSize: 9, color: 'rgba(96,176,255,.6)', letterSpacing: '.04em', lineHeight: 1.3 }}>ganhador{'\n'}+2pts cada</p>
                      {s.wc_ganhador > 0 && <p style={{ fontSize: 9, color: 'rgba(96,176,255,.5)', marginTop: 2 }}>+{s.wc_ganhador} bônus</p>}
                    </div>

                    <div style={{ background: s.wc_erro > 0 ? 'rgba(255,80,80,.08)' : 'rgba(255,255,255,.03)', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                      <p style={{ fontSize: 18, fontWeight: 800, color: s.wc_erro > 0 ? '#ff6060' : 'rgba(200,210,240,.2)', lineHeight: 1, marginBottom: 2 }}>{s.wc_erro}</p>
                      <p style={{ fontSize: 9, color: s.wc_erro > 0 ? 'rgba(255,96,96,.6)' : 'rgba(200,210,240,.2)', letterSpacing: '.04em', lineHeight: 1.3 }}>errado{'\n'}-1pt cada</p>
                      {s.wc_erro > 0 && <p style={{ fontSize: 9, color: 'rgba(255,96,96,.5)', marginTop: 2 }}>-{s.wc_erro} pts</p>}
                    </div>

                  </div>

                  {(wcGanho > 0 || wcPerdido > 0) && (
                    <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                      <span style={{ color: 'rgba(200,210,240,.4)' }}>Saldo wildcards</span>
                      <span style={{ fontWeight: 700, color: (wcGanho - wcPerdido) >= 0 ? '#60d060' : '#ff6060' }}>
                        {(wcGanho - wcPerdido) >= 0 ? '+' : ''}{wcGanho - wcPerdido} pts
                      </span>
                    </div>
                  )}
                </div>

              </div>
            )
          })}
        </div>

        {!loading && stats.length === 0 && (
          <p style={{ textAlign: 'center', color: 'rgba(200,210,240,.3)', marginTop: 48 }}>
            Nenhum dado encontrado.
          </p>
        )}
      </div>
    </div>
  )
}
