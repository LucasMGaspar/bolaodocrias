"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Loader2, ChevronLeft, ChevronRight, Calendar, CheckCircle2, Target, Info, Share2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { MatchCard } from "@/components/MatchCard"
import { ShareCard } from "@/components/ShareCard"

interface Match {
  id: number
  team_a: string
  team_b: string
  team_a_logo: string
  team_b_logo: string
  match_time: string
  league_name: string
  status: string
  score_a?: number
  score_b?: number
}

export default function PalpitesPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<number, any>>({})
  const [loading, setLoading] = useState(true)
  const [selectedLeague, setSelectedLeague] = useState<string>("Todas")
  const [activeTab, setActiveTab] = useState<'upcoming' | 'finished'>('upcoming')
  const [shareMatch, setShareMatch] = useState<{ match: Match; pred: any; points: number | null } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const from = new Date()
    from.setDate(from.getDate() - 7)
    const to = new Date()
    to.setDate(to.getDate() + 45)

    const { data: matchesData } = await supabase
      .from('matches')
      .select('*')
      .gte('match_time', from.toISOString())
      .lte('match_time', to.toISOString())
      .order('match_time', { ascending: true })

    const { data: predictionsData } = await supabase
      .from('predictions')
      .select('*')
      .eq('user_id', user.id)

    if (matchesData) setMatches(matchesData)
    if (predictionsData) {
      const predMap: Record<number, any> = {}
      predictionsData.forEach((p: any) => {
        predMap[p.match_id] = { ...p, score_a: p.guess_a, score_b: p.guess_b }
      })
      setPredictions(predMap)
    }
    setLoading(false)
  }

  const handlePredict = async (matchId: number, scoreA: number, scoreB: number) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert("Você precisa estar logado!")
      return
    }
    const existing = predictions[matchId]
    const { error } = await supabase.from('predictions').upsert({
      user_id: user.id,
      match_id: matchId,
      guess_a: scoreA,
      guess_b: scoreB,
      wildcard: existing?.wildcard ?? false,
    })
    if (error) {
      alert("Erro ao salvar: " + error.message)
    } else {
      setPredictions(prev => ({ ...prev, [matchId]: { ...prev[matchId], match_id: matchId, score_a: scoreA, score_b: scoreB } }))
    }
  }

  const handleWildcard = async (matchId: number) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const pred = predictions[matchId]
    if (!pred) return

    const newWildcard = !pred.wildcard
    const { error } = await supabase.from('predictions')
      .update({ wildcard: newWildcard })
      .eq('user_id', user.id)
      .eq('match_id', matchId)

    if (!error) {
      setPredictions(prev => ({ ...prev, [matchId]: { ...prev[matchId], wildcard: newWildcard } }))
    }
  }

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft } = scrollRef.current
      scrollRef.current.scrollTo({ left: scrollLeft + (direction === 'left' ? -200 : 200), behavior: 'smooth' })
    }
  }

  const filteredByStatus = matches.filter(m => activeTab === 'upcoming' ? m.status !== 'FT' : m.status === 'FT')
  const leagues = ["Todas", ...Array.from(new Set(filteredByStatus.map(m => m.league_name))).filter(Boolean)]
  const finalMatches = selectedLeague === "Todas" ? filteredByStatus : filteredByStatus.filter(m => m.league_name === selectedLeague)

  const calculatePoints = (match: Match, pred: any) => {
    if (!pred || match.status !== 'FT') return null
    let base = 0
    if (pred.score_a === match.score_a && pred.score_b === match.score_b) {
      base = 3
    } else {
      const predictedWinner = Math.sign(pred.score_a - pred.score_b)
      const actualWinner = Math.sign((match.score_a ?? 0) - (match.score_b ?? 0))
      if (predictedWinner === actualWinner && actualWinner !== 0) base = 1
      else if (predictedWinner === 0 && actualWinner === 0) base = 1
    }
    if (pred.wildcard) return base === 0 ? -1 : base * 2
    return base
  }

  const todayUTC = new Date().toISOString().slice(0, 10)
  const wildcardUsedMatchId = Object.entries(predictions).find(([mId, p]) => {
    if (!p?.wildcard) return false
    const m = matches.find(match => match.id === Number(mId))
    return m?.match_time?.slice(0, 10) === todayUTC
  })?.[0]
  const wildcardUsedToday = wildcardUsedMatchId !== undefined

  if (loading) return (
    <div className="p-8 text-center">
      <Loader2 className="h-8 w-8 animate-spin mx-auto" style={{ color: "#FFC107" }} />
    </div>
  )

  return (
    <div className="space-y-6 pb-20">
      <header>
        <h1 className="text-2xl font-black">Palpites</h1>
        <p className="text-sm text-muted-foreground">Mostre quem entende de futebol</p>
      </header>

      {/* Regras de pontuação — sempre visível */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,193,7,0.25)" }}>
        <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: "rgba(255,193,7,0.12)" }}>
          <Info className="h-3.5 w-3.5" style={{ color: "#FFC107" }} />
          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#FFC107" }}>Como pontuar</span>
        </div>
        <div className="divide-y" style={{ divideColor: "rgba(255,255,255,0.04)" }}>
          {[
            { icon: "🎯", pts: "+3", desc: "Placar exato", color: "#4ade80", bg: "rgba(34,197,94,0.07)" },
            { icon: "✅", pts: "+1", desc: "Acertou o vencedor ou empate", color: "#60a5fa", bg: "rgba(59,130,246,0.07)" },
            { icon: "❌", pts: "0",  desc: "Errou o resultado", color: "#f87171", bg: "rgba(239,68,68,0.05)" },
            { icon: "⚡", pts: "×2", desc: "Dobro ou Nada — dobra os pts, -1 se errar (1× por dia)", color: "#FF8F00", bg: "rgba(255,140,0,0.07)" },
          ].map((r, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5" style={{ background: r.bg }}>
              <span className="text-base w-5 text-center">{r.icon}</span>
              <span className="text-xs font-black w-7 shrink-0" style={{ color: r.color }}>{r.pts}</span>
              <span className="text-xs text-muted-foreground">{r.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex p-1 rounded-2xl"
        style={{ background: "rgba(0,45,18,0.5)", border: "1px solid rgba(0,190,80,0.1)" }}
      >
        <button
          onClick={() => { setActiveTab('upcoming'); setSelectedLeague("Todas") }}
          className={cn(
            "flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2",
            activeTab === 'upcoming' ? "text-green-950" : "text-muted-foreground hover:text-white"
          )}
          style={activeTab === 'upcoming' ? {
            background: "linear-gradient(135deg, #FFC107 0%, #FF8F00 100%)",
            boxShadow: "0 4px 16px rgba(255,193,7,0.3)",
          } : undefined}
        >
          <Calendar className="h-4 w-4" />
          Próximos
        </button>
        <button
          onClick={() => { setActiveTab('finished'); setSelectedLeague("Todas") }}
          className={cn(
            "flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2",
            activeTab === 'finished' ? "text-green-950" : "text-muted-foreground hover:text-white"
          )}
          style={activeTab === 'finished' ? {
            background: "linear-gradient(135deg, #FFC107 0%, #FF8F00 100%)",
            boxShadow: "0 4px 16px rgba(255,193,7,0.3)",
          } : undefined}
        >
          <CheckCircle2 className="h-4 w-4" />
          Resultados
        </button>
      </div>

      {/* League Filter */}
      <div className="sticky top-10 z-10 -mx-4 px-4 backdrop-blur-md border-b group" style={{ borderColor: "rgba(0,190,80,0.08)" }}>
        <div className="relative flex items-center">
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 z-20 h-8 w-8 rounded-full flex items-center justify-center border opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "rgba(0,20,8,0.85)", borderColor: "rgba(0,190,80,0.2)" }}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div ref={scrollRef} className="flex items-center gap-2 overflow-x-auto py-4 no-scrollbar scroll-smooth">
            {leagues.map(league => (
              <button
                key={league}
                onClick={() => setSelectedLeague(league)}
                className="relative flex-none px-4 py-2 rounded-xl text-xs font-black transition-all"
                style={selectedLeague === league ? {
                  background: "linear-gradient(135deg, rgba(255,193,7,0.2) 0%, rgba(255,140,0,0.15) 100%)",
                  border: "1px solid rgba(255,193,7,0.4)",
                  color: "#FFC107",
                  boxShadow: "0 0 14px rgba(255,193,7,0.2)",
                } : {
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(0,190,80,0.08)",
                  color: "rgba(255,255,255,0.4)",
                }}
              >
                {league}
              </button>
            ))}
          </div>
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 z-20 h-8 w-8 rounded-full flex items-center justify-center border opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "rgba(0,20,8,0.85)", borderColor: "rgba(0,190,80,0.2)" }}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        <AnimatePresence mode="popLayout">
          {finalMatches.map((match) => {
            const pred = predictions[match.id]
            const points = calculatePoints(match, pred)

            if (activeTab === 'finished') {
              return (
                <motion.div
                  key={match.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-5 rounded-[2.5rem] relative overflow-hidden"
                  style={{
                    background: "linear-gradient(145deg, rgba(0,70,25,0.55) 0%, rgba(0,35,10,0.85) 100%)",
                    border: "1px solid rgba(255,193,7,0.16)",
                    backdropFilter: "blur(14px)",
                  }}
                >
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">
                      {match.league_name}
                    </span>
                    <div className="flex items-center gap-2">
                    {points !== null && (
                      <div
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter"
                        style={
                          points >= 3
                            ? { background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)" }
                            : points >= 1
                            ? { background: "rgba(59,130,246,0.15)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.3)" }
                            : { background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }
                        }
                      >
                        <Target className="h-3 w-3" />
                        {pred?.wildcard && <span>⚡</span>}
                        {points === 6 ? "+6 DOBRO CERTEIRO!" : points === 3 ? "+3 CERTEIRO!" : points === 2 ? "+2 DOBRO!" : points === 1 ? "+1 VENCEDOR!" : points === -1 ? "-1 WILDCARD ERRADO" : "0 ERROU!"}
                      </div>
                    )}
                    <button
                      onClick={() => setShareMatch({ match, pred, points })}
                      className="flex items-center justify-center h-7 w-7 rounded-full transition-all"
                      style={{ background: "rgba(255,193,7,0.12)", border: "1px solid rgba(255,193,7,0.25)" }}
                    >
                      <Share2 className="h-3 w-3" style={{ color: "#FFC107" }} />
                    </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col items-center gap-2 flex-1">
                      <div className="h-10 w-10 flex items-center justify-center">
                        <img
                          src={match.team_a_logo}
                          className="h-10 w-10 object-contain"
                          onError={(e) => { e.currentTarget.style.display = 'none'; (e.currentTarget.nextSibling as HTMLElement)?.style.setProperty('display', 'flex') }}
                        />
                        <span style={{ display: 'none' }} className="text-lg font-black text-muted-foreground">{match.team_a?.[0]}</span>
                      </div>
                      <span className="text-[10px] font-bold text-center uppercase">{match.team_a}</span>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-black">{match.score_a}</span>
                        <span className="text-muted-foreground font-black italic text-xs">FT</span>
                        <span className="text-2xl font-black">{match.score_b}</span>
                      </div>
                      {pred && (
                        <div
                          className="text-[9px] font-bold px-2 py-0.5 rounded-md"
                          style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,193,7,0.7)" }}
                        >
                          SEU PALPITE: {pred.score_a} X {pred.score_b}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-center gap-2 flex-1">
                      <div className="h-10 w-10 flex items-center justify-center">
                        <img
                          src={match.team_b_logo}
                          className="h-10 w-10 object-contain"
                          onError={(e) => { e.currentTarget.style.display = 'none'; (e.currentTarget.nextSibling as HTMLElement)?.style.setProperty('display', 'flex') }}
                        />
                        <span style={{ display: 'none' }} className="text-lg font-black text-muted-foreground">{match.team_b?.[0]}</span>
                      </div>
                      <span className="text-[10px] font-bold text-center uppercase">{match.team_b}</span>
                    </div>
                  </div>
                </motion.div>
              )
            }

            return (
              <MatchCard
                key={match.id}
                match={match}
                prediction={pred}
                wildcardAvailable={!wildcardUsedToday || wildcardUsedMatchId === String(match.id)}
                onPredict={handlePredict}
                onToggleWildcard={handleWildcard}
              />
            )
          })}
        </AnimatePresence>

        {shareMatch && (
          <ShareCard
            match={shareMatch.match}
            prediction={shareMatch.pred}
            points={shareMatch.points}
            onClose={() => setShareMatch(null)}
          />
        )}

        {finalMatches.length === 0 && (
          <div
            className="text-center py-12 text-muted-foreground text-sm rounded-3xl"
            style={{ background: "rgba(0,45,18,0.4)", border: "1px solid rgba(0,190,80,0.08)" }}
          >
            Nenhum jogo encontrado aqui.
          </div>
        )}
      </div>
    </div>
  )
}
