"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Trophy, Plus, Users, Hash, ChevronRight, LogIn, Check } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface League {
  id: string
  name: string
  invite_code: string
  member_count: number
}

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState<League[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [newLeagueName, setNewLeagueName] = useState("")
  const [joinCode, setJoinCode] = useState("")
  const [availableLeagues, setAvailableLeagues] = useState<string[]>([])
  const [selectedLeaguesForNew, setSelectedLeaguesForNew] = useState<string[]>([])

  useEffect(() => {
    fetchLeagues()
    fetchAvailableCompetitions()
  }, [])

  async function fetchAvailableCompetitions() {
    const { data } = await supabase.from('matches').select('league_name')
    if (data) {
      const unique = Array.from(new Set(data.map(m => m.league_name))).filter(Boolean) as string[]
      setAvailableLeagues(unique)
    }
  }

  async function fetchLeagues() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('league_members')
      .select(`
        leagues (
          id,
          name,
          invite_code
        )
      `)
      .eq('user_id', user.id)

    if (data) {
      const formatted = data
        .filter((item: any) => item.leagues !== null)
        .map((item: any) => ({
          ...item.leagues,
          member_count: 0
        }))
      setLeagues(formatted)
    }
    setLoading(false)
  }

  async function createLeague() {
    if (!newLeagueName) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase()

    try {
      const { data: league, error: lError } = await supabase
        .from('leagues')
        .insert({
          name: newLeagueName,
          invite_code: inviteCode,
          owner_id: user.id,
          settings: { leagues: selectedLeaguesForNew }
        })
        .select()
        .single()

      if (lError) throw lError

      if (league) {
        await supabase.from('league_members').insert({
          league_id: league.id,
          user_id: user.id
        })
        fetchLeagues()
        setShowCreate(false)
        setNewLeagueName("")
        setSelectedLeaguesForNew([])
      }
    } catch (err: any) {
      alert("Erro ao criar: " + err.message)
    }
  }

  async function joinLeague() {
    if (!joinCode) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      const { data: league, error: lError } = await supabase
        .from('leagues')
        .select('id')
        .eq('invite_code', joinCode.toUpperCase())
        .single()

      if (lError || !league) throw new Error("Liga não encontrada")

      const { error: mError } = await supabase.from('league_members').insert({
        league_id: league.id,
        user_id: user.id
      })

      if (mError) {
        if (mError.code === '23505') throw new Error("Você já está nesta liga")
        throw mError
      }

      fetchLeagues()
      setShowJoin(false)
      setJoinCode("")
      alert("Bem-vindo à liga!")
    } catch (err: any) {
      alert(err.message)
    }
  }

  const toggleLeagueSelection = (name: string) => {
    setSelectedLeaguesForNew(prev => 
      prev.includes(name) ? prev.filter(l => l !== name) : [...prev, name]
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Suas Ligas</h1>
          <p className="text-sm text-muted-foreground">Compita com seus amigos</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowJoin(true)}
            className="h-10 px-4 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center font-bold text-xs gap-2"
          >
            <LogIn className="h-4 w-4" />
            Entrar
          </button>
          <button 
            onClick={() => setShowCreate(true)}
            className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      </header>

      <div className="grid gap-3">
        {leagues.map((league) => (
          <Link key={league.id} href={`/ligas/${league.id}`}>
            <motion.div 
              whileTap={{ scale: 0.98 }}
              className="glass p-4 rounded-2xl flex items-center gap-4 border-l-4 border-l-primary"
            >
              <div className="h-12 w-12 bg-white/5 rounded-xl flex items-center justify-center text-primary">
                <Trophy className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold">{league.name}</h3>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  <Hash className="h-3 w-3" />
                  <span>Código: {league.invite_code}</span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </motion.div>
          </Link>
        ))}

        {leagues.length === 0 && !loading && (
          <div className="text-center py-12 glass rounded-3xl space-y-4">
            <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-20" />
            <p className="text-muted-foreground text-sm">Você ainda não participa de nenhuma liga.</p>
          </div>
        )}
      </div>

      {/* Modal Criar */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass w-full max-w-sm p-6 my-auto rounded-3xl space-y-6">
            <h3 className="text-xl font-bold">Criar Nova Liga</h3>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Nome da Liga</label>
              <input 
                value={newLeagueName} 
                onChange={(e) => setNewLeagueName(e.target.value)} 
                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-primary" 
                placeholder="Ex: Liga dos Cria" 
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Campeonatos Válidos</label>
              <div className="grid gap-2 max-h-48 overflow-y-auto pr-2 no-scrollbar">
                {availableLeagues.map(l => (
                  <button
                    key={l}
                    onClick={() => toggleLeagueSelection(l)}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border text-left transition-all",
                      selectedLeaguesForNew.includes(l)
                        ? "bg-primary/20 border-primary text-primary"
                        : "bg-white/5 border-white/10 text-muted-foreground"
                    )}
                  >
                    <span className="text-xs font-bold">{l}</span>
                    {selectedLeaguesForNew.includes(l) && <Check className="h-4 w-4" />}
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-muted-foreground italic">* Se nada for selecionado, todos os campeonatos valerão pontos.</p>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 h-12 rounded-xl font-bold text-sm bg-white/5">Cancelar</button>
              <button onClick={createLeague} className="flex-1 h-12 rounded-xl font-bold text-sm bg-primary text-white shadow-lg shadow-primary/30">Criar</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal Entrar */}
      {showJoin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass w-full max-w-sm p-6 rounded-3xl space-y-6">
            <h3 className="text-xl font-bold">Entrar em uma Liga</h3>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Código de Convite</label>
              <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-primary text-center font-mono text-xl tracking-widest uppercase" placeholder="ABC123" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowJoin(false)} className="flex-1 h-12 rounded-xl font-bold text-sm bg-white/5">Cancelar</button>
              <button onClick={joinLeague} className="flex-1 h-12 rounded-xl font-bold text-sm bg-primary text-white shadow-lg shadow-primary/30">Entrar</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
