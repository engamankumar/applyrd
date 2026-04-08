import type { Metadata } from "next"
import { Inter, Geist, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import Providers from "@/components/providers"
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });
const inter = Inter({ subsets: ["latin"] })
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "Applyrd — AI-Powered Job Hunt Companion",
  description: "Automate your job hunt with multi-agent AI. Tailor resumes, find referrals, and track applications in one place.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("h-full antialiased", "font-sans", geist.variable, jetbrains.variable)} suppressHydrationWarning>
      <body className={`${inter.className} min-h-full flex flex-col bg-surface text-on-surface`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
