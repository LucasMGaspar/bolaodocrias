"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Trophy, Users, Star, TrendingUp, Calendar } from "lucide-react"
import Link from "next/link"

interface Stats {
  totalPoints: number
  leaguesCount: number
}

interface Match {
  id: number
  team_a: string
  team_b: string
  team_a_logo: string
  team_b_logo: string
  match_time: string
}

export default function Home() {
  const [stats, setStats] = useState<Stats>({ totalPoints: 0, leaguesCount: 0 })
  const [featuredMatch, setFeaturedMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 1. Fetch Points & Leagues
    const { data: members } = await supabase
      .from('league_members')
      .select('total_score')
      .eq('user_id', user.id)

    if (members) {
      const points = members.reduce((acc, m) => acc + (m.total_score || 0), 0)
      setStats({
        totalPoints: points,
        leaguesCount: members.length
      })
    }

    // 2. Fetch Featured Match (next upcoming)
    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .gte('match_time', new Date().toISOString())
      .order('match_time', { ascending: true })
      .limit(1)

    if (matches && matches.length > 0) {
      setFeaturedMatch(matches[0])
    }
    
    setLoading(false)
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h2 className="text-sm font-bold text-primary uppercase tracking-widest">Dashboard</h2>
        <h1 className="text-3xl font-black">Bem-vindo, Craque!</h1>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass p-4 rounded-2xl space-y-2">
          <div className="h-8 w-8 bg-yellow-500/20 text-yellow-500 rounded-lg flex items-center justify-center">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Sua Pontuação</p>
            <p className="text-2xl font-black">{stats.totalPoints} pts</p>
          </div>
        </div>
        <div className="glass p-4 rounded-2xl space-y-2">
          <div className="h-8 w-8 bg-blue-500/20 text-blue-500 rounded-lg flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Suas Ligas</p>
            <p className="text-2xl font-black">{stats.leaguesCount}</p>
          </div>
        </div>
      </div>

      {/* Featured Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2">
            <Star className="h-4 w-4 text-primary fill-primary" />
            Próximo Jogo
          </h3>
          <Link href="/palpites" className="text-[10px] font-bold text-primary uppercase">Ver todos</Link>
        </div>

        {featuredMatch ? (
          <div className="glass rounded-3xl p-6 bg-gradient-to-br from-primary/20 to-transparent border-primary/20">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-8">
                <div className="space-y-2 flex-1">
                  <div className="h-16 w-16 bg-white/10 rounded-2xl flex items-center justify-center p-2 mx-auto">
                    <img src={featuredMatch.team_a_logo} alt="" className="w-full" />
                  </div>
                  <p className="text-xs font-bold truncate">{featuredMatch.team_a}</p>
                </div>
                <div className="text-2xl font-black italic text-muted-foreground">VS</div>
                <div className="space-y-2 flex-1">
                  <div className="h-16 w-16 bg-white/10 rounded-2xl flex items-center justify-center p-2 mx-auto">
                    <img src={featuredMatch.team_b_logo} alt="" className="w-full" />
                  </div>
                  <p className="text-xs font-bold truncate">{featuredMatch.team_b}</p>
                </div>
              </div>
              <div className="bg-black/40 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                <Calendar className="h-3 w-3" />
                {new Date(featuredMatch.match_time).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ) : (
          <div className="glass p-8 rounded-3xl text-center text-muted-foreground text-sm">
            Nenhum jogo próximo encontrado. 
            <br />
            Sincronize as partidas no painel do Supabase!
          </div>
        )}
      </section>

      {/* Quick Links */}
      <section className="grid gap-3">
        <Link href="/ligas" className="flex items-center justify-between glass p-5 rounded-2xl group hover:border-primary/50 transition-all">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-green-500/20 text-green-500 rounded-xl flex items-center justify-center">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div className="text-left">
              <p className="font-bold">Ver Ligas & Ranking</p>
              <p className="text-[10px] text-muted-foreground">Competir com amigos</p>
            </div>
          </div>
          <div className="h-8 w-8 flex items-center justify-center group-hover:translate-x-1 transition-transform">
            →
          </div>
        </Link>
      </section>
    </div>
  )
}
