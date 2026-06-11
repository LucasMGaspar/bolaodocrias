"use client"

import { useEffect, useState } from "react"
import { Calendar, Lock, Loader2, Users } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

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

  useEffect(() => {
    if (prediction && !saving) {
      setLocalA(prediction.score_a?.toString() ?? "0")
      setLocalB(prediction.score_b?.toString() ?? "0")
    }
  }, [prediction, saving])

  const handleScoreChange = async (valA: string, valB: string) => {
    const sA = valA === "" ? 0 : parseInt(valA)
    const sB = valB === "" ? 0 : parseInt(valB)
    setSaving(true)
    await onPredict(match.id, sA, sB)
    setSaving(false)
  }

  const hasChanged =
    !prediction ||
    localA !== (prediction.score_a?.toString() ?? "0") ||
    localB !== (prediction.score_b?.toString() ?? "0")

  const isCopa = match.league_name === "FIFA World Cup"

  return (
    <motion.div
      layout
      className="rounded-[2rem] space-y-4 relative overflow-hidden p-4"
      style={{
        background: isCopa
          ? "linear-gradient(145deg, rgba(0,75,28,0.55) 0%, rgba(0,35,10,0.8) 100%)"
          : "rgba(0, 45, 18, 0.48)",
        border: isCopa
          ? "1px solid rgba(255,193,7,0.18)"
          : "1px solid rgba(0,190,80,0.1)",
        backdropFilter: "blur(14px)",
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
          <Calendar className="h-3 w-3" />
          {new Date(match.match_time).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
        <div
          className="text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest"
          style={
            isCopa
              ? {
                  background: "rgba(255,193,7,0.12)",
                  border: "1px solid rgba(255,193,7,0.3)",
                  color: "#FFC107",
                }
              : {
                  background: "rgba(0,190,80,0.1)",
                  border: "1px solid rgba(0,190,80,0.2)",
                  color: "rgba(74,222,128,0.9)",
                }
          }
        >
          {isCopa ? "Copa 2026" : match.league_name || "Liga"}
        </div>
      </div>

      {/* Teams + Inputs */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col items-center gap-2 flex-1 text-center">
          <div
            className="h-14 w-14 rounded-2xl flex items-center justify-center p-2"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <img
              src={match.team_a_logo}
              alt={match.team_a}
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none"
                ;(e.currentTarget.nextSibling as HTMLElement)?.style.setProperty("display", "flex")
              }}
            />
            <span style={{ display: "none" }} className="text-lg font-black text-muted-foreground">
              {match.team_a?.[0]}
            </span>
          </div>
          <span className="text-[10px] font-black uppercase truncate w-full">{match.team_a}</span>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={localA}
              onChange={(e) => setLocalA(e.target.value)}
              onFocus={(e) => e.target.value === "0" && setLocalA("")}
              onBlur={(e) => e.target.value === "" && setLocalA("0")}
              disabled={isExpired || saving}
              className="w-14 h-14 rounded-2xl text-center text-xl font-black text-white focus:outline-none transition-all disabled:opacity-50"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
              onFocusCapture={(e) => {
                e.currentTarget.style.border = "1.5px solid rgba(255,193,7,0.7)"
                e.currentTarget.style.boxShadow = "0 0 12px rgba(255,193,7,0.2)"
              }}
              onBlurCapture={(e) => {
                e.currentTarget.style.border = "1px solid rgba(255,255,255,0.15)"
                e.currentTarget.style.boxShadow = "none"
              }}
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
              className="w-14 h-14 rounded-2xl text-center text-xl font-black text-white focus:outline-none transition-all disabled:opacity-50"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
              onFocusCapture={(e) => {
                e.currentTarget.style.border = "1.5px solid rgba(255,193,7,0.7)"
                e.currentTarget.style.boxShadow = "0 0 12px rgba(255,193,7,0.2)"
              }}
              onBlurCapture={(e) => {
                e.currentTarget.style.border = "1px solid rgba(255,255,255,0.15)"
                e.currentTarget.style.boxShadow = "none"
              }}
            />
          </div>

          {!isExpired && (
            <button
              onClick={() => handleScoreChange(localA, localB)}
              disabled={saving || !hasChanged}
              className={cn(
                "px-5 py-2 text-[10px] font-black uppercase rounded-xl transition-all flex items-center gap-2",
                hasChanged && !saving
                  ? "scale-105"
                  : "opacity-40 cursor-not-allowed"
              )}
              style={
                hasChanged && !saving
                  ? {
                      background: "linear-gradient(135deg, #FFC107 0%, #FF8F00 100%)",
                      color: "#0a1f0d",
                      boxShadow: "0 4px 16px rgba(255,193,7,0.35)",
                    }
                  : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }
              }
            >
              {saving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : prediction ? (
                "Atualizar"
              ) : (
                "Salvar Palpite"
              )}
            </button>
          )}
        </div>

        <div className="flex flex-col items-center gap-2 flex-1 text-center">
          <div
            className="h-14 w-14 rounded-2xl flex items-center justify-center p-2"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <img
              src={match.team_b_logo}
              alt={match.team_b}
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none"
                ;(e.currentTarget.nextSibling as HTMLElement)?.style.setProperty("display", "flex")
              }}
            />
            <span style={{ display: "none" }} className="text-lg font-black text-muted-foreground">
              {match.team_b?.[0]}
            </span>
          </div>
          <span className="text-[10px] font-black uppercase truncate w-full">{match.team_b}</span>
        </div>
      </div>

      {/* Mercado fechado */}
      {isExpired && (
        <div
          className="flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest"
          style={{
            background: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,193,7,0.18)",
            color: "rgba(255,193,7,0.8)",
          }}
        >
          <Lock className="h-3 w-3" />
          Mercado Fechado
        </div>
      )}

      {/* Palpites da galera */}
      <div className="pt-1 border-t" style={{ borderColor: "rgba(0,190,80,0.08)" }}>
        <button
          onClick={() => setShowOthers(!showOthers)}
          className="w-full flex items-center justify-center gap-2 text-[10px] font-bold text-muted-foreground hover:text-green-400 transition-colors py-1 uppercase tracking-widest"
        >
          <Users className="h-3 w-3" />
          {showOthers
            ? "Esconder Palpites"
            : `Ver Palpites da Galera (${othersPredictions.length})`}
        </button>

        <AnimatePresence>
          {showOthers && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-2 pt-3"
            >
              {othersPredictions.length > 0 ? (
                othersPredictions.map((op: any) => (
                  <div
                    key={op.user_id}
                    className="flex items-center justify-between p-2 px-4 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,190,80,0.07)" }}
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={
                          op.profiles?.avatar_url ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${op.user_id}`
                        }
                        className="h-5 w-5 rounded-full"
                      />
                      <span className="text-[10px] font-bold truncate max-w-[100px]">
                        {op.profiles?.full_name || "Amigo"}
                      </span>
                    </div>
                    <div className="text-xs font-black" style={{ color: "#FFC107" }}>
                      {isExpired ? (
                        `${op.guess_a ?? op.score_a} x ${op.guess_b ?? op.score_b}`
                      ) : (
                        <div className="flex items-center gap-1 opacity-40">
                          <Lock className="h-2.5 w-2.5" />
                          <span className="text-[10px]">?? x ??</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[9px] text-center text-muted-foreground italic">
                  Ninguém palpitou ainda.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
