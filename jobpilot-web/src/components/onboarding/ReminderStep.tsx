"use client"

import { useState } from "react"
import { Calendar, Clock, Bell, Sparkles, Check, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

interface ReminderStepProps {
  onSuccess: (data: any) => void
  onBack: () => void
}

export default function ReminderStep({ onSuccess, onBack }: ReminderStepProps) {
  const [reminders, setReminders] = useState({
    frequency: "Daily",
    time: "09:00 AM",
    type: ["Email", "Slack"]
  })

  const frequencies = ["Daily", "Weekly", "Real-time"]
  const times = ["08:00 AM", "09:00 AM", "12:00 PM", "05:00 PM"]
  const types = ["Email", "Slack", "Push"]

  return (
    <div className="w-full max-w-3xl mx-auto space-y-12 selection:bg-primary/10">
      <div className="grid md:grid-cols-2 gap-10">
        <div className="space-y-10">
           <div className="space-y-6">
              <div className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2 px-1">
                 <Calendar size={14} />
                 <span>Strategic Rhythm</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                 {frequencies.map(f => (
                    <button 
                       key={f}
                       onClick={() => setReminders({ ...reminders, frequency: f })}
                       className={`h-14 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all border
                        ${reminders.frequency === f ? 'bg-primary text-white border-none shadow-lg shadow-primary/20' : 'bg-surface-container-low text-muted-foreground border-border/10 hover:border-primary/20'}`}
                    >
                       {f}
                    </button>
                 ))}
              </div>
           </div>

           <div className="space-y-6">
              <div className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2 px-1">
                 <Clock size={14} />
                 <span>Temporal Window</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                 {times.map(t => (
                    <button 
                       key={t}
                       onClick={() => setReminders({ ...reminders, time: t })}
                       className={`h-14 rounded-2xl text-[11px] font-bold transition-all border
                        ${reminders.time === t ? 'bg-primary text-white border-none shadow-lg shadow-primary/20' : 'bg-surface-container-low text-muted-foreground border-border/10 hover:border-primary/20'}`}
                    >
                       {t}
                    </button>
                 ))}
              </div>
           </div>
        </div>

        <div className="space-y-8 p-10 bg-surface-container-lowest rounded-[2.5rem] border border-white shadow-sm flex flex-col justify-between overflow-hidden relative group">
           <div className="space-y-8 relative z-10">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Notification Channels</div>
              <div className="space-y-3">
                 {types.map(type => (
                    <button 
                       key={type}
                       onClick={() => {
                          const newTypes = reminders.type.includes(type) 
                             ? reminders.type.filter(t => t !== type) 
                             : [...reminders.type, type]
                          setReminders({ ...reminders, type: newTypes })
                       }}
                       className={`w-full flex items-center justify-between p-5 rounded-2xl transition-all border-2
                        ${reminders.type.includes(type) ? 'border-primary bg-primary/5 text-primary' : 'border-neutral-100 bg-surface-container-low text-muted-foreground'}`}
                    >
                       <span className="font-bold text-sm">{type}</span>
                       <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors
                        ${reminders.type.includes(type) ? 'bg-primary text-white' : 'border-neutral-200 bg-white'}`}>
                          {reminders.type.includes(type) && <Check size={14} />}
                       </div>
                    </button>
                 ))}
              </div>
           </div>

           <div className="p-5 bg-tertiary-container/10 rounded-2xl space-y-2 relative group mt-auto">
              <div className="text-[11px] font-bold text-tertiary-container flex items-center gap-2 mb-2 italic">
                 <Sparkles size={12} className="match-pulse after:bg-tertiary-container/30" />
                 <span>Agent Recommendation</span>
              </div>
              <p className="text-[10px] leading-relaxed font-bold opacity-60">
                 Our system suggests <span className="font-data">09:00 AM</span> delivery to ensure your application enters recruiter queues as they log in.
              </p>
           </div>
           
           <div className="absolute top-0 right-0 w-40 h-40 signature-gradient rounded-full blur-[80px] opacity-10 group-hover:scale-110 transition-transform duration-1000" />
        </div>
      </div>

      <div className="flex justify-end gap-12 pt-8">
         <Button 
            onClick={() => onSuccess(reminders)} 
            className="w-full md:w-auto signature-gradient h-16 px-12 rounded-2xl text-md font-bold shadow-2xl shadow-primary/20 hover:scale-[1.02] transition-all"
         >
            Finalize Synchronization <ArrowRight size={20} className="ml-3" />
         </Button>
      </div>
    </div>
  )
}
