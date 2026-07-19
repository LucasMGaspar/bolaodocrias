import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WAPI_INSTANCE_ID = Deno.env.get('WAPI_INSTANCE_ID')!
const WAPI_TOKEN = Deno.env.get('WAPI_TOKEN')!
const WHATSAPP_GROUP_ID = Deno.env.get('WHATSAPP_GROUP_ID')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_URL = 'https://bolaodocrias.vercel.app'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sendWA(message: string, mentions?: string[]) {
  const body: any = { phone: WHATSAPP_GROUP_ID, message }
  if (mentions?.length) body.mentions = mentions.map(p => `${p}@c.us`)
  await fetch(
    `https://api.w-api.app/v1/message/send-text?instanceId=${WAPI_INSTANCE_ID}`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${WAPI_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )
}

async function sendAudio(url: string) {
  await fetch(
    `https://api.w-api.app/v1/message/send-audio?instanceId=${WAPI_INSTANCE_ID}`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${WAPI_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: WHATSAPP_GROUP_ID, audio: url }),
    }
  )
}

function toBRT(utcStr: string): string {
  const brt = new Date(new Date(utcStr).getTime() - 3 * 60 * 60 * 1000)
  return `${brt.getUTCHours().toString().padStart(2, '0')}:${brt.getUTCMinutes().toString().padStart(2, '0')}`
}

