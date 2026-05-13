"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { motion } from "framer-motion"
import { Trophy, Mail, Lock, Loader2, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: email.split('@')[0],
            }
          }
        })
        if (error) throw error
        alert("Verifique seu e-mail para confirmar o cadastro!")
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push("/")
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-8"
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-20 w-20 bg-primary/20 rounded-3xl flex items-center justify-center text-primary shadow-2xl shadow-primary/20">
            <Trophy className="h-12 w-12" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">Bolão dos Cria</h1>
            <p className="text-muted-foreground text-sm">Entre para dar seus palpites</p>
          </div>
        </div>

        <form onSubmit={handleAuth} className="glass p-8 rounded-[2.5rem] space-y-6 border-white/10">
          {error && (
            <div className="bg-destructive/10 text-destructive text-xs font-bold p-3 rounded-xl border border-destructive/20">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                />
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/30 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <>
                {isSignUp ? "Criar Conta" : "Entrar no Jogo"}
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>

          <button 
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
          >
            {isSignUp ? "Já tem uma conta? Entre aqui" : "Não tem conta? Cadastre-se agora"}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
