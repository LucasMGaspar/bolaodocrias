import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Bolão da Copa - Realtime",
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
        <main className="pb-20 px-4 pt-6 max-w-md mx-auto min-h-screen">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
