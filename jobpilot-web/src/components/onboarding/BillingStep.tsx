"use client"

import { useState } from "react"
import { Check, Sparkles, Shield, Zap, Gift } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BillingStepProps {
  onComplete: (data: any) => void
  onBack: () => void
}

export default function BillingStep({ onComplete, onBack }: BillingStepProps) {
  const [plan, setPlan] = useState("Pro")

  const plans = [
    { 
      name: "Pilot Starter", 
      price: "$0", 
      desc: "Essentials for light hunters.",
      features: ["1 Active Node", "Daily Search", "Basic Tailoring", "No Outreach"],
      cta: "Join the Beta — It's Free"
    },
    { 
      name: "Intelligent Navigator", 
      price: "$29", 
      desc: "Full agentic orchestration.",
      features: ["5 Active Nodes", "Real-time Search", "Deep Narrative AI", "Outreach Agent"],
      cta: "Activate Full Power",
      popular: true
    },
    { 
      name: "Autonomous Elite", 
      price: "$79", 
      desc: "Ultimate hiring momentum.",
      features: ["Unlimited Nodes", "Priority API Access", "Executive Networking", "Interview Concierge"],
      cta: "Deploy Elite System"
    }
  ]

  return (
    <div className="w-full max-w-5xl mx-auto space-y-16 selection:bg-primary/10">
      <div className="grid md:grid-cols-3 gap-8">
        {plans.map((p, i) => (
          <div 
            key={i}
            onClick={() => setPlan(p.name)}
            className={`relative p-10 rounded-[2.5rem] border-2 transition-all duration-700 cursor-pointer flex flex-col justify-between 
              ${plan === p.name ? 'border-primary bg-primary/[0.03] shadow-[0_40px_100px_rgba(0,0,0,0.06)]' : 'border-border/10 bg-surface-container-low opacity-60 hover:opacity-100 hover:scale-[1.02]'}`}
          >
            <div className="space-y-8 relative z-10">
               <div className="flex justify-between items-start">
                  <h4 className="text-xl font-bold tracking-tight">{p.name}</h4>
                  {p.popular && <span className="px-3 py-1 bg-primary text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg shadow-primary/20">Recommended</span>}
               </div>
               
               <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-data font-bold tracking-tighter">{p.price}</span>
                  <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest opacity-60">/ Month</span>
               </div>

               <p className="text-xs text-muted-foreground font-medium leading-relaxed italic">{p.desc}</p>

               <ul className="space-y-4 pt-4">
                  {p.features.map(f => (
                    <li key={f} className="flex items-center gap-3 text-xs font-bold text-on-surface/80">
                       <Check size={16} className="text-primary" />
                       {f}
                    </li>
                  ))}
               </ul>
            </div>

            {plan === p.name && (
              <div className="absolute top-0 right-0 p-6 pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity">
                <Sparkles size={100} className="match-pulse after:bg-primary/20" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="pt-10 flex flex-col items-center space-y-8">
         <div className="flex flex-col md:flex-row items-center gap-10 opacity-70">
            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
               <Shield size={16} className="text-primary" />
               Architectural Security Guaranteed
            </div>
            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
               <Zap size={16} className="text-warning" />
               Unlimited Technical Narrative Revisions
            </div>
            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
               <Gift size={16} className="text-success" />
               30-Day Early Access Protocol Active
            </div>
         </div>

         <div className="flex justify-center gap-10">
            <Button 
               onClick={() => onComplete({ plan })} 
               className="w-full md:w-auto signature-gradient h-16 px-16 rounded-2xl text-lg font-bold shadow-2xl shadow-primary/20 hover:scale-[1.05] transition-all"
            >
               Deploy Agents & Authenticate Dashboard <Sparkles size={20} className="ml-3" />
            </Button>
         </div>
      </div>
    </div>
  )
}
