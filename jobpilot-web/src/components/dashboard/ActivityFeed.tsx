"use client"

import { Card } from "@/components/ui/card"
import { Search, Mail, FileText, Calendar, CheckCircle2 } from "lucide-react"

export default function ActivityFeed() {
  const activities: any[] = [] // Empty for clean slate

  return (
    <Card className="p-6 bg-surface-container-low border-none shadow-none rounded-2xl">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface/60">Agent Activity</h3>
        <div className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest">Live</div>
      </div>

      <div className="space-y-8 relative">
        {activities.length > 0 && <div className="absolute left-5 top-2 bottom-2 w-px bg-on-surface/5" />}
        
        {activities.map((act, i) => (
          <div key={i} className="flex gap-4 relative z-10 animate-in fade-in slide-in-from-right-4 duration-500" style={{ animationDelay: `${i*100}ms` }}>
            <div className="w-10 h-10 rounded-xl bg-surface-container-lowest flex items-center justify-center text-muted-foreground shadow-sm">
                {act.icon}
            </div>
            <div className="flex-1 min-w-0">
               <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground truncate">{act.agent}</span>
                  <span className="text-[10px] font-bold text-neutral-400 whitespace-nowrap">{act.time}</span>
               </div>
               <p className="text-[11px] font-bold text-on-surface leading-snug">{act.desc}</p>
            </div>
          </div>
        ))}

        {activities.length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 opacity-30">
             <div className="w-12 h-12 rounded-full border-2 border-dashed border-on-surface/20 flex items-center justify-center">
                <Search size={16} />
             </div>
             <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">
               Waiting for Agent <br/> Node Activity
             </p>
          </div>
        )}
      </div>
    </Card>
  )
}