function calcPts(pred: any, match: any): number {
  let base = 0
  if (pred.guess_a === match.score_a && pred.guess_b === match.score_b) {
    base = 3
  } else {
    const pw = Math.sign(pred.guess_a - pred.guess_b)
    const rw = Math.sign((match.score_a ?? 0) - (match.score_b ?? 0))
    if (pw === rw && rw !== 0) base = 1
    else if (pw === 0 && rw === 0) base = 1
  }
  if (pred.wildcard) return base === 0 ? -1 : base * 2
  return base
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const now = new Date()
    const sent: string[] = []

    // ── 0. BADGE (conquista desbloqueada) ────────────────────────────────────
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    if (body.action === 'badge') {
      const { user_name, badge_name, badge_icon, badge_desc } = body
      await sendWA([
        `${badge_icon} *NOVA CONQUISTA!*`, ``,
        `*${user_name}* desbloqueou *${badge_name}*`,
        `_${badge_desc}_`,
      ].join('\n'))
      return new Response(JSON.stringify({ ok: true, sent: ['badge'] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      })
    }

    // ── 0b. CAMPEÃO DA LIGA ────────────────────────────────────────────────
    if (body.action === 'champion') {
      const { audioUrls = [], testPhone } = body as { audioUrls?: string[]; testPhone?: string }

      const dest = testPhone ?? WHATSAPP_GROUP_ID
      const sendTo = (message: string) => fetch(
        `https://api.w-api.app/v1/message/send-text?instanceId=${WAPI_INSTANCE_ID}`,
        { method: 'POST', headers: { 'Authorization': `Bearer ${WAPI_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: dest, message }) }
      )
      const sendAudioTo = (url: string) => fetch(
        `https://api.w-api.app/v1/message/send-audio?instanceId=${WAPI_INSTANCE_ID}`,
        { method: 'POST', headers: { 'Authorization': `Bearer ${WAPI_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: dest, audio: url }) }
      )

      const { data: members } = await supabase
        .from('league_members')
        .select('user_id, total_score, profiles(full_name)')

      const agg: Record<string, { name: string; score: number }> = {}
      for (const m of members ?? []) {
        const uid = m.user_id as string
        const name = (m.profiles as any)?.full_name ?? 'Anônimo'
        if (!agg[uid]) agg[uid] = { name, score: 0 }
        agg[uid].score += m.total_score
      }

      const ranking = Object.values(agg).sort((a, b) => b.score - a.score)
      if (!ranking.length) {
        return new Response(JSON.stringify({ error: 'no members' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
        })
      }

      // 1. Mensagem do campeão
      await sendTo([
        '🏆🎆🏆',
        '',
        'O campeão do Bolão dos Cria é...',
        '',
        `👑 *${ranking[0].name}* 👑`,
      ].join('\n'))

      // 2. Áudios de fogos
      const audioResults: string[] = []
      for (const url of audioUrls) {
        const r = await sendAudioTo(url)
        audioResults.push(`${r.status} ${await r.text()}`)
      }

      // 3. Pódio
      const medals = ['🥇', '🥈', '🥉']
      const top3 = ranking.slice(0, 3)
      const podiumLines = top3.map((r, i) => `${medals[i]} *${r.name}* — ${r.score} pts`)

      const animParams = new URLSearchParams({
        campea:   top3[0]?.name ?? '',
        pts1:     String(top3[0]?.score ?? 0),
        segundo:  top3[1]?.name ?? '',
        pts2:     String(top3[1]?.score ?? 0),
        terceiro: top3[2]?.name ?? '',
        pts3:     String(top3[2]?.score ?? 0),
      })

      await sendTo([
        '🎇 *PÓDIO FINAL* 🎇',
        '',
        ...podiumLines,
        '',
        '🏆 Animação:',
        `${APP_URL}/campea?${animParams}`,
      ].join('\n'))

      return new Response(JSON.stringify({ ok: true, sent: ['champion', 'audio', 'podium'], audioResults }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      })
    }

    // ── 1. PRÓXIMOS (30–90 min) ──────────────────────────────────────────────
    const { data: upcoming } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'pending')
      .gte('match_time', new Date(now.getTime() + 30 * 60000).toISOString())
      .lte('match_time', new Date(now.getTime() + 90 * 60000).toISOString())
      .order('match_time')

    if (upcoming?.length) {
      const lines = upcoming.map(m =>
        `⚽ *${m.team_a}* x *${m.team_b}* — ${toBRT(m.match_time)}\n   _${m.league_name}_`
      )
      await sendWA([
        '🏆 *BOLÃO — Jogos em breve!*', '',
        'Esses jogos começam em até 1h. Corre fazer seu palpite! 👇', '',
        ...lines, '',
        '👉 Faça seu palpite agora:',
        `${APP_URL}/palpites`,
      ].join('\n'))
      sent.push(`upcoming:${upcoming.length}`)
    }

    // ── 2. COMEÇANDO AGORA (5–15 min) ───────────────────────────────────────
    const RANIERE_PHONE = '553391287475'

    const { data: starting } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'pending')
      .gte('match_time', new Date(now.getTime() + 5 * 60000).toISOString())
      .lte('match_time', new Date(now.getTime() + 15 * 60000).toISOString())
      .order('match_time')

    for (const m of starting ?? []) {
      const { data: preds } = await supabase
        .from('predictions')
        .select('guess_a, guess_b, wildcard, profiles(full_name)')
        .eq('match_id', m.id)

      const predLines = (preds ?? [])
        .map((p: any) => {
          const wc = p.wildcard ? ' ⚡' : ''
          return `   ${(p.profiles as any)?.full_name}${wc}: *${p.guess_a}×${p.guess_b}*`
        })
        .sort()

      const noPred = (preds ?? []).length === 0

      const msg = [
        '⏰ *APITO EM MINUTOS!*', '',
        `*${m.team_a}* x *${m.team_b}*`,
        `_${m.league_name}_`, '',
        '📊 *Palpites do bolão:*',
        ...(noPred ? ['   _Nenhum palpite ainda_'] : predLines),
        '',
        `${APP_URL}/palpites`,
      ].join('\n')

      await sendWA(msg)

      // Enviar também para Raniere no privado
      await fetch(
        `https://api.w-api.app/v1/message/send-text?instanceId=${WAPI_INSTANCE_ID}`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${WAPI_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: RANIERE_PHONE, message: msg }),
        }
      )
    }
    if (starting?.length) sent.push(`starting:${starting.length}`)

    // ── 3. LEMBRETE (quem não palpitou, 60–120 min antes) ───────────────────
    const { data: reminderMatches } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'pending')
      .gte('match_time', new Date(now.getTime() + 60 * 60000).toISOString())
      .lte('match_time', new Date(now.getTime() + 120 * 60000).toISOString())
      .order('match_time')

    for (const match of reminderMatches ?? []) {
      const { data: allMembers } = await supabase
        .from('league_members')
        .select('user_id, profiles(full_name, whatsapp_phone)')

      const { data: predicted } = await supabase
        .from('predictions')
        .select('user_id')
        .eq('match_id', match.id)

      const predictedIds = new Set((predicted ?? []).map((p: any) => p.user_id))
      const seen = new Set<string>()
      const missing = (allMembers ?? [])
        .filter((m: any) => !predictedIds.has(m.user_id))
        .filter((m: any) => { const ok = !seen.has(m.user_id); seen.add(m.user_id); return ok })
        .map((m: any) => ({
          name: (m.profiles as any)?.full_name ?? 'Anônimo',
          phone: (m.profiles as any)?.whatsapp_phone ?? null,
        }))

      if (!missing.length) continue

      for (const m of missing) {
        if (!m.phone) continue
        await fetch(
          `https://api.w-api.app/v1/message/send-text?instanceId=${WAPI_INSTANCE_ID}`,
          {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${WAPI_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: m.phone,
              message: [
                `⚠️ *SEM PALPITE!*`, ``,
                `*${match.team_a}* x *${match.team_b}* começa em 1h!`,
                `_${match.league_name}_`, ``,
                `👉 Corre palpitar:`,
                `${APP_URL}/palpites`,
              ].join('\n'),
            }),
          }
        )
      }
      sent.push(`reminder:${match.team_a}x${match.team_b}:${missing.length}`)
    }

    // ── 3b. CONQUISTAS não notificadas ──────────────────────────────────────
    const { data: newBadges } = await supabase
      .from('user_badges')
      .select('user_id, badge_id, badges(name, icon_url, description)')
      .eq('notified', false)

    for (const ub of newBadges ?? []) {
      const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', ub.user_id).single()
      const userName = prof?.full_name ?? 'Alguém'
      const badge = ub.badges as any
      await sendWA([
        `${badge.icon_url} *NOVA CONQUISTA!*`, ``,
        `*${userName}* desbloqueou *${badge.name}*`,
        `_${badge.description}_`,
      ].join('\n'))
      await supabase.from('user_badges').update({ notified: true })
        .eq('user_id', ub.user_id)
        .eq('badge_id', ub.badge_id)
    }
    if (newBadges?.length) sent.push(`badges:${newBadges.length}`)

    // ── 4. RESULTADO (partidas FT não notificadas) ───────────────────────────
    const { data: finished } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'FT')
      .eq('result_notified', false)

    for (const match of finished ?? []) {
      const { data: preds } = await supabase
        .from('predictions')
        .select('guess_a, guess_b, wildcard, profiles(full_name)')
        .eq('match_id', match.id)

      const predLines = (preds ?? [])
        .map(p => {
          const pts = calcPts(p, match)
          const wcTag = p.wildcard ? ' ⚡' : ''
          const icon = pts >= 3 ? '🎯' : pts >= 1 ? '✅' : '❌'
          const label = pts === 6 ? '+6 DOBRO CERTEIRO!' : pts === 3 ? '+3 CERTEIRO!' : pts === 2 ? '+2 DOBRO!' : pts === 1 ? '+1 pt' : pts === -1 ? '-1 (wildcard errado)' : '0 pts'
          return `${icon} *${(p.profiles as any)?.full_name}*${wcTag} → ${p.guess_a}×${p.guess_b} _(${label})_`
        })
        .sort()

      await sendWA([
        '🏁 *RESULTADO FINAL*', '',
        `*${match.team_a}* ${match.score_a} × ${match.score_b} *${match.team_b}*`,
        `_${match.league_name}_`, '',
        '📊 *Palpites do bolão:*',
        ...(predLines.length ? predLines : ['_Nenhum palpite registrado_']),
        '',
        '👉 Ver ranking:',
        `${APP_URL}/ligas`,
      ].join('\n'))

      await supabase.from('matches').update({ result_notified: true }).eq('id', match.id)
      sent.push(`result:${match.team_a}x${match.team_b}`)
    }

    // ── 4. RANKING DIÁRIO (03h UTC = meia-noite BRT) ─────────────────────────
    if (now.getUTCHours() === 3) {
      const { data: members } = await supabase
        .from('league_members')
        .select('user_id, total_score, profiles(full_name)')

      const agg: Record<string, { name: string; score: number }> = {}
      for (const m of members ?? []) {
        const uid = m.user_id as string
        const name = (m.profiles as any)?.full_name ?? 'Anônimo'
        if (!agg[uid]) agg[uid] = { name, score: 0 }
        agg[uid].score += m.total_score
      }

      const ranking = Object.values(agg).sort((a, b) => b.score - a.score).slice(0, 10)
      const medals = ['👑', '🥈', '🥉']
      const lines = ranking.map((r, i) =>
        `${medals[i] ?? `${i + 1}º`} *${r.name}* — ${r.score} pts`
      )

      if (lines.length) {
        await sendWA([
          '🏆 *RANKING DO BOLÃO — Atualizado!*', '',
          ...lines, '',
          '👉 Ver detalhes:',
          `${APP_URL}/ligas`,
        ].join('\n'))
        sent.push('ranking')
      }
    }

    return new Response(JSON.stringify({ ok: true, sent }), {
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
