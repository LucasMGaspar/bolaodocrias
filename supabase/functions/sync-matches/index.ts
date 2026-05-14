import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const API_FOOTBALL_KEY = Deno.env.get('API_FOOTBALL_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Fetch matches for the last 2 days (hoje + ontem) — conserva quota da API
    const dates = []
    for (let i = 0; i < 2; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      dates.push(d.toISOString().split('T')[0])
    }

    let allFixtures: any[] = []

    for (const date of dates) {
      console.log(`Fetching fixtures for ${date}...`)
      const response = await fetch(`https://v3.football.api-sports.io/fixtures?date=${date}`, {
        headers: {
          'x-apisports-key': API_FOOTBALL_KEY!,
          'x-apisports-host': 'v3.football.api-sports.io'
        }
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

    // Upsert into Supabase
    const { error } = await supabase
      .from('matches')
      .upsert(updates, { onConflict: 'id' })

    if (error) throw error

    return new Response(JSON.stringify({ message: `Synced ${updates.length} matches across ${dates.join(', ')}` }), {
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

function mapStatus(shortStatus: string) {
  switch (shortStatus) {
    case 'NS': return 'pending'
    case '1H':
    case '2H':
    case 'HT':
    case 'ET': // Extra Time
    case 'BT': // Break Time
    case 'P':  // Penalty In Progress
      return 'live'
    case 'FT':  // Full Time
    case 'AET': // After Extra Time
    case 'PEN': // After Penalties
      return 'FT'
    default: return 'pending'
  }
}
