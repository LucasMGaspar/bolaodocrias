"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, use, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Trophy, Send, Users, Calendar, MessageSquare, Loader2, CheckCircle2, Star, Share2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { MatchCard } from "@/components/MatchCard"
import { ShareCard } from "@/components/ShareCard"

interface Member {
  user_id: string
  total_score: number
  profiles: {
    full_name: string
    username: string
    avatar_url: string
  }
}

interface Message {
  id: string
  content: string
  created_at: string
  user_id: string
  is_system?: boolean
  profiles: {
    full_name: string
    username: string
    avatar_url: string
  }
}

export default function LeaguePage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = use(paramsPromise)
  const [activeTab, setActiveTab] = useState<'ranking' | 'matches' | 'results' | 'chat'>('ranking')
  const [members, setMembers] = useState<Member[]>([])
  const [league, setLeague] = useState<any>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [predictions, setPredictions] = useState<Record<number, any>>({})
  const [allPredictions, setAllPredictions] = useState<any[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [shareMatch, setShareMatch] = useState<{ match: any; pred: any; points: number | null } | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!params.id) return
    fetchInitialData()

    const rankingChannel = supabase
      .channel(`league-${params.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'league_members', filter: `league_id=eq.${params.id}` },
        (payload: any) => {
          setMembers(prev => {
            const updated = prev.map(m => m.user_id === payload.new.user_id ? { ...m, total_score: payload.new.total_score } : m)
            return [...updated].sort((a, b) => b.total_score - a.total_score)
          })
        })
      .subscribe()

    const chatChannel = supabase
      .channel(`chat-${params.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'league_messages', filter: `league_id=eq.${params.id}` },
        async (payload: any) => {
          const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', payload.new.user_id).single()
          const fullMsg = { ...payload.new, profiles: data } as Message
          setMessages(prev => [...prev, fullMsg])
        })
      .subscribe()

    return () => {
      supabase.removeChannel(rankingChannel)
      supabase.removeChannel(chatChannel)
    }
  }, [params.id])

  useEffect(() => {
    if (activeTab === 'chat') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, activeTab])

  async function fetchInitialData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setCurrentUserId(user.id)

    const { data: leagueData } = await supabase.from('leagues').select('*').eq('id', params.id).single()
    setLeague(leagueData)

    const { data: membersData } = await supabase
      .from('league_members')
      .select(`user_id, total_score, profiles(full_name, username, avatar_url)`)
      .eq('league_id', params.id)
      .order('total_score', { ascending: false })
    if (membersData) setMembers(membersData as any)

    if (leagueData) {
      const allowedLeagues = (leagueData.settings?.leagues || []) as string[]
      const from = new Date(); from.setDate(from.getDate() - 7)
      const to = new Date(); to.setDate(to.getDate() + 45)

      const { data: matchesData } = await supabase
        .from('matches')
        .select('*')
        .gte('match_time', from.toISOString())
        .lte('match_time', to.toISOString())
        .order('match_time', { ascending: true })

      if (matchesData) {
        const filteredMatches = allowedLeagues.length > 0
          ? matchesData.filter((m: any) =>
              allowedLeagues.some(al => al.toLowerCase().trim() === m.league_name?.toLowerCase().trim())
            )
          : matchesData
        setMatches(filteredMatches)

        const memberIds = membersData?.map((m: any) => m.user_id) || []
        const { data: predData } = await supabase
          .from('predictions')
          .select('*, profiles(full_name, username, avatar_url)')
          .in('match_id', matchesData.map((m: any) => m.id))
          .in('user_id', memberIds)

        if (predData) {
          setAllPredictions(predData)
          if (user) {
            const myPredMap: Record<number, any> = {}
            predData.filter((p: any) => p.user_id === user.id).forEach((p: any) => {
              myPredMap[p.match_id] = { ...p, score_a: p.guess_a, score_b: p.guess_b }
            })
            setPredictions(myPredMap)
          }
        }
      }

      const { data: chatData } = await supabase
        .from('league_messages')
        .select('*, profiles(full_name, username, avatar_url)')
        .eq('league_id', params.id)
        .order('created_at', { ascending: true })
        .limit(50)
      if (chatData) setMessages(chatData)
    }
    setLoading(false)
  }

  async function sendMessage() {
    if (!newMessage.trim() || !currentUserId) return
    setSendingMessage(true)
    const { error } = await supabase.from('league_messages').insert({
      league_id: params.id,
      user_id: currentUserId,
      content: newMessage.trim(),
    })
    if (!error) setNewMessage("")
    setSendingMessage(false)
  }

  const handlePredict = async (matchId: number, scoreA: number, scoreB: number) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const existing = predictions[matchId]
    const { error } = await supabase.from('predictions').upsert({
      user_id: user.id,
      match_id: matchId,
      guess_a: scoreA,
      guess_b: scoreB,
      wildcard: existing?.wildcard ?? false,
    })
    if (!error) {
      setPredictions(prev => ({ ...prev, [matchId]: { ...prev[matchId], match_id: matchId, score_a: scoreA, score_b: scoreB } }))
      fetchInitialData()
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

  const toBRTDate = (iso: string) => {
    const brt = new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000)
    return brt.toISOString().slice(0, 10)
  }
  const todayBRT = toBRTDate(new Date().toISOString())
  const wildcardUsedMatchId = Object.entries(predictions).find(([mId, p]) => {
    if (!p?.wildcard) return false
    const m = matches.find(match => match.id === Number(mId))
    return m?.match_time ? toBRTDate(m.match_time) === todayBRT : false
  })?.[0]

  const calcPoints = (pred: any, match: any): number => {
    let base = 0
    if (pred.guess_a === match.score_a && pred.guess_b === match.score_b) {
      base = 3
    } else {
      const pw = Math.sign(pred.guess_a - pred.guess_b)
      const rw = Math.sign(match.score_a - match.score_b)
      if (pw === rw && rw !== 0) base = 1
      else if (pw === 0 && rw === 0) base = 1
    }
    if (pred.wildcard) return base === 0 ? -1 : base * 2
    return base
  }

  const medalStyle = (index: number) => {
    if (index === 0) return { color: "#FFC107", filter: "drop-shadow(0 0 6px rgba(255,193,7,0.6))" }
    if (index === 1) return { color: "#94a3b8" }
    if (index === 2) return { color: "#cd7c3a" }
    return undefined
  }

  const tabs = [
    { id: 'ranking', label: 'Ranking', icon: Trophy },
    { id: 'matches', label: 'Jogos', icon: Calendar },
    { id: 'results', label: 'Resultados', icon: CheckCircle2 },
    { id: 'chat', label: 'Resenha', icon: MessageSquare },
  ] as const

  if (loading) return (
    <div className="p-8 text-center">
      <Loader2 className="animate-spin h-8 w-8 mx-auto" style={{ color: "#FFC107" }} />
    </div>
  )

  return (
    <div className="flex flex-col h-[calc(100vh-100px)]">
      {/* Liga Header */}
      <header className="flex flex-col items-center gap-3 mb-5 shrink-0">
        <div
          className="h-16 w-16 rounded-[1.25rem] flex items-center justify-center overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(255,193,7,0.18) 0%, rgba(255,140,0,0.1) 100%)",
            border: "1px solid rgba(255,193,7,0.3)",
            boxShadow: "0 0 24px rgba(255,193,7,0.12)",
          }}
        >
          {league?.image_url ? (
            <img src={league.image_url} alt={league.name} className="h-full w-full object-cover" />
          ) : (
            <Trophy className="h-8 w-8" style={{ color: "#FFC107", filter: "drop-shadow(0 0 8px rgba(255,193,7,0.6))" }} />
          )}
        </div>
        <div className="text-center">
          <h1 className="text-xl font-black">{league?.name || 'Liga'}</h1>
          <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-0.5">
            <Users className="h-3 w-3" />
            <span>{members.length} participantes</span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div
        className="flex p-1 rounded-2xl mb-5 shrink-0 overflow-x-auto no-scrollbar"
        style={{ background: "rgba(0,45,18,0.5)", border: "1px solid rgba(0,190,80,0.1)" }}
      >
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex-1 min-w-[72px] py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5",
              activeTab !== id && "text-muted-foreground hover:text-white"
            )}
            style={activeTab === id ? {
              background: "linear-gradient(135deg, #FFC107 0%, #FF8F00 100%)",
              color: "#0a1f0d",
              boxShadow: "0 4px 12px rgba(255,193,7,0.3)",
            } : undefined}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">

          {/* Ranking */}
          {activeTab === 'ranking' && (
            <motion.div key="ranking" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="h-full overflow-y-auto pr-1 no-scrollbar space-y-2.5">
              {members.map((member, index) => (
                <div
                  key={member.user_id}
                  className="flex items-center gap-4 rounded-2xl p-4"
                  style={{
                    background: index === 0
                      ? "linear-gradient(135deg, rgba(255,193,7,0.12) 0%, rgba(0,45,18,0.6) 100%)"
                      : "rgba(0,45,18,0.45)",
                    border: index === 0
                      ? "1px solid rgba(255,193,7,0.25)"
                      : "1px solid rgba(0,190,80,0.08)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <div className="w-7 text-center">
                    {index < 3 ? (
                      <Star className="h-5 w-5 mx-auto fill-current" style={medalStyle(index)} />
                    ) : (
                      <span className="font-black text-sm text-muted-foreground">{index + 1}</span>
                    )}
                  </div>
                  <div className="h-10 w-10 overflow-hidden rounded-full" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                    <img
                      src={member.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.user_id}`}
                      alt=""
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black truncate text-sm">
                      {member.profiles?.username || member.profiles?.full_name || 'Craque'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black" style={{ color: index === 0 ? "#FFC107" : "rgba(255,255,255,0.9)" }}>
                      {member.total_score}
                    </p>
                    <p className="text-[8px] uppercase text-muted-foreground font-bold">Pts</p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* Jogos */}
          {activeTab === 'matches' && (
            <motion.div key="matches" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="h-full overflow-y-auto pr-1 no-scrollbar space-y-4 pb-4">
              {matches.filter(m => m.status !== 'FT').map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  prediction={predictions[match.id]}
                  othersPredictions={allPredictions.filter(p => p.match_id === match.id && p.user_id !== currentUserId)}
                  wildcardAvailable={!wildcardUsedMatchId || wildcardUsedMatchId === String(match.id)}
                  onPredict={handlePredict}
                  onToggleWildcard={handleWildcard}
                />
              ))}
            </motion.div>
          )}

          {/* Resultados */}
          {activeTab === 'results' && (
            <motion.div key="results" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="h-full overflow-y-auto pr-1 no-scrollbar space-y-4 pb-4">
              {matches.filter(m => m.status === 'FT').map((match) => {
                const matchPreds = allPredictions.filter(p => p.match_id === match.id)
                return (
                  <div
                    key={match.id}
                    className="p-5 rounded-[2.5rem] space-y-4"
                    style={{
                      background: "linear-gradient(145deg, rgba(0,70,25,0.52) 0%, rgba(0,35,10,0.82) 100%)",
                      border: "1px solid rgba(255,193,7,0.14)",
                      backdropFilter: "blur(14px)",
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">{match.league_name}</span>
                      <div className="flex items-center gap-2">
                        <div
                          className="px-2 py-1 rounded-lg text-[9px] font-bold"
                          style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,193,7,0.6)" }}
                        >
                          {new Date(match.match_time).toLocaleDateString('pt-BR')}
                        </div>
                        {(() => {
                          const myPred = matchPreds.find(p => p.user_id === currentUserId)
                          if (!myPred) return null
                          const pts = calcPoints(myPred, match)
                          return (
                            <button
                              onClick={() => setShareMatch({ match, pred: { score_a: myPred.guess_a, score_b: myPred.guess_b, wildcard: myPred.wildcard }, points: pts })}
                              className="flex items-center justify-center h-7 w-7 rounded-full transition-all"
                              style={{ background: "rgba(255,193,7,0.12)", border: "1px solid rgba(255,193,7,0.25)" }}
                            >
                              <Share2 className="h-3 w-3" style={{ color: "#FFC107" }} />
                            </button>
                          )
                        })()}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-col items-center gap-2 flex-1">
                        <div className="h-10 w-10 flex items-center justify-center">
                          <img src={match.team_a_logo} className="h-10 w-10 object-contain"
                            onError={(e) => { e.currentTarget.style.display = 'none'; (e.currentTarget.nextSibling as HTMLElement)?.style.setProperty('display', 'flex') }} />
                          <span style={{ display: 'none' }} className="text-lg font-black text-muted-foreground">{match.team_a?.[0]}</span>
                        </div>
                        <span className="text-[10px] font-bold text-center uppercase truncate w-full">{match.team_a}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-black">{match.score_a}</span>
                        <span className="text-muted-foreground font-black italic text-xs">FT</span>
                        <span className="text-2xl font-black">{match.score_b}</span>
                      </div>
                      <div className="flex flex-col items-center gap-2 flex-1">
                        <div className="h-10 w-10 flex items-center justify-center">
                          <img src={match.team_b_logo} className="h-10 w-10 object-contain"
                            onError={(e) => { e.currentTarget.style.display = 'none'; (e.currentTarget.nextSibling as HTMLElement)?.style.setProperty('display', 'flex') }} />
                          <span style={{ display: 'none' }} className="text-lg font-black text-muted-foreground">{match.team_b?.[0]}</span>
                        </div>
                        <span className="text-[10px] font-bold text-center uppercase truncate w-full">{match.team_b}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t" style={{ borderColor: "rgba(0,190,80,0.08)" }}>
                      <p className="text-[10px] font-black uppercase text-muted-foreground mb-3 flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        Palpites da Galera
                      </p>
                      <div className="grid gap-2">
                        {matchPreds.map(p => {
                          const points = calcPoints(p, match)
                          const isGood = points > 0
                          return (
                            <div
                              key={p.user_id}
                              className="flex items-center justify-between p-2 px-4 rounded-xl"
                              style={points === 3 || points === 6 ? {
                                background: "rgba(255,193,7,0.08)",
                                border: "1px solid rgba(255,193,7,0.25)",
                              } : {
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(0,190,80,0.07)",
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <img
                                  src={p.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.user_id}`}
                                  className="h-5 w-5 rounded-full"
                                />
                                <span className={cn("text-[10px] font-bold", p.user_id === currentUserId && "text-yellow-400")}>
                                  {p.profiles?.username || p.profiles?.full_name || 'Amigo'}
                                </span>
                                {p.wildcard && <span className="text-[9px]">⚡</span>}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-black">{p.guess_a} x {p.guess_b}</span>
                                <span
                                  className="text-[10px] font-black px-2 py-0.5 rounded-full"
                                  style={
                                    points >= 3
                                      ? { background: "rgba(34,197,94,0.2)", color: "#4ade80" }
                                      : points >= 1
                                      ? { background: "rgba(59,130,246,0.2)", color: "#60a5fa" }
                                      : points < 0
                                      ? { background: "rgba(239,68,68,0.15)", color: "#f87171" }
                                      : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }
                                  }
                                >
                                  {points > 0 ? `+${points}` : points} PTS
                                </span>
                              </div>
                            </div>
                          )
                        })}
                        {matchPreds.length === 0 && (
                          <p className="text-[9px] text-muted-foreground italic text-center">Nenhum palpite registrado.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              {matches.filter(m => m.status === 'FT').length === 0 && (
                <div
                  className="p-12 text-center rounded-3xl"
                  style={{ background: "rgba(0,45,18,0.4)", border: "1px solid rgba(0,190,80,0.08)" }}
                >
                  <p className="text-sm text-muted-foreground">Nenhum jogo encerrado ainda.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Chat */}
          {activeTab === 'chat' && (
            <motion.div key="chat" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="h-full flex flex-col">
              <div className="flex-1 overflow-y-auto pr-1 no-scrollbar space-y-4 pb-4">
                {messages.map((msg) => {
                  if (msg.is_system) {
                    return (
                      <div key={msg.id} className="flex justify-center my-2">
                        <div
                          className="px-4 py-1.5 rounded-full"
                          style={{ background: "rgba(255,193,7,0.08)", border: "1px solid rgba(255,193,7,0.2)" }}
                        >
                          <p className="text-[10px] font-black uppercase tracking-tighter text-center" style={{ color: "#FFC107" }}>
                            {msg.content}
                          </p>
                        </div>
                      </div>
                    )
                  }
                  return (
                    <div key={msg.id} className={cn("flex flex-col", msg.user_id === currentUserId ? "items-end" : "items-start")}>
                      <div className="flex items-center gap-2 mb-1">
                        {msg.user_id !== currentUserId && (
                          <span className="text-[9px] font-black uppercase text-muted-foreground">
                            {msg.profiles?.username || msg.profiles?.full_name}
                          </span>
                        )}
                        <span className="text-[8px] text-muted-foreground">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div
                        className="max-w-[80%] p-3 px-4 rounded-2xl text-sm font-medium"
                        style={msg.user_id === currentUserId ? {
                          background: "linear-gradient(135deg, #FFC107 0%, #FF8F00 100%)",
                          color: "#0a1f0d",
                          borderTopRightRadius: 4,
                          boxShadow: "0 4px 16px rgba(255,193,7,0.25)",
                        } : {
                          background: "rgba(0,55,20,0.6)",
                          border: "1px solid rgba(0,190,80,0.12)",
                          borderTopLeftRadius: 4,
                        }}
                      >
                        {msg.content}
                      </div>
                    </div>
                  )
                })}
                <div ref={chatEndRef} />
              </div>
              <div className="pt-4 flex gap-2">
                <input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Mande sua resenha..."
                  className="flex-1 h-12 rounded-xl px-4 text-sm focus:outline-none transition-all text-white"
                  style={{
                    background: "rgba(0,45,18,0.5)",
                    border: "1px solid rgba(0,190,80,0.15)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.border = "1.5px solid rgba(255,193,7,0.45)"
                    e.currentTarget.style.boxShadow = "0 0 14px rgba(255,193,7,0.1)"
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.border = "1px solid rgba(0,190,80,0.15)"
                    e.currentTarget.style.boxShadow = "none"
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={sendingMessage || !newMessage.trim()}
                  className="h-12 w-12 rounded-xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-40"
                  style={{
                    background: "linear-gradient(135deg, #FFC107 0%, #FF8F00 100%)",
                    color: "#0a1f0d",
                    boxShadow: "0 4px 16px rgba(255,193,7,0.3)",
                  }}
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {shareMatch && (
        <ShareCard
          match={shareMatch.match}
          prediction={shareMatch.pred}
          points={shareMatch.points}
          onClose={() => setShareMatch(null)}
        />
      )}
    </div>
  )
}
