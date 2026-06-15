"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Loader2, Trophy, Sword } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

type Group = {
  group: string
  table: {
    position: number
    team: string
    logo: string
    played: number
    won: number
    draw: number
    lost: number
    gf: number
    ga: number
    gd: number
    points: number
  }[]
}

type Scorer = {
  name: string
  team: string
  logo: string
  goals: number
  assists: number
  penalties: number
}

async function fetchCopa(type: 'standings' | 'scorers') {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ''
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/copa-data?type=${type}`,
    { headers: { Authorization: `Bearer ${token}`, apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! } }
  )
  return res.json()
}

export default function CopaPage() {
  const [activeTab, setActiveTab] = useState<'grupos' | 'artilheiros'>('grupos')
  const [groups, setGroups] = useState<Group[]>([])
  const [scorers, setScorers] = useState<Scorer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [standingsRes, scorersRes] = await Promise.all([
        fetchCopa('standings'),
        fetchCopa('scorers'),
      ])
      if (standingsRes.groups) setGroups(standingsRes.groups)
      if (scorersRes.scorers) setScorers(scorersRes.scorers)
    } catch (e) {
      setError('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#FFC107" }} />
    </div>
  )

  if (error) return (
    <div className="text-center py-20 text-muted-foreground text-sm">{error}</div>
  )

  return (
    <div className="space-y-5 pb-6">
      <header className="text-center space-y-1 pt-2">
        <h1 className="text-2xl font-black">Copa do Mundo 2026</h1>
        <p className="text-xs text-muted-foreground">Grupos e artilheiros em tempo real</p>
      </header>

      {/* Tabs */}
      <div className="flex p-1 rounded-2xl" style={{ background: "rgba(0,45,18,0.5)", border: "1px solid rgba(0,190,80,0.1)" }}>
        {([
          { id: 'grupos', label: 'Grupos', icon: Trophy },
          { id: 'artilheiros', label: 'Artilheiros', icon: Sword },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={cn("flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2",
              activeTab !== id && "text-muted-foreground")}
            style={activeTab === id ? {
              background: "linear-gradient(135deg, #FFC107 0%, #FF8F00 100%)",
              color: "#0a1f0d",
              boxShadow: "0 4px 16px rgba(255,193,7,0.3)",
            } : undefined}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* GRUPOS */}
        {activeTab === 'grupos' && (
          <motion.div key="grupos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-4">
            {groups.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-10">Classificação ainda não disponível.</p>
            )}
            {groups.map((g) => (
              <div key={g.group} className="rounded-2xl overflow-hidden"
                style={{ border: "1px solid rgba(255,193,7,0.15)", background: "rgba(0,35,12,0.6)" }}>
                <div className="px-4 py-2.5 flex items-center gap-2"
                  style={{ background: "rgba(255,193,7,0.1)", borderBottom: "1px solid rgba(255,193,7,0.12)" }}>
                  <Trophy className="h-3.5 w-3.5" style={{ color: "#FFC107" }} />
                  <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: "#FFC107" }}>
                    {g.group}
                  </span>
                </div>

                {/* Header colunas */}
                <div className="grid px-4 py-1.5 text-[9px] font-black uppercase text-muted-foreground tracking-widest"
                  style={{ gridTemplateColumns: "1.8rem 1fr 2rem 2rem 2rem 2rem 2rem 2.2rem" }}>
                  <span></span>
                  <span>Time</span>
                  <span className="text-center">J</span>
                  <span className="text-center">V</span>
                  <span className="text-center">E</span>
                  <span className="text-center">D</span>
                  <span className="text-center">SG</span>
                  <span className="text-center font-black" style={{ color: "#FFC107" }}>PTS</span>
                </div>

                <div className="divide-y divide-white/5">
                  {g.table.map((t, i) => (
                    <div key={t.team}
                      className="grid items-center px-4 py-2"
                      style={{
                        gridTemplateColumns: "1.8rem 1fr 2rem 2rem 2rem 2rem 2rem 2.2rem",
                        background: i < 2 ? "rgba(34,197,94,0.04)" : undefined,
                      }}>
                      <span className="text-[11px] font-black text-muted-foreground">{t.position}</span>
                      <div className="flex items-center gap-2 min-w-0">
                        {t.logo ? (
                          <img src={`/api/proxy-image?url=${encodeURIComponent(t.logo)}`}
                            className="h-5 w-5 object-contain shrink-0"
                            onError={(e) => { e.currentTarget.style.display = 'none' }} />
                        ) : (
                          <div className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0"
                            style={{ background: "rgba(255,255,255,0.08)" }}>
                            {t.team[0]}
                          </div>
                        )}
                        <span className="text-[11px] font-bold truncate">{t.team}</span>
                      </div>
                      <span className="text-[11px] text-center text-muted-foreground">{t.played}</span>
                      <span className="text-[11px] text-center text-muted-foreground">{t.won}</span>
                      <span className="text-[11px] text-center text-muted-foreground">{t.draw}</span>
                      <span className="text-[11px] text-center text-muted-foreground">{t.lost}</span>
                      <span className="text-[11px] text-center text-muted-foreground">
                        {t.gd > 0 ? `+${t.gd}` : t.gd}
                      </span>
                      <span className="text-[12px] font-black text-center"
                        style={{ color: i < 2 ? "#4ade80" : "white" }}>
                        {t.points}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="px-4 py-1.5 flex items-center gap-1.5"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  <div className="h-2 w-2 rounded-full" style={{ background: "#4ade80" }} />
                  <span className="text-[9px] text-muted-foreground">Classificados para as oitavas</span>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* ARTILHEIROS */}
        {activeTab === 'artilheiros' && (
          <motion.div key="artilheiros" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-2.5">
            {scorers.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-10">Artilharia ainda não disponível.</p>
            )}
            {scorers.map((s, i) => (
              <div key={`${s.name}-${i}`}
                className="flex items-center gap-3 p-3 px-4 rounded-2xl"
                style={{
                  background: i === 0
                    ? "linear-gradient(135deg, rgba(255,193,7,0.12) 0%, rgba(0,45,18,0.7) 100%)"
                    : "rgba(0,35,12,0.55)",
                  border: i === 0
                    ? "1px solid rgba(255,193,7,0.3)"
                    : "1px solid rgba(0,190,80,0.08)",
                }}>
                <span className="text-lg font-black w-7 text-center shrink-0"
                  style={{ color: i === 0 ? "#FFC107" : i === 1 ? "#94a3b8" : i === 2 ? "#cd7c3a" : "rgba(255,255,255,0.3)" }}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                </span>

                {s.logo ? (
                  <img src={`/api/proxy-image?url=${encodeURIComponent(s.logo)}`}
                    className="h-8 w-8 object-contain shrink-0"
                    onError={(e) => { e.currentTarget.style.display = 'none' }} />
                ) : (
                  <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                    style={{ background: "rgba(255,255,255,0.08)" }}>
                    {s.team[0]}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black truncate">{s.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{s.team}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-center">
                    <p className="text-lg font-black" style={{ color: i === 0 ? "#FFC107" : "white" }}>
                      {s.goals}
                    </p>
                    <p className="text-[8px] uppercase text-muted-foreground font-bold">Gols</p>
                  </div>
                  {s.assists > 0 && (
                    <div className="text-center">
                      <p className="text-sm font-black text-muted-foreground">{s.assists}</p>
                      <p className="text-[8px] uppercase text-muted-foreground font-bold">Assist</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
