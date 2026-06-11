"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Trophy, Plus, Users, Hash, ChevronRight, LogIn, Check, Calendar, Share2 } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface League {
  id: string
  name: string
  invite_code: string
  member_count: number
  image_url?: string
}

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState<League[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [newLeagueName, setNewLeagueName] = useState("")
  const [newLeagueImage, setNewLeagueImage] = useState("")
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
      const unique = Array.from(new Set(data.map((m: any) => m.league_name))).filter(Boolean) as string[]
      setAvailableLeagues(unique)
    }
  }

  async function fetchLeagues() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('league_members')
      .select(`leagues (id, name, invite_code, image_url)`)
      .eq('user_id', user.id)
    if (error) return

    if (data) {
      const formatted = data
        .filter((item: any) => item.leagues !== null)
        .map((item: any) => ({ ...item.leagues, member_count: 0 }))
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
          image_url: newLeagueImage,
          settings: { leagues: selectedLeaguesForNew },
        })
        .select()
        .single()

      if (lError) throw lError
      if (league) {
        await supabase.from('league_members').insert({ league_id: league.id, user_id: user.id })
        fetchLeagues()
        setShowCreate(false)
        setNewLeagueName("")
        setNewLeagueImage("")
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

      const { error: mError } = await supabase
        .from('league_members')
        .insert({ league_id: league.id, user_id: user.id })

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

  const inputStyle = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(0,190,80,0.15)",
  }
  const inputFocusStyle = {
    border: "1.5px solid rgba(255,193,7,0.5)",
    boxShadow: "0 0 14px rgba(255,193,7,0.1)",
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-black">Suas Ligas</h1>
          <p className="text-sm text-muted-foreground">Compita com seus amigos</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              const { error: syncErr } = await supabase.functions.invoke('sync-matches')
              if (syncErr) alert('Erro ao sincronizar: ' + syncErr.message)
              else alert('Sincronizado! Atualize a página.')
            }}
            className="h-9 px-3 rounded-xl flex items-center justify-center font-bold text-xs gap-1.5"
            style={{
              background: "rgba(0,190,80,0.1)",
              border: "1px solid rgba(0,190,80,0.2)",
              color: "#4ade80",
            }}
          >
            <Calendar className="h-3.5 w-3.5" />
            Sync
          </button>
          <button
            onClick={() => setShowJoin(true)}
            className="h-9 px-3 rounded-xl flex items-center justify-center font-bold text-xs gap-1.5"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(0,190,80,0.12)",
              color: "rgba(255,255,255,0.7)",
            }}
          >
            <LogIn className="h-3.5 w-3.5" />
            Entrar
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="h-9 w-9 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #FFC107 0%, #FF8F00 100%)",
              color: "#0a1f0d",
              boxShadow: "0 4px 16px rgba(255,193,7,0.35)",
            }}
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="grid gap-3">
        {leagues.map((league) => (
          <div key={league.id} className="relative">
            <Link href={`/ligas/${league.id}`}>
              <motion.div
                whileTap={{ scale: 0.98 }}
                className="p-4 rounded-2xl flex items-center gap-4 pr-20"
                style={{
                  background: "rgba(0,45,18,0.52)",
                  backdropFilter: "blur(14px)",
                  border: "1px solid rgba(255,193,7,0.18)",
                  borderLeft: "4px solid rgba(255,193,7,0.6)",
                }}
              >
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center overflow-hidden shrink-0"
                  style={{
                    background: "rgba(255,193,7,0.1)",
                    border: "1px solid rgba(255,193,7,0.2)",
                  }}
                >
                  {league.image_url ? (
                    <img src={league.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Trophy className="h-6 w-6" style={{ color: "#FFC107" }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black truncate">{league.name}</h3>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">
                    <Hash className="h-3 w-3" />
                    <span>{league.invite_code}</span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </motion.div>
            </Link>

            {/* Share button */}
            <button
              onClick={async (e) => {
                e.preventDefault()
                const link = `${window.location.origin}/convite/${league.invite_code}`
                if (navigator.share) {
                  await navigator.share({ title: league.name, text: `Entre no meu bolão da Copa!`, url: link })
                } else {
                  await navigator.clipboard.writeText(link)
                  alert('Link copiado!')
                }
              }}
              className="absolute right-14 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
              style={{
                background: "rgba(255,193,7,0.12)",
                border: "1px solid rgba(255,193,7,0.25)",
                color: "#FFC107",
              }}
              title="Compartilhar link de convite"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        {leagues.length === 0 && !loading && (
          <div
            className="text-center py-12 rounded-3xl space-y-4"
            style={{ background: "rgba(0,45,18,0.4)", border: "1px solid rgba(0,190,80,0.08)" }}
          >
            <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-20" />
            <p className="text-muted-foreground text-sm">Você ainda não participa de nenhuma liga.</p>
          </div>
        )}
      </div>

      {/* Modal Criar */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 overflow-y-auto" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm p-6 my-auto rounded-3xl space-y-6"
            style={{ background: "rgba(0,40,15,0.95)", border: "1px solid rgba(255,193,7,0.2)", backdropFilter: "blur(20px)" }}
          >
            <h3 className="text-xl font-black">Criar Nova Liga</h3>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Nome da Liga</label>
              <input
                value={newLeagueName}
                onChange={(e) => setNewLeagueName(e.target.value)}
                className="w-full h-12 rounded-xl px-4 focus:outline-none transition-all text-white"
                style={inputStyle}
                onFocus={(e) => Object.assign(e.currentTarget.style, inputFocusStyle)}
                onBlur={(e) => { e.currentTarget.style.border = inputStyle.border; e.currentTarget.style.boxShadow = "none" }}
                placeholder="Ex: Liga dos Cria"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Imagem da Liga (URL)</label>
              <input
                value={newLeagueImage}
                onChange={(e) => setNewLeagueImage(e.target.value)}
                className="w-full h-12 rounded-xl px-4 focus:outline-none transition-all text-white"
                style={inputStyle}
                onFocus={(e) => Object.assign(e.currentTarget.style, inputFocusStyle)}
                onBlur={(e) => { e.currentTarget.style.border = inputStyle.border; e.currentTarget.style.boxShadow = "none" }}
                placeholder="https://exemplo.com/foto.png"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Campeonatos Válidos</label>
              <div className="grid gap-2 max-h-48 overflow-y-auto pr-2 no-scrollbar">
                {availableLeagues.map(l => (
                  <button
                    key={l}
                    onClick={() => toggleLeagueSelection(l)}
                    className={cn("flex items-center justify-between p-3 rounded-xl text-left transition-all")}
                    style={selectedLeaguesForNew.includes(l) ? {
                      background: "rgba(255,193,7,0.12)",
                      border: "1px solid rgba(255,193,7,0.35)",
                      color: "#FFC107",
                    } : {
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(0,190,80,0.12)",
                      color: "rgba(255,255,255,0.5)",
                    }}
                  >
                    <span className="text-xs font-bold">{l}</span>
                    {selectedLeaguesForNew.includes(l) && <Check className="h-4 w-4" />}
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-muted-foreground italic">* Se nada for selecionado, todos os campeonatos valem pontos.</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 h-12 rounded-xl font-bold text-sm"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                Cancelar
              </button>
              <button
                onClick={createLeague}
                className="flex-1 h-12 rounded-xl font-black text-sm"
                style={{
                  background: "linear-gradient(135deg, #FFC107 0%, #FF8F00 100%)",
                  color: "#0a1f0d",
                  boxShadow: "0 4px 16px rgba(255,193,7,0.3)",
                }}
              >
                Criar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal Entrar */}
      {showJoin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm p-6 rounded-3xl space-y-6"
            style={{ background: "rgba(0,40,15,0.95)", border: "1px solid rgba(255,193,7,0.2)", backdropFilter: "blur(20px)" }}
          >
            <h3 className="text-xl font-black">Entrar em uma Liga</h3>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Código de Convite</label>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="w-full h-12 rounded-xl px-4 focus:outline-none transition-all text-center font-mono text-xl tracking-widest uppercase text-white"
                style={inputStyle}
                onFocus={(e) => Object.assign(e.currentTarget.style, inputFocusStyle)}
                onBlur={(e) => { e.currentTarget.style.border = inputStyle.border; e.currentTarget.style.boxShadow = "none" }}
                placeholder="ABC123"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowJoin(false)}
                className="flex-1 h-12 rounded-xl font-bold text-sm"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                Cancelar
              </button>
              <button
                onClick={joinLeague}
                className="flex-1 h-12 rounded-xl font-black text-sm"
                style={{
                  background: "linear-gradient(135deg, #FFC107 0%, #FF8F00 100%)",
                  color: "#0a1f0d",
                  boxShadow: "0 4px 16px rgba(255,193,7,0.3)",
                }}
              >
                Entrar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
