"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Copy, Check, ExternalLink, Users, Briefcase, Sparkles, Zap, MessageSquare } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const networkContacts: any[] = []

export default function NetworkPage() {
  const [copied, setCopied] = useState<number | null>(null)

  const copyRefMessage = (id: number) => {
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-surface transition-all duration-300">
      <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
         <div className="space-y-2">
            <h1 className="text-4xl font-bold text-on-surface tracking-tight">Outreach Catalog.</h1>
            <p className="text-muted-foreground font-medium tracking-tight">Catalyst Agents are currently monitoring <span className="font-data text-primary text-xl">0</span> high-value nodes.</p>
         </div>
         <div className="flex gap-4">
            <Button variant="ghost" className="h-12 px-6 rounded-xl font-bold text-sm hover:bg-surface-container-low no-line">Node Audit</Button>
            <Button className="signature-gradient h-12 px-8 rounded-xl font-bold text-sm shadow-xl shadow-primary/10 hover:opacity-90">Inject Manual Contact</Button>
         </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-10">
        {/* Contact Intelligence List */}
        <div className="lg:col-span-8 space-y-6">
           {networkContacts.length === 0 && (
             <div className="p-20 rounded-[3rem] bg-surface-container-low/30 border-2 border-dashed border-on-surface/5 flex flex-col items-center justify-center text-center space-y-6 opacity-30">
                <div className="w-20 h-20 rounded-full bg-surface-container-low flex items-center justify-center text-muted-foreground">
                   <Users size={32} />
                </div>
                <div className="space-y-2">
                   <h3 className="text-xl font-bold tracking-tight">No Outreach Nodes.</h3>
                   <p className="text-xs font-bold uppercase tracking-[0.2em] max-w-xs mx-auto">Upload a resume and start a job search to discover key recruiters and engineers automatically.</p>
                </div>
             </div>
           )}
        </div>

        {/* Intelligence Sidebar */}
        <div className="lg:col-span-4 space-y-8 h-fit lg:sticky lg:top-8 animate-in fade-in slide-in-from-right-6 duration-1000">
           <Card className="p-10 signature-gradient text-white border-none shadow-2xl shadow-primary/20 relative overflow-hidden group rounded-[2.5rem]">
              <div className="relative z-10 space-y-10">
                 <div className="space-y-4">
                    <h3 className="font-bold text-xs uppercase tracking-[0.2em] opacity-80">Sync Efficiency</h3>
                    <div className="flex items-baseline gap-2">
                       <span className="text-7xl font-data font-bold tracking-tighter italic">0</span>
                       <span className="text-sm font-bold uppercase opacity-60 tracking-widest">%</span>
                    </div>
                 </div>
                 
                 <div className="space-y-4">
                    <div className="p-5 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10 text-[11px] leading-relaxed font-bold italic">
                      Identify and bridge with recruiters effortlessly. Your agent nodes will list high-value contacts here once search begins.
                    </div>
                   <Button className="w-full bg-surface-container-lowest text-primary hover:bg-white hover:translate-y-[-2px] h-14 rounded-2xl font-bold text-sm shadow-xl shadow-black/10 transition-all border-none">
                      Execute Recommendation
                   </Button>
                 </div>
              </div>
              <Users size={200} className="absolute -bottom-20 -right-20 text-white/5 group-hover:scale-110 transition-all duration-1000 group-hover:rotate-12" />
           </Card>

           <div className="p-10 bg-surface-container-lowest rounded-[2.5rem] border border-white shadow-sm space-y-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <Briefcase size={18} className="text-primary" />
                   <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Regional Impact</h3>
                </div>
                <Zap size={16} className="text-warning match-pulse after:bg-warning/20" />
              </div>
              
              <div className="space-y-8">
                 <div className="py-8 text-center opacity-30">
                    <p className="text-[10px] font-bold uppercase tracking-widest italic">Node data pending</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}
