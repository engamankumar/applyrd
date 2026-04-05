"use client"

import { useState } from "react"
import { Check, Sparkles, ArrowRight, Briefcase, MapPin, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { motion } from "framer-motion"

interface PreferencesStepProps {
  onSuccess: (data: any) => void
  onBack: () => void
}

export default function PreferencesStep({ onSuccess, onBack }: PreferencesStepProps) {
  const [preferences, setPreferences] = useState({
    title: "",
    location: "Remote",
    salary: "120k",
    type: "Full-time"
  })

  const jobTypes = ["Full-time", "Contract", "Freelance", "Part-time"]

  return (
    <div className="w-full max-w-3xl mx-auto space-y-10 selection:bg-primary/10">
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
           <div className="space-y-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2 px-1">
                 <Briefcase size={14} />
                 <span>Strategic Target</span>
              </div>
              <Input 
                 placeholder="e.g. Senior Frontend Engineer" 
                 value={preferences.title}
                 onChange={(e) => setPreferences({ ...preferences, title: e.target.value })}
                 className="h-16 px-6 bg-surface-container-low border-none rounded-2xl font-bold text-lg placeholder:text-muted-foreground/30 focus-visible:ring-1 focus-visible:ring-primary/20"
              />
           </div>

           <div className="space-y-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2 px-1">
                 <MapPin size={14} />
                 <span>Geographic Scope</span>
              </div>
              <Input 
                 placeholder="City, Region or 'Remote'" 
                 value={preferences.location}
                 onChange={(e) => setPreferences({ ...preferences, location: e.target.value })}
                 className="h-14 px-6 bg-surface-container-low border-none rounded-2xl font-bold text-md placeholder:text-muted-foreground/30 focus-visible:ring-1 focus-visible:ring-primary/20"
              />
           </div>

           <div className="space-y-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2 px-1">
                 <DollarSign size={14} />
                 <span>Capital Requirements</span>
              </div>
              <Input 
                 placeholder="Minimum Annual Comp (e.g. 150k)" 
                 value={preferences.salary}
                 onChange={(e) => setPreferences({ ...preferences, salary: e.target.value })}
                 className="h-14 px-6 bg-surface-container-low border-none rounded-2xl font-bold text-md placeholder:text-muted-foreground/30 focus-visible:ring-1 focus-visible:ring-primary/20"
              />
           </div>
        </div>

        <div className="space-y-8 p-8 bg-surface-container-lowest rounded-[2.5rem] border border-white shadow-sm flex flex-col justify-between">
           <div className="space-y-6">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Engagement Model</div>
              <div className="grid grid-cols-2 gap-3">
                 {jobTypes.map(type => (
                    <button 
                       key={type}
                       onClick={() => setPreferences({ ...preferences, type })}
                       className={`h-14 rounded-2xl text-xs font-bold transition-all border
                        ${preferences.type === type ? 'signature-gradient text-white border-none shadow-lg shadow-primary/20' : 'bg-surface-container-low text-muted-foreground border-border/10 hover:border-primary/20'}`}
                    >
                       {type}
                    </button>
                 ))}
              </div>
           </div>

           <div className="p-6 bg-primary/5 rounded-2xl space-y-3 relative group overflow-hidden">
              <div className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2 opacity-70">
                 <Sparkles size={12} className="match-pulse" />
                 <span>Agentic Insight</span>
              </div>
              <p className="text-[11px] leading-relaxed font-bold text-on-surface/60 italic">
                 "Our JobSearch Agent performs best with specific titles. We've verified that <span className="font-data text-primary">Senior</span> positions currently have <span className="font-data text-primary">42%</span> higher response rates."
              </p>
              <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-primary/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-1000" />
           </div>
        </div>
      </div>

      <div className="flex justify-end gap-12 pt-8">
         <Button 
            onClick={() => onSuccess(preferences)} 
            disabled={!preferences.title}
            className="w-full md:w-auto signature-gradient h-16 px-12 rounded-2xl text-md font-bold shadow-2xl shadow-primary/20 hover:scale-[1.02] transition-all"
         >
            Finalize Strategic Scope <ArrowRight size={20} className="ml-3" />
         </Button>
      </div>
    </div>
  )
}
