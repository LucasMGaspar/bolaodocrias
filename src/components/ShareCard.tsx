"use client"

import { useRef, useState } from "react"
import { X, Download, Share2, Loader2 } from "lucide-react"

interface ShareCardProps {
  match: {
    team_a: string
    team_b: string
    team_a_logo: string
    team_b_logo: string
    score_a?: number
    score_b?: number
    league_name: string
  }
  prediction: { score_a: number; score_b: number } | null
  points: number | null
  onClose: () => void
}

function TeamLogo({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false)
  if (failed || !src) {
    return (
      <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black"
        style={{ background: "rgba(255,255,255,0.1)" }}>
        {name?.[0]}
      </div>
    )
  }
  return (
    <img src={src} alt={name} className="w-16 h-16 object-contain drop-shadow-lg"
      onError={() => setFailed(true)} crossOrigin="anonymous" />
  )
}

export function ShareCard({ match, prediction, points, onClose }: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [sharing, setSharing] = useState(false)

  const pointsConfig = points === 3
    ? { icon: "🎯", label: "CERTEIRO!", color: "#4ade80", bg: "rgba(34,197,94,0.2)" }
    : points === 1
    ? { icon: "✅", label: "+1 PONTO", color: "#60a5fa", bg: "rgba(59,130,246,0.2)" }
    : { icon: "❌", label: "ERROU", color: "#f87171", bg: "rgba(239,68,68,0.15)" }

  async function handleShare() {
    if (!cardRef.current) return
    setSharing(true)
    try {
      const { toPng } = await import("html-to-image")
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true })

      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], "palpite.png", { type: "image/png" })

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Meu palpite no Bolão!" })
      } else {
        const a = document.createElement("a")
        a.href = dataUrl
        a.download = "palpite.png"
        a.click()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSharing(false)
    }
  }

  async function handleDownload() {
    if (!cardRef.current) return
    setSharing(true)
    try {
      const { toPng } = await import("html-to-image")
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true })
      const a = document.createElement("a")
      a.href = dataUrl
      a.download = "palpite.png"
      a.click()
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
      onClick={onClose}>
      <div className="w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>

        {/* Card que será exportado */}
        <div ref={cardRef} className="rounded-3xl overflow-hidden p-6 space-y-5"
          style={{
            background: "linear-gradient(145deg, #001a08 0%, #002e10 50%, #001a08 100%)",
            border: "1px solid rgba(0,190,80,0.2)",
            fontFamily: "system-ui, sans-serif",
          }}>

          {/* Header */}
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.3em]"
              style={{ color: "rgba(255,193,7,0.7)" }}>
              {match.league_name}
            </p>
          </div>

          {/* Placar */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col items-center gap-2 flex-1">
              <TeamLogo src={match.team_a_logo} name={match.team_a} />
              <span className="text-xs font-black text-center uppercase leading-tight text-white">
                {match.team_a}
              </span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-3">
                <span className="text-4xl font-black text-white">{match.score_a}</span>
                <span className="text-lg font-black" style={{ color: "rgba(255,255,255,0.3)" }}>×</span>
                <span className="text-4xl font-black text-white">{match.score_b}</span>
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded"
                style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }}>
                RESULTADO FINAL
              </span>
            </div>

            <div className="flex flex-col items-center gap-2 flex-1">
              <TeamLogo src={match.team_b_logo} name={match.team_b} />
              <span className="text-xs font-black text-center uppercase leading-tight text-white">
                {match.team_b}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "rgba(0,190,80,0.15)" }} />

          {/* Palpite + Pontos */}
          <div className="space-y-3">
            {prediction && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider"
                  style={{ color: "rgba(255,255,255,0.4)" }}>
                  Meu palpite
                </span>
                <span className="text-sm font-black" style={{ color: "#FFC107" }}>
                  {prediction.score_a} × {prediction.score_b}
                </span>
              </div>
            )}

            {points !== null && (
              <div className="flex items-center justify-center gap-2 py-2 rounded-2xl"
                style={{ background: pointsConfig.bg, border: `1px solid ${pointsConfig.color}30` }}>
                <span className="text-xl">{pointsConfig.icon}</span>
                <span className="font-black text-sm" style={{ color: pointsConfig.color }}>
                  {points === 3 ? "+3 PONTOS — " : points === 1 ? "+1 PONTO — " : ""}
                  {pointsConfig.label}
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
          <p className="text-center text-[9px] font-bold"
            style={{ color: "rgba(255,255,255,0.2)" }}>
            bolaodocrias.vercel.app
          </p>
        </div>

        {/* Botões */}
        <div className="flex gap-3">
          <button onClick={handleDownload} disabled={sharing}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-black"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}>
            <Download className="h-4 w-4" />
            Salvar
          </button>
          <button onClick={handleShare} disabled={sharing}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-black"
            style={{ background: "linear-gradient(135deg, #FFC107, #FF8F00)", color: "#000" }}>
            {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            Compartilhar
          </button>
        </div>

        <button onClick={onClose}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs"
          style={{ color: "rgba(255,255,255,0.3)" }}>
          <X className="h-3 w-3" /> Fechar
        </button>
      </div>
    </div>
  )
}
