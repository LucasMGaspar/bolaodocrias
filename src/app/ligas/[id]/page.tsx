"use client"

import { useEffect, useState, use, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Trophy, Medal, Send, Minus, Users, Calendar, MessageSquare, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { MatchCard } from "@/components/MatchCard"

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
  const [activeTab, setActiveTab] = useState<'ranking' | 'matches' | 'chat'>('ranking')
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
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!params.id) return
    fetchInitialData()

    // Real-time for Ranking
    const rankingChannel = supabase
      .channel(`league-${params.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'league_members', filter: `league_id=eq.${params.id}` }, 
      (payload) => {
        setMembers(prev => {
          const updated = prev.map(m => m.user_id === payload.new.user_id ? { ...m, total_score: payload.new.total_score } : m)
          return [...updated].sort((a, b) => b.total_score - a.total_score)
        })
      }).subscribe()

    // Real-time for Chat
    const chatChannel = supabase
      .channel(`chat-${params.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'league_messages', filter: `league_id=eq.${params.id}` },
      async (payload) => {
        const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', payload.new.user_id).single()
        const fullMsg = { ...payload.new, profiles: data } as Message
        setMessages(prev => [...prev, fullMsg])
      }).subscribe()

    return () => {
      supabase.removeChannel(rankingChannel)
      supabase.removeChannel(chatChannel)
    }
  }, [params.id])

  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, activeTab])

  async function fetchInitialData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setCurrentUserId(user.id)
    
    const { data: leagueData } = await supabase.from('leagues').select('*').eq('id', params.id).single()
    setLeague(leagueData)

    const { data: membersData } = await supabase.from('league_members').select(`user_id, total_score, profiles(full_name, username, avatar_url)`).eq('league_id', params.id).order('total_score', { ascending: false })
    if (membersData) setMembers(membersData as any)

    if (leagueData) {
      let query = supabase.from('matches').select('*').order('match_time', { ascending: true })
      const allowedLeagues = leagueData.settings?.leagues || []
      if (allowedLeagues.length > 0) query = query.in('league_name', allowedLeagues)
      const { data: matchesData } = await query.limit(20)
      if (matchesData) {
        setMatches(matchesData)
        const memberIds = membersData?.map(m => m.user_id) || []
        const { data: predData } = await supabase.from('predictions').select('*, profiles(full_name, username, avatar_url)').in('match_id', matchesData.map(m => m.id)).in('user_id', memberIds)
        if (predData) {
          setAllPredictions(predData)
          if (user) {
            const myPredMap: Record<number, any> = {}
            predData.filter(p => p.user_id === user.id).forEach(p => { 
              myPredMap[p.match_id] = { ...p, score_a: p.guess_a, score_b: p.guess_b } 
            })
            setPredictions(myPredMap)
          }
        }
      }

      // Fetch Chat Messages
      const { data: chatData } = await supabase.from('league_messages').select('*, profiles(full_name, username, avatar_url)').eq('league_id', params.id).order('created_at', { ascending: true }).limit(50)
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
      content: newMessage.trim()
    })
    if (!error) setNewMessage("")
    setSendingMessage(false)
  }

  const handlePredict = async (matchId: number, scoreA: number, scoreB: number) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('predictions').upsert({ 
      user_id: user.id, 
      match_id: matchId, 
      guess_a: scoreA, 
      guess_b: scoreB, 
      updated_at: new Date().toISOString() 
    })
    if (!error) {
      setPredictions(prev => ({ ...prev, [matchId]: { match_id: matchId, score_a: scoreA, score_b: scoreB } }))
      fetchInitialData()
    }
  }

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary" /></div>

  return (
    <div className="flex flex-col h-[calc(100vh-100px)]">
      <header className="flex flex-col items-center gap-4 mb-6 shrink-0">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/20 text-primary shadow-xl shadow-primary/10 overflow-hidden border-2 border-primary/20">
          {league?.image_url ? (
            <img src={league.image_url} alt={league.name} className="h-full w-full object-cover" />
          ) : (
            <Trophy className="h-8 w-8" />
          )}
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-black">{league?.name || 'Liga'}</h1>
          <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground uppercase font-black tracking-widest">
            <Users className="h-3 w-3" />
            <span>{members.length} participantes</span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10 mb-6 shrink-0">
        {(['ranking', 'matches', 'chat'] as const).map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2",
              activeTab === tab ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-white"
            )}
          >
            {tab === 'ranking' && <Trophy className="h-3 w-3" />}
            {tab === 'matches' && <Calendar className="h-3 w-3" />}
            {tab === 'chat' && <MessageSquare className="h-3 w-3" />}
            {tab === 'ranking' ? 'Ranking' : tab === 'matches' ? 'Jogos' : 'Resenha'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeTab === 'ranking' && (
            <motion.div key="ranking" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="h-full overflow-y-auto pr-2 no-scrollbar space-y-3">
              {members.map((member, index) => (
                <div key={member.user_id} className={cn("glass flex items-center gap-4 rounded-2xl p-4", index === 0 && "border-primary/50 bg-primary/5")}>
                  <div className="w-6 text-center font-bold">{index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}</div>
                  <div className="h-10 w-10 overflow-hidden rounded-full border border-white/10 bg-white/5">
                    <img src={member.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.user_id}`} alt="" />
                  </div>
                  <div className="flex-1 min-w-0"><p className="font-bold truncate text-sm">{member.profiles?.username || member.profiles?.full_name || 'Craque'}</p></div>
                  <div className="text-right"><p className="text-lg font-black text-primary">{member.total_score}</p><p className="text-[8px] uppercase text-muted-foreground font-bold">Pts</p></div>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'matches' && (
            <motion.div key="matches" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="h-full overflow-y-auto pr-2 no-scrollbar space-y-4 pb-4">
              {matches.map((match) => (
                <MatchCard key={match.id} match={match} prediction={predictions[match.id]} othersPredictions={allPredictions.filter(p => p.match_id === match.id && p.user_id !== currentUserId)} onPredict={handlePredict} />
              ))}
            </motion.div>
          )}

          {activeTab === 'chat' && (
            <motion.div key="chat" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="h-full flex flex-col">
              <div className="flex-1 overflow-y-auto pr-2 no-scrollbar space-y-4 pb-4">
                {messages.map((msg) => {
                  if (msg.is_system) {
                    return (
                      <div key={msg.id} className="flex justify-center my-2">
                        <div className="bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-full">
                          <p className="text-[10px] font-black uppercase text-primary tracking-tighter text-center">
                            {msg.content}
                          </p>
                        </div>
                      </div>
                    )
                  }
                  
                  return (
                    <div key={msg.id} className={cn("flex flex-col", msg.user_id === currentUserId ? "items-end" : "items-start")}>
                      <div className="flex items-center gap-2 mb-1">
                        {msg.user_id !== currentUserId && <span className="text-[9px] font-black uppercase text-muted-foreground">{msg.profiles?.username || msg.profiles?.full_name}</span>}
                        <span className="text-[8px] text-muted-foreground">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className={cn("max-w-[80%] p-3 px-4 rounded-2xl text-sm font-medium", msg.user_id === currentUserId ? "bg-primary text-white rounded-tr-none shadow-lg shadow-primary/20" : "bg-white/5 border border-white/10 rounded-tl-none")}>
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
                  className="flex-1 h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button 
                  onClick={sendMessage}
                  disabled={sendingMessage || !newMessage.trim()}
                  className="h-12 w-12 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20 transition-all active:scale-90 disabled:opacity-50"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
