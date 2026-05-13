"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Trophy, Send, User } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { name: "Início", href: "/", icon: Home },
  { name: "Palpites", href: "/palpites", icon: Send },
  { name: "Ligas", href: "/ligas", icon: Trophy },
  { name: "Perfil", href: "/perfil", icon: User },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-white/10 bg-black/80 backdrop-blur-xl px-4 pb-safe">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href))

        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 transition-all duration-200",
              isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-6 w-6" />
            <span className="text-[10px] font-medium">{item.name}</span>
            {isActive && (
              <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-primary" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
