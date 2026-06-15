import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WAPI_INSTANCE_ID = Deno.env.get('WAPI_INSTANCE_ID')
const WAPI_TOKEN = Deno.env.get('WAPI_TOKEN')
const WHATSAPP_GROUP_ID = Deno.env.get('WHATSAPP_GROUP_ID')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Jogos começando nos próximos 30-90 minutos
    const now = new Date()
    const from = new Date(now.getTime() + 30 * 60 * 1000)
    const to = new Date(now.getTime() + 90 * 60 * 1000)

    const { data: upcomingMatches } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'pending')
      .gte('match_time', from.toISOString())
      .lte('match_time', to.toISOString())
      .order('match_time', { ascending: true })

    if (!upcomingMatches || upcomingMatches.length === 0) {
      return new Response(JSON.stringify({ message: 'Nenhum jogo próximo encontrado.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const matchLines = upcomingMatches.map((m: any) => {
      const brt = new Date(new Date(m.match_time).getTime() - 3 * 60 * 60 * 1000)
      const hh = brt.getUTCHours().toString().padStart(2, '0')
      const mm = brt.getUTCMinutes().toString().padStart(2, '0')
      return `⚽ *${m.team_a}* x *${m.team_b}* — ${hh}:${mm}\n   _${m.league_name}_`
    })

    const message = [
      `🏆 *BOLÃO — Jogos em breve!*`,
      ``,
      `Esses jogos começam em até 1h. Corre fazer seu palpite! 👇`,
      ``,
      ...matchLines,
      ``,
      `👉 Faça seu palpite agora:`,
      `https://bolaodocrias.vercel.app/palpites`,
    ].join('\n')

    const wapiRes = await fetch(
      `https://api.w-api.app/v1/message/send-text?instanceId=${WAPI_INSTANCE_ID}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WAPI_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: WHATSAPP_GROUP_ID, message }),
      }
    )

    const wapiResult = await wapiRes.json()

    return new Response(JSON.stringify({
      sent: upcomingMatches.length,
      matches: upcomingMatches.map((m: any) => `${m.team_a} x ${m.team_b}`),
      wapi: wapiResult,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error)
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
