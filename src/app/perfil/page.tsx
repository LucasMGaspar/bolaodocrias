"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { User, Mail, LogOut, Check, Loader2, Image as ImageIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

export default function PerfilPage() {
  const [profile, setProfile] = useState<any>(null)
  const [fullName, setFullName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [userBadges, setUserBadges] = useState<any[]>([])
  const [allBadges, setAllBadges] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchProfileData()
  }, [])

  async function fetchProfileData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (profileData) {
      setProfile(profileData)
      setFullName(profileData.full_name || "")
      setAvatarUrl(profileData.avatar_url || "")
    }

    const { data: badgesData } = await supabase.from('badges').select('*')
    if (badgesData) setAllBadges(badgesData)

    const { data: earnedData } = await supabase.from('user_badges').select('*').eq('user_id', user.id)
    if (earnedData) setUserBadges(earnedData)

    setLoading(false)
  }

  async function handleUpdateProfile() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (error) {
      alert("Erro ao atualizar: " + error.message)
    } else {
      alert("Perfil atualizado!")
      fetchProfileData()
    }
    setSaving(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary" /></div>

  return (
    <div className="space-y-8 pb-20">
      <header>
        <h1 className="text-2xl font-bold">Seu Perfil</h1>
        <p className="text-sm text-muted-foreground">Gerencie sua conta e avatar</p>
      </header>

      <div className="flex flex-col items-center gap-4 py-6">
        <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-primary shadow-xl shadow-primary/20 bg-white/5 flex items-center justify-center">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <User className="h-10 w-10 text-muted-foreground" />
          )}
        </div>
      </div>

      <div className="glass p-6 rounded-3xl space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Nome Completo</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Seu nome"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Link da Foto (URL)</label>
          <div className="relative">
            <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary text-xs"
              placeholder="https://exemplo.com/foto.jpg"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">E-mail</label>
          <div className="relative opacity-50">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              disabled
              value={profile?.email || ""}
              className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 cursor-not-allowed"
            />
          </div>
        </div>

        <button 
          onClick={handleUpdateProfile}
          disabled={saving}
          className="w-full h-12 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Salvar Alterações
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-black uppercase tracking-widest">Suas Conquistas</h2>
          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{userBadges.length} desbloqueadas</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {allBadges.map((badge: any) => {
            const isUnlocked = userBadges.some(ub => ub.badge_id === badge.id)
            return (
              <div 
                key={badge.id}
                className={cn(
                  "glass p-4 rounded-3xl flex flex-col items-center text-center gap-2 transition-all",
                  !isUnlocked && "opacity-40 grayscale"
                )}
              >
                <div className="text-3xl mb-1">{badge.icon_url}</div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-tight">{badge.name}</p>
                  <p className="text-[8px] text-muted-foreground leading-tight">{badge.description}</p>
                </div>
                {!isUnlocked && (
                  <div className="mt-1 text-[7px] font-bold bg-white/5 px-2 py-0.5 rounded-full uppercase">Bloqueado</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <button 
        onClick={handleSignOut}
        className="w-full h-12 border border-red-500/20 text-red-500 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-500/5 transition-all"
      >
        <LogOut className="h-4 w-4" />
        Sair da Conta
      </button>
    </div>
  )
}
