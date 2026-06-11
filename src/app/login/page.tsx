"use client"

export const dynamic = 'force-dynamic'

import { useState, Suspense } from "react"
import { supabase } from "@/lib/supabase"
import { motion } from "framer-motion"
import { Trophy, Mail, Lock, Loader2, ArrowRight, Star } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [nickname, setNickname] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/'

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (isSignUp) {
        if (!nickname.trim()) throw new Error("Escolha um Nick para o Bolão!")
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: nickname, username: nickname } },
        })
        if (error) throw error
        router.push(redirectTo)
        router.refresh()
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push(redirectTo)
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-8"
      >
        {/* Hero */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex gap-1.5 mb-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className="h-3 w-3 fill-yellow-400 text-yellow-400"
                style={{ filter: "drop-shadow(0 0 5px rgba(255,193,7,0.8))" }}
              />
            ))}
          </div>
          <div
            className="h-24 w-24 rounded-[1.75rem] flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(255,193,7,0.18) 0%, rgba(255,140,0,0.1) 100%)",
              border: "1px solid rgba(255,193,7,0.3)",
              boxShadow: "0 0 40px rgba(255,193,7,0.15)",
            }}
          >
            <Trophy
              className="h-14 w-14"
              style={{ color: "#FFC107", filter: "drop-shadow(0 0 16px rgba(255,193,7,0.7))" }}
            />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">Bolão dos Crias</h1>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] mt-1" style={{ color: "rgba(255,193,7,0.7)" }}>
              Copa do Mundo · 2026
            </p>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleAuth}
          className="p-8 rounded-[2.5rem] space-y-6"
          style={{
            background: "rgba(0, 45, 18, 0.52)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(0,190,80,0.12)",
          }}
        >
          {error && (
            <div className="bg-red-500/10 text-red-400 text-xs font-bold p-3 rounded-xl border border-red-500/20">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Seu Nick (Apelido)
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-xs text-muted-foreground">@</div>
                  <input
                    type="text"
                    required
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Ex: NeymarDosCria"
                    className="w-full h-14 rounded-2xl pl-12 pr-4 focus:outline-none transition-all text-white placeholder:text-muted-foreground/50"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(0,190,80,0.15)",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.border = "1.5px solid rgba(255,193,7,0.5)"
                      e.currentTarget.style.boxShadow = "0 0 16px rgba(255,193,7,0.1)"
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.border = "1px solid rgba(0,190,80,0.15)"
                      e.currentTarget.style.boxShadow = "none"
                    }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full h-14 rounded-2xl pl-12 pr-4 focus:outline-none transition-all text-white placeholder:text-muted-foreground/50"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(0,190,80,0.15)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.border = "1.5px solid rgba(255,193,7,0.5)"
                    e.currentTarget.style.boxShadow = "0 0 16px rgba(255,193,7,0.1)"
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.border = "1px solid rgba(0,190,80,0.15)"
                    e.currentTarget.style.boxShadow = "none"
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-14 rounded-2xl pl-12 pr-4 focus:outline-none transition-all text-white placeholder:text-muted-foreground/50"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(0,190,80,0.15)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.border = "1.5px solid rgba(255,193,7,0.5)"
                    e.currentTarget.style.boxShadow = "0 0 16px rgba(255,193,7,0.1)"
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.border = "1px solid rgba(0,190,80,0.15)"
                    e.currentTarget.style.boxShadow = "none"
                  }}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #FFC107 0%, #FF8F00 100%)",
              color: "#0a1f0d",
              boxShadow: "0 4px 24px rgba(255,193,7,0.35)",
            }}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                {isSignUp ? "Criar Conta" : "Entrar no Jogo"}
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full text-xs font-bold text-muted-foreground hover:text-green-400 transition-colors"
          >
            {isSignUp ? "Já tem uma conta? Entre aqui" : "Não tem conta? Cadastre-se agora"}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
