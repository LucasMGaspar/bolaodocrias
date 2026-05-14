import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const API_FOOTBALL_KEY = Deno.env.get('API_FOOTBALL_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const API_HEADERS = {
  'x-apisports-key': API_FOOTBALL_KEY!,
  'x-apisports-host': 'v3.football.api-sports.io'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Fetch matches for the last 2 days (hoje + ontem)
    const dates = []
    for (let i = 0; i < 2; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      dates.push(d.toISOString().split('T')[0])
    }

    let allFixtures: any[] = []

    for (const date of dates) {
      const response = await fetch(`https://v3.football.api-sports.io/fixtures?date=${date}`, {
        headers: API_HEADERS
      })
      const data = await response.json()
      if (data.response) {
        allFixtures = [...allFixtures, ...data.response]
      }
    }

    const updates = allFixtures.map((f: any) => ({
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

    if (updates.length > 0) {
      const { error } = await supabase
        .from('matches')
        .upsert(updates, { onConflict: 'id' })
      if (error) throw error
    }

    // Refresh logos: busca IDs dos times com logos do CDN antigo e actualiza
    const { data: brokenMatches } = await supabase
      .from('matches')
      .select('id, team_a_logo, team_b_logo')
      .or('team_a_logo.like.%media.api-sports.io%,team_b_logo.like.%media.api-sports.io%')
      .limit(20)

    let logosFixed = 0

    if (brokenMatches && brokenMatches.length > 0) {
      // Extrai IDs únicos dos times a partir das URLs antigas
      const teamIds = new Set<number>()
      for (const m of brokenMatches) {
        const idA = extractTeamId(m.team_a_logo)
        const idB = extractTeamId(m.team_b_logo)
        if (idA) teamIds.add(idA)
        if (idB) teamIds.add(idB)
      }

      // Busca logos actuais da API por batch de IDs
      const idsArr = Array.from(teamIds).slice(0, 20)
      if (idsArr.length > 0) {
        const res = await fetch(`https://v3.football.api-sports.io/teams?id=${idsArr[0]}`, {
          headers: API_HEADERS
        })
        const teamData = await res.json()

        const logoMap: Record<number, string> = {}
        if (teamData.response) {
          for (const t of teamData.response) {
            logoMap[t.team.id] = t.team.logo
          }
        }

        // Busca restantes em paralelo (até 10 chamadas extra)
        await Promise.all(idsArr.slice(1, 11).map(async (id) => {
          const r = await fetch(`https://v3.football.api-sports.io/teams?id=${id}`, { headers: API_HEADERS })
          const d = await r.json()
          if (d.response?.[0]) logoMap[id] = d.response[0].team.logo
        }))

        // Actualiza cada match com os novos logos
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
      message: `Synced ${updates.length} matches. Fixed ${logosFixed} logos.`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

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
