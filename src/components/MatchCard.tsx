"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Calendar, Lock, Loader2, Users } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface MatchCardProps {
  match: any
  prediction: any
  othersPredictions?: any[]
  onPredict: (match_id: number, score_a: number, score_b: number) => Promise<void>
}

export function MatchCard({ match, prediction, othersPredictions = [], onPredict }: MatchCardProps) {
  const [saving, setSaving] = useState(false)
  const [showOthers, setShowOthers] = useState(false)
  const isExpired = new Date(match.match_time) < new Date()

  const [localA, setLocalA] = useState(prediction?.score_a?.toString() ?? "0")
  const [localB, setLocalB] = useState(prediction?.score_b?.toString() ?? "0")

  // Sincroniza apenas se o valor no banco mudar e for diferente do local
  useEffect(() => {
    if (prediction) {
      const scoreA = prediction.score_a?.toString() ?? "0"
      const scoreB = prediction.score_b?.toString() ?? "0"
      if (!saving) {
        setLocalA(scoreA)
        setLocalB(scoreB)
      }
    }
  }, [prediction, saving])

  const handleScoreChange = async (valA: string, valB: string) => {
    const sA = valA === "" ? 0 : parseInt(valA)
    const sB = valB === "" ? 0 : parseInt(valB)
    
    setSaving(true)
    await onPredict(match.id, sA, sB)
    setSaving(false)
  }

  const hasChanged = !prediction || 
    localA !== (prediction.score_a?.toString() ?? "0") || 
    localB !== (prediction.score_b?.toString() ?? "0")

  return (
    <motion.div
      layout
      className="glass p-4 rounded-[2rem] space-y-4 relative overflow-hidden"
    >
      <div className="flex justify-between items-center px-2">
        <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
          <Calendar className="h-3 w-3" />
          {new Date(match.match_time).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="bg-primary/10 text-primary text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-widest">
          {match.league_name || 'Liga'}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col items-center gap-2 flex-1 text-center">
          <div className="h-14 w-14 bg-white/5 rounded-2xl flex items-center justify-center p-2">
            <img src={match.team_a_logo} alt={match.team_a} className="max-w-full max-h-full object-contain" />
          </div>
          <span className="text-[10px] font-black uppercase truncate w-full">{match.team_a}</span>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 relative">
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                value={localA}
                onChange={(e) => setLocalA(e.target.value)}
                onFocus={(e) => e.target.value === "0" && setLocalA("")}
                onBlur={(e) => e.target.value === "" && setLocalA("0")}
                disabled={isExpired || saving}
                className="w-14 h-14 bg-white/10 border border-white/20 rounded-2xl text-center text-xl font-black text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all disabled:opacity-50"
              />
              <span className="text-muted-foreground font-black italic text-xs">X</span>
              <input
                type="number"
                min="0"
                value={localB}
                onChange={(e) => setLocalB(e.target.value)}
                onFocus={(e) => e.target.value === "0" && setLocalB("")}
                onBlur={(e) => e.target.value === "" && setLocalB("0")}
                disabled={isExpired || saving}
                className="w-14 h-14 bg-white/10 border border-white/20 rounded-2xl text-center text-xl font-black text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all disabled:opacity-50"
              />
            </div>
          </div>

          {!isExpired && (
            <button
              onClick={() => handleScoreChange(localA, localB)}
              disabled={saving || !hasChanged}
              className={cn(
                "px-6 py-2 text-[10px] font-black uppercase rounded-xl transition-all flex items-center gap-2",
                hasChanged 
                  ? "bg-primary text-white shadow-lg shadow-primary/40 scale-105" 
                  : "bg-white/5 text-muted-foreground opacity-50 cursor-not-allowed"
              )}
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : (prediction ? 'Atualizar' : 'Salvar Palpite')}
            </button>
          )}
        </div>

        <div className="flex flex-col items-center gap-2 flex-1 text-center">
          <div className="h-14 w-14 bg-white/5 rounded-2xl flex items-center justify-center p-2">
            <img src={match.team_b_logo} alt={match.team_b} className="max-w-full max-h-full object-contain" />
          </div>
          <span className="text-[10px] font-black uppercase truncate w-full">{match.team_b}</span>
        </div>
      </div>

      {isExpired && (
        <div className="bg-black/40 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-bold text-yellow-500 uppercase tracking-widest border border-yellow-500/20">
          <Lock className="h-3 w-3" />
          Mercado Fechado
        </div>
      )}

      {/* Seção de Palpites dos Amigos */}
      <div className="pt-2 border-t border-white/5">
        <button
          onClick={() => setShowOthers(!showOthers)}
          className="w-full flex items-center justify-center gap-2 text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors py-1 uppercase tracking-widest"
        >
          <Users className="h-3 w-3" />
          {showOthers ? 'Esconder Palpites' : `Ver Palpites da Galera (${othersPredictions.length})`}
        </button>

        <AnimatePresence>
          {showOthers && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-2 pt-3"
            >
              {othersPredictions.length > 0 ? othersPredictions.map((op: any) => (
                <div key={op.user_id} className="flex items-center justify-between bg-white/5 p-2 px-4 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2">
                    <img
                      src={op.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${op.user_id}`}
                      className="h-5 w-5 rounded-full"
                    />
                    <span className="text-[10px] font-bold truncate max-w-[100px]">{op.profiles?.full_name || 'Amigo'}</span>
                  </div>
                  <div className="text-xs font-black text-primary">
                    {op.score_a} x {op.score_b}
                  </div>
                </div>
              )) : (
                <p className="text-[9px] text-center text-muted-foreground italic">Ninguém palpitou ainda.</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
