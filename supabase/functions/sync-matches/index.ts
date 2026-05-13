import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const API_FOOTBALL_KEY = Deno.env.get('API_FOOTBALL_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Fetch ALL matches for today (May 13th, 2026)
    const response = await fetch('https://v3.football.api-sports.io/fixtures?date=2026-05-13', {
      headers: {
        'x-apisports-key': API_FOOTBALL_KEY!,
        'x-apisports-host': 'v3.football.api-sports.io'
      }
    })

    const data = await response.json()
    const fixtures = data.response

    const updates = fixtures.map((f: any) => ({
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

    // Upsert into Supabase
    const { error } = await supabase
      .from('matches')
      .upsert(updates, { onConflict: 'id' })

    if (error) throw error

    return new Response(JSON.stringify({ message: `Synced ${updates.length} matches` }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

function mapStatus(shortStatus: string) {
  switch (shortStatus) {
    case 'NS': return 'pending'
    case '1H':
    case '2H':
    case 'HT': return 'live'
    case 'FT': return 'FT'
    default: return 'pending'
  }
}
