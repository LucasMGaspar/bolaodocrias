"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Loader2, ChevronLeft, ChevronRight, Calendar, CheckCircle2, XCircle, Target } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { MatchCard } from "@/components/MatchCard"

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
    const { data: matchesData } = await supabase.from('matches').select('*').gte('match_time', from.toISOString()).lte('match_time', to.toISOString()).order('match_time', { ascending: true })
    const { data: predictionsData } = await supabase.from('predictions').select('*').eq('user_id', user.id)

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
    
    const { error } = await supabase.from('predictions').upsert({
      user_id: user.id,
      match_id: matchId,
      guess_a: scoreA,
      guess_b: scoreB
    })
    
    if (error) {
      alert("Erro ao salvar: " + error.message)
    } else {
      setPredictions(prev => ({ ...prev, [matchId]: { match_id: matchId, score_a: scoreA, score_b: scoreB } }))
    }
  }

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft } = scrollRef.current
      const scrollTo = direction === 'left' ? scrollLeft - 200 : scrollLeft + 200
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' })
    }
  }

  const filteredByStatus = matches.filter(m => activeTab === 'upcoming' ? m.status !== 'FT' : m.status === 'FT')
  const leagues = ["Todas", ...Array.from(new Set(filteredByStatus.map(m => m.league_name))).filter(Boolean)]
  const finalMatches = selectedLeague === "Todas" ? filteredByStatus : filteredByStatus.filter(m => m.league_name === selectedLeague)

  const calculatePoints = (match: Match, pred: any) => {
    if (!pred || match.status !== 'FT') return null
    if (pred.score_a === match.score_a && pred.score_b === match.score_b) return 3
    const predictedWinner = Math.sign(pred.score_a - pred.score_b)
    const actualWinner = Math.sign((match.score_a ?? 0) - (match.score_b ?? 0))
    if (predictedWinner === actualWinner && actualWinner !== 0) return 1
    return 0
  }

  if (loading) return <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>

  return (
    <div className="space-y-6 pb-20">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Palpites</h1>
          <p className="text-sm text-muted-foreground">Mostre quem entende de futebol</p>
        </div>
      </header>

      {/* Main Tabs */}
      <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10">
        <button onClick={() => { setActiveTab('upcoming'); setSelectedLeague("Todas"); }} className={cn("flex-1 py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2", activeTab === 'upcoming' ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-white")}>
          <Calendar className="h-4 w-4" />
          Próximos
        </button>
        <button onClick={() => { setActiveTab('finished'); setSelectedLeague("Todas"); }} className={cn("flex-1 py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2", activeTab === 'finished' ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-white")}>
          <CheckCircle2 className="h-4 w-4" />
          Resultados
        </button>
      </div>

      {/* League Filter */}
      <div className="sticky top-0 z-10 -mx-4 px-4 backdrop-blur-md border-b border-white/5 group">
        <div className="relative flex items-center">
          <button onClick={() => scroll('left')} className="absolute left-0 z-20 h-8 w-8 bg-background/80 rounded-full flex items-center justify-center border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div ref={scrollRef} className="flex items-center gap-2 overflow-x-auto py-4 no-scrollbar scroll-smooth">
            {leagues.map(league => (
              <button key={league} onClick={() => setSelectedLeague(league)} className={cn("relative flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all border", selectedLeague === league ? "bg-primary border-primary text-white shadow-[0_0_15px_rgba(var(--primary-rgb),0.4)]" : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10")}>{league}</button>
            ))}
          </div>
          <button onClick={() => scroll('right')} className="absolute right-0 z-20 h-8 w-8 bg-background/80 rounded-full flex items-center justify-center border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
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
                <motion.div key={match.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-5 rounded-[2.5rem] relative overflow-hidden border-l-4 border-l-primary/30">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">{match.league_name}</span>
                    {points !== null && (
                      <div className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter", points === 3 ? "bg-green-500/20 text-green-500" : points === 1 ? "bg-blue-500/20 text-blue-400" : "bg-red-500/20 text-red-500")}>
                        <Target className="h-3 w-3" />
                        {points === 3 ? "+3 PONTOS (CERTEIRO!)" : points === 1 ? "+1 PONTO (VENCEDOR!)" : "0 PONTOS (ERROU!)"}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col items-center gap-2 flex-1">
                      <div className="h-10 w-10 flex items-center justify-center">
                        <img src={match.team_a_logo} className="h-10 w-10 object-contain" onError={(e) => { e.currentTarget.style.display='none'; (e.currentTarget.nextSibling as HTMLElement)?.style.setProperty('display','flex') }} />
                        <span style={{display:'none'}} className="text-lg font-black text-muted-foreground">{match.team_a?.[0]}</span>
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
                        <div className="text-[9px] font-bold text-muted-foreground bg-white/5 px-2 py-0.5 rounded-md">
                          SEU PALPITE: {pred.score_a} X {pred.score_b}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-center gap-2 flex-1">
                      <div className="h-10 w-10 flex items-center justify-center">
                        <img src={match.team_b_logo} className="h-10 w-10 object-contain" onError={(e) => { e.currentTarget.style.display='none'; (e.currentTarget.nextSibling as HTMLElement)?.style.setProperty('display','flex') }} />
                        <span style={{display:'none'}} className="text-lg font-black text-muted-foreground">{match.team_b?.[0]}</span>
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
                onPredict={handlePredict}
              />
            )
          })}
        </AnimatePresence>

        {finalMatches.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm glass rounded-3xl">
            Nenhum jogo encontrado aqui.
          </div>
        )}
      </div>
    </div>
  )
}
