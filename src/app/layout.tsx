import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { Trophy } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Bolão dos Crias · Copa 2026",
  description: "Dê seus palpites e ganhe pontos em tempo real!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <div
          className="fixed top-0 left-0 right-0 z-50 h-10 flex items-center justify-center gap-2.5 border-b"
          style={{
            background: "linear-gradient(90deg, rgba(0,35,12,0.97) 0%, rgba(0,55,18,0.99) 50%, rgba(0,35,12,0.97) 100%)",
            borderColor: "rgba(255,193,7,0.18)",
          }}
        >
          <Trophy
            className="h-3.5 w-3.5 text-yellow-400"
            style={{ filter: "drop-shadow(0 0 6px rgba(255,193,7,0.6))" }}
          />
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-400/90">
            Copa do Mundo 2026
          </span>
          <Trophy
            className="h-3.5 w-3.5 text-yellow-400"
            style={{ filter: "drop-shadow(0 0 6px rgba(255,193,7,0.6))" }}
          />
        </div>
        <main className="pb-20 px-4 pt-14 max-w-md mx-auto min-h-screen">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
