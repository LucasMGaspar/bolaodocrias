"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, use } from "react"
import { supabase } from "@/lib/supabase"
import { Trophy, Users, LogIn, Loader2, CheckCircle2, Star } from "lucide-react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"

export default function ConvitePage({ params: paramsPromise }: { params: Promise<{ code: string }> }) {
  const params = use(paramsPromise)
  const code = params.code.toUpperCase()
  const router = useRouter()

  const [league, setLeague] = useState<any>(null)
  const [memberCount, setMemberCount] = useState(0)
  const [user, setUser] = useState<any>(null)
  const [alreadyMember, setAlreadyMember] = useState(false)
  const [joining, setJoining] = useState(false)
  const [joined, setJoined] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetchData()
  }, [code])

  async function fetchData() {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    setUser(currentUser)

    const { data: leagueData, error } = await supabase
      .from('leagues')
      .select('id, name, image_url, invite_code')
      .eq('invite_code', code)
      .single()

    if (error || !leagueData) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setLeague(leagueData)

    const { count } = await supabase
      .from('league_members')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueData.id)
    setMemberCount(count || 0)

    if (currentUser) {
      const { data: membership } = await supabase
        .from('league_members')
        .select('league_id')
        .eq('league_id', leagueData.id)
        .eq('user_id', currentUser.id)
        .single()
      if (membership) setAlreadyMember(true)
    }

    setLoading(false)
  }

  async function handleJoin() {
    if (!user) {
      router.push(`/login?redirect=/convite/${code}`)
      return
    }
    setJoining(true)
    const { error } = await supabase.from('league_members').insert({
      league_id: league.id,
      user_id: user.id,
    })
    if (error && error.code !== '23505') {
      alert('Erro ao entrar: ' + error.message)
      setJoining(false)
      return
    }
    setJoined(true)
    setJoining(false)
    setTimeout(() => router.push(`/ligas/${league.id}`), 1500)
  }

  if (loading) return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#FFC107" }} />
    </div>
  )

  if (notFound) return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4 text-center">
      <div className="text-5xl">🏴</div>
      <h2 className="text-xl font-black">Liga não encontrada</h2>
      <p className="text-sm text-muted-foreground">O código <strong>{code}</strong> não existe ou expirou.</p>
    </div>
  )

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-6 text-center"
      >
        {/* Copa header */}
        <div className="flex gap-1.5 justify-center">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400"
              style={{ filter: "drop-shadow(0 0 5px rgba(255,193,7,0.8))" }} />
          ))}
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "rgba(255,193,7,0.65)" }}>
          Copa do Mundo · 2026
        </p>

        {/* League card */}
        <div
          className="p-8 rounded-[2.5rem] space-y-5 field-stripes"
          style={{
            background: "linear-gradient(160deg, rgba(0,90,32,0.8) 0%, rgba(0,45,14,0.95) 100%)",
            border: "1px solid rgba(255,193,7,0.22)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
          }}
        >
          <div
            className="h-20 w-20 rounded-[1.5rem] flex items-center justify-center overflow-hidden mx-auto"
            style={{
              background: "linear-gradient(135deg, rgba(255,193,7,0.18) 0%, rgba(255,140,0,0.1) 100%)",
              border: "1px solid rgba(255,193,7,0.3)",
              boxShadow: "0 0 28px rgba(255,193,7,0.14)",
            }}
          >
            {league.image_url ? (
              <img src={league.image_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <Trophy className="h-10 w-10" style={{ color: "#FFC107", filter: "drop-shadow(0 0 10px rgba(255,193,7,0.6))" }} />
            )}
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Você foi convidado para</p>
            <h1 className="text-2xl font-black">{league.name}</h1>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{memberCount} participante{memberCount !== 1 ? 's' : ''}</span>
          </div>

          {joined ? (
            <div
              className="flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm"
              style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80" }}
            >
              <CheckCircle2 className="h-5 w-5" />
              Entrou na liga! Redirecionando...
            </div>
          ) : alreadyMember ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Você já é membro desta liga.</p>
              <button
                onClick={() => router.push(`/ligas/${league.id}`)}
                className="w-full h-14 rounded-2xl font-black text-sm"
                style={{
                  background: "linear-gradient(135deg, #FFC107 0%, #FF8F00 100%)",
                  color: "#0a1f0d",
                  boxShadow: "0 4px 24px rgba(255,193,7,0.35)",
                }}
              >
                Ver a Liga
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={handleJoin}
                disabled={joining}
                className="w-full h-14 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, #FFC107 0%, #FF8F00 100%)",
                  color: "#0a1f0d",
                  boxShadow: "0 4px 24px rgba(255,193,7,0.35)",
                }}
              >
                {joining ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <LogIn className="h-5 w-5" />
                    {user ? 'Entrar na Liga' : 'Criar conta e entrar'}
                  </>
                )}
              </button>
              {!user && (
                <p className="text-[11px] text-muted-foreground">
                  Já tem conta?{' '}
                  <button
                    onClick={() => router.push(`/login?redirect=/convite/${code}`)}
                    className="font-bold underline"
                    style={{ color: "#FFC107" }}
                  >
                    Faça login aqui
                  </button>
                </p>
              )}
            </div>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground">
          Código da liga: <span className="font-mono font-black" style={{ color: "rgba(255,193,7,0.7)" }}>{code}</span>
        </p>
      </motion.div>
    </div>
  )
}
