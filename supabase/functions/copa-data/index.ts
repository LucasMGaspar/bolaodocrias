import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const FOOTBALL_DATA_KEY = Deno.env.get('FOOTBALL_DATA_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FDO_HEADERS = { 'X-Auth-Token': FOOTBALL_DATA_KEY }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const url = new URL(req.url)
  const type = url.searchParams.get('type') // 'standings' | 'scorers'

  try {
    if (type === 'standings') {
      const res = await fetch('https://api.football-data.org/v4/competitions/WC/standings', { headers: FDO_HEADERS })
      const data = await res.json()

      const groups = (data.standings ?? [])
        .filter((s: any) => s.type === 'TOTAL')
        .map((s: any) => ({
          group: s.group?.replace('GROUP_', 'Grupo ') ?? s.stage,
          table: (s.table ?? []).map((t: any) => ({
            position: t.position,
            team: t.team.name,
            logo: t.team.crest,
            played: t.playedGames,
            won: t.won,
            draw: t.draw,
            lost: t.lost,
            gf: t.goalsFor,
            ga: t.goalsAgainst,
            gd: t.goalDifference,
            points: t.points,
          })),
        }))

      return new Response(JSON.stringify({ groups }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (type === 'scorers') {
      const res = await fetch('https://api.football-data.org/v4/competitions/WC/scorers?limit=20', { headers: FDO_HEADERS })
      const data = await res.json()

      const scorers = (data.scorers ?? []).map((s: any) => ({
        name: s.player.name,
        team: s.team.name,
        logo: s.team.crest,
        goals: s.goals ?? 0,
        assists: s.assists ?? 0,
        penalties: s.penalties ?? 0,
      }))

      return new Response(JSON.stringify({ scorers }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'type must be standings or scorers' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
