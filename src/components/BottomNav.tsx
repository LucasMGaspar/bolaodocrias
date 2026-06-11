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
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t px-2 pb-safe"
      style={{
        background: "rgba(0, 12, 5, 0.94)",
        backdropFilter: "blur(20px)",
        borderColor: "rgba(0, 190, 80, 0.12)",
      }}
    >
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname?.startsWith(item.href))

        return (
          <Link
            key={item.name}
            href={item.href}
            className="relative flex flex-col items-center justify-center gap-1 px-4 py-1.5 rounded-xl transition-all duration-200"
          >
            {isActive && (
              <div
                className="absolute inset-0 rounded-xl"
                style={{ background: "rgba(255, 193, 7, 0.07)" }}
              />
            )}
            <Icon
              className={cn("h-5 w-5 relative z-10 transition-all", isActive ? "scale-110" : "text-muted-foreground")}
              style={
                isActive
                  ? { color: "#FFC107", filter: "drop-shadow(0 0 7px rgba(255,193,7,0.55))" }
                  : undefined
              }
            />
            <span
              className={cn("text-[10px] font-bold relative z-10", isActive ? "" : "text-muted-foreground")}
              style={isActive ? { color: "#FFC107" } : undefined}
            >
              {item.name}
            </span>
            {isActive && (
              <span
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full"
                style={{
                  background: "#FFC107",
                  boxShadow: "0 0 8px rgba(255,193,7,0.8)",
                }}
              />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
