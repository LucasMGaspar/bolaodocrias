import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const API_FOOTBALL_KEY = Deno.env.get('API_FOOTBALL_KEY')
const FOOTBALL_DATA_KEY = Deno.env.get('FOOTBALL_DATA_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const APISPORTS_HEADERS = {
  'x-apisports-key': API_FOOTBALL_KEY!,
  'x-apisports-host': 'v3.football.api-sports.io'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    let totalSynced = 0

    // --- 1. football-data.org: Copa do Mundo 2026 (todos os 104 jogos) ---
    const fdoResponse = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
      headers: { 'X-Auth-Token': FOOTBALL_DATA_KEY! }
    })
    const fdoData = await fdoResponse.json()

    if (fdoData.matches && fdoData.matches.length > 0) {
      const wcUpdates = fdoData.matches
        .filter((m: any) => m.homeTeam?.name && m.awayTeam?.name)
        .map((m: any) => ({
          id: m.id,
          team_a: m.homeTeam.name,
          team_b: m.awayTeam.name,
          team_a_logo: m.homeTeam.crest || null,
          team_b_logo: m.awayTeam.crest || null,
          league_name: 'FIFA World Cup',
          match_time: m.utcDate,
          status: mapFdoStatus(m.status),
          score_a: m.score?.fullTime?.home ?? null,
          score_b: m.score?.fullTime?.away ?? null,
          updated_at: new Date().toISOString()
        }))

      const { error } = await supabase
        .from('matches')
        .upsert(wcUpdates, { onConflict: 'id' })
      if (error) throw error
      totalSynced += wcUpdates.length
    }

    // --- 2. api-sports.io: outros jogos de ontem e hoje (live scores) ---
    for (let i = 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const date = d.toISOString().split('T')[0]
      const response = await fetch(`https://v3.football.api-sports.io/fixtures?date=${date}`, {
        headers: APISPORTS_HEADERS
      })
      const data = await response.json()
      if (data.response && data.response.length > 0) {
        const updates = data.response.map((f: any) => ({
          id: f.fixture.id,
          team_a: f.teams.home.name,
          team_b: f.teams.away.name,
          team_a_logo: f.teams.home.logo,
          team_b_logo: f.teams.away.logo,
          league_name: f.league.name,
          match_time: f.fixture.date,
          status: mapStatus(f.fixture.status.short),
          score_a: f.goals.home,
          score_b: f.goals.away,
          updated_at: new Date().toISOString()
        }))
        await supabase.from('matches').upsert(updates, { onConflict: 'id' })
        totalSynced += updates.length
      }
    }

    // --- 3. Refresh logos antigos do api-sports CDN ---
    const { data: allMatches } = await supabase
      .from('matches')
      .select('id, team_a_logo, team_b_logo')

    const brokenMatches = (allMatches || [])
      .filter((m: any) =>
        m.team_a_logo?.includes('media.api-sports.io') ||
        m.team_b_logo?.includes('media.api-sports.io')
      )
      .slice(0, 20)

    let logosFixed = 0

    if (brokenMatches.length > 0) {
      const teamIds = new Set<number>()
      for (const m of brokenMatches) {
        const idA = extractTeamId(m.team_a_logo)
        const idB = extractTeamId(m.team_b_logo)
        if (idA) teamIds.add(idA)
        if (idB) teamIds.add(idB)
      }

      const idsArr = Array.from(teamIds).slice(0, 20)
      if (idsArr.length > 0) {
        const logoMap: Record<number, string> = {}
        const res = await fetch(`https://v3.football.api-sports.io/teams?id=${idsArr[0]}`, { headers: APISPORTS_HEADERS })
        const teamData = await res.json()
        if (teamData.response) {
          for (const t of teamData.response) logoMap[t.team.id] = t.team.logo
        }

        await Promise.all(idsArr.slice(1, 11).map(async (id) => {
          const r = await fetch(`https://v3.football.api-sports.io/teams?id=${id}`, { headers: APISPORTS_HEADERS })
          const d = await r.json()
          if (d.response?.[0]) logoMap[id] = d.response[0].team.logo
        }))

        for (const m of brokenMatches) {
          const idA = extractTeamId(m.team_a_logo)
          const idB = extractTeamId(m.team_b_logo)
          const newLogoA = idA ? logoMap[idA] : undefined
          const newLogoB = idB ? logoMap[idB] : undefined
          if (newLogoA || newLogoB) {
            await supabase.from('matches').update({
              ...(newLogoA && { team_a_logo: newLogoA }),
              ...(newLogoB && { team_b_logo: newLogoB }),
            }).eq('id', m.id)
            logosFixed++
          }
        }
      }
    }

    return new Response(JSON.stringify({
      message: `Synced ${totalSynced} matches. Fixed ${logosFixed} logos.`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error)
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

function mapFdoStatus(status: string): string {
  switch (status) {
    case 'IN_PLAY':
    case 'PAUSED':
      return 'live'
    case 'FINISHED':
      return 'FT'
    default:
      return 'pending'
  }
}

function extractTeamId(url: string): number | null {
  if (!url) return null
  const match = url.match(/\/teams\/(\d+)\.png/)
  return match ? parseInt(match[1]) : null
}

function mapStatus(shortStatus: string) {
  switch (shortStatus) {
    case 'NS': return 'pending'
    case '1H':
    case '2H':
    case 'HT':
    case 'ET':
    case 'BT':
    case 'P':
      return 'live'
    case 'FT':
    case 'AET':
    case 'PEN':
      return 'FT'
    default: return 'pending'
  }
}
