"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Trophy, Users, TrendingUp, Calendar, Star } from "lucide-react"
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
  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: members } = await supabase
      .from('league_members')
      .select('total_score')
      .eq('user_id', user.id)

    if (members) {
      const points = members.reduce((acc: number, m: any) => acc + (m.total_score || 0), 0)
      setStats({ totalPoints: points, leaguesCount: members.length })
    }

    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .gte('match_time', new Date().toISOString())
      .order('match_time', { ascending: true })
      .limit(1)

    if (matches && matches.length > 0) setFeaturedMatch(matches[0])
  }

  return (
    <div className="space-y-7">

      {/* Copa Hero */}
      <header>
        <div
          className="relative rounded-[2rem] overflow-hidden p-6 text-center field-stripes"
          style={{
            background: "linear-gradient(160deg, rgba(0,90,32,0.82) 0%, rgba(0,45,14,0.95) 55%, rgba(0,70,22,0.85) 100%)",
            border: "1px solid rgba(255,193,7,0.22)",
            boxShadow: "0 4px 40px rgba(0,0,0,0.4), 0 0 60px rgba(0,160,60,0.08) inset",
          }}
        >
          {/* Stars top */}
          <div className="flex justify-center gap-1.5 mb-3">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className="h-3 w-3 fill-yellow-400 text-yellow-400"
                style={{ filter: "drop-shadow(0 0 5px rgba(255,193,7,0.8))" }}
              />
            ))}
          </div>

          {/* Trophy */}
          <div className="flex justify-center mb-3">
            <div
              className="h-20 w-20 rounded-[1.5rem] flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(255,193,7,0.18) 0%, rgba(255,140,0,0.12) 100%)",
                border: "1px solid rgba(255,193,7,0.3)",
                boxShadow: "0 0 30px rgba(255,193,7,0.15)",
              }}
            >
              <Trophy
                className="h-12 w-12"
                style={{ color: "#FFC107", filter: "drop-shadow(0 0 14px rgba(255,193,7,0.7))" }}
              />
            </div>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-white">Bolão dos Crias</h1>
          <p
            className="text-[11px] font-black uppercase tracking-[0.2em] mt-1"
            style={{ color: "rgba(255,193,7,0.75)" }}
          >
            FIFA World Cup · 2026
          </p>

          {/* Stars bottom */}
          <div className="flex justify-center gap-1.5 mt-3">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className="h-3 w-3 fill-yellow-400 text-yellow-400"
                style={{ filter: "drop-shadow(0 0 5px rgba(255,193,7,0.8))" }}
              />
            ))}
          </div>

          {/* Grass line accent at bottom */}
          <div
            className="absolute bottom-0 left-0 right-0 h-1"
            style={{
              background: "repeating-linear-gradient(90deg, rgba(34,197,94,0.5) 0px, rgba(34,197,94,0.5) 18px, rgba(22,163,74,0.3) 18px, rgba(22,163,74,0.3) 36px)",
            }}
          />
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div
          className="glass p-4 rounded-2xl space-y-2"
          style={{ border: "1px solid rgba(255,193,7,0.18)", boxShadow: "0 0 20px rgba(255,193,7,0.04)" }}
        >
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(255,193,7,0.12)" }}
          >
            <Trophy className="h-5 w-5" style={{ color: "#FFC107" }} />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Seus Pontos</p>
            <p className="text-2xl font-black" style={{ color: "#FFC107" }}>{stats.totalPoints}</p>
          </div>
        </div>

        <div
          className="glass p-4 rounded-2xl space-y-2"
          style={{ border: "1px solid rgba(0,190,80,0.18)" }}
        >
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(0,190,80,0.12)" }}
          >
            <Users className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Suas Ligas</p>
            <p className="text-2xl font-black text-green-400">{stats.leaguesCount}</p>
          </div>
        </div>
      </div>

      {/* Featured Match */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2">
            <Star className="h-4 w-4 fill-yellow-400" style={{ color: "#FFC107" }} />
            Próximo Jogo
          </h3>
          <Link href="/palpites" className="text-[10px] font-bold uppercase" style={{ color: "#FFC107" }}>
            Ver todos
          </Link>
        </div>

        {featuredMatch ? (
          <div
            className="rounded-3xl p-6 relative overflow-hidden field-stripes"
            style={{
              background: "linear-gradient(135deg, rgba(0,85,28,0.72) 0%, rgba(0,35,10,0.92) 100%)",
              border: "1px solid rgba(255,193,7,0.22)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.35), 0 0 40px rgba(0,160,60,0.06) inset",
            }}
          >
            <div className="relative text-center space-y-4">
              <div className="flex items-center justify-center gap-8">
                <div className="space-y-2 flex-1">
                  <div
                    className="h-16 w-16 rounded-2xl flex items-center justify-center p-2 mx-auto"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.09)" }}
                  >
                    <img src={featuredMatch.team_a_logo} alt="" className="w-full" />
                  </div>
                  <p className="text-xs font-bold truncate">{featuredMatch.team_a}</p>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-2xl font-black italic" style={{ color: "rgba(255,193,7,0.5)" }}>VS</span>
                </div>

                <div className="space-y-2 flex-1">
                  <div
                    className="h-16 w-16 rounded-2xl flex items-center justify-center p-2 mx-auto"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.09)" }}
                  >
                    <img src={featuredMatch.team_b_logo} alt="" className="w-full" />
                  </div>
                  <p className="text-xs font-bold truncate">{featuredMatch.team_b}</p>
                </div>
              </div>

              <div
                className="py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,193,7,0.12)" }}
              >
                <Calendar className="h-3 w-3" style={{ color: "#FFC107" }} />
                <span style={{ color: "rgba(255,193,7,0.8)" }}>
                  {new Date(featuredMatch.match_time).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass p-8 rounded-3xl text-center text-muted-foreground text-sm">
            Nenhum jogo próximo encontrado.
          </div>
        )}
      </section>

      {/* Quick Links */}
      <section className="grid gap-3">
        <Link
          href="/ligas"
          className="flex items-center justify-between glass p-5 rounded-2xl group transition-all hover:border-green-500/30"
        >
          <div className="flex items-center gap-4">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(0,190,80,0.12)" }}
            >
              <TrendingUp className="h-6 w-6 text-green-400" />
            </div>
            <div className="text-left">
              <p className="font-bold">Ver Ligas &amp; Ranking</p>
              <p className="text-[10px] text-muted-foreground">Competir com amigos</p>
            </div>
          </div>
          <div
            className="h-8 w-8 flex items-center justify-center group-hover:translate-x-1 transition-transform"
            style={{ color: "#FFC107" }}
          >
            →
          </div>
        </Link>
      </section>
    </div>
  )
}
