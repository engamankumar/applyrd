"use client";

import Link from "next/link";
import { Check, Sparkles, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function PricingPage() {
   const features = [
      "Multi-Agent Orchestration",
      "Deep Resume Tailoring (ATS Optimized)",
      "Real-time Gmail Monitoring",
      "Interview Simulator (Gemini Flash Powered)",
      "LinkedIn Recruiter Discovery",
      "Kanban Job Pipeline",
   ];

   return (
      <div className="min-h-screen bg-surface flex flex-col">
         {/* Header */}
         <header className="px-8 py-6 flex items-center justify-between border-b border-border/5">
            <Link href="/" className="flex items-center gap-2 group">
               <div className="w-8 h-8 signature-gradient rounded flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-primary/20">J</div>
               <span className="text-xl font-bold tracking-tighter italic">Applyrd</span>
            </Link>
            <Link href="/dashboard">
               <Button variant="ghost" className="font-bold text-sm h-10 px-6 no-line hover:bg-surface-container-low">Dashboard</Button>
            </Link>
         </header>

         <main className="flex-1 flex flex-col items-center pt-24 pb-32 px-6">
            <div className="max-w-4xl w-full text-center space-y-8 mb-20 animate-in fade-in slide-in-from-bottom-5 duration-700">
               <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest mx-auto">
                  <Zap size={12} className="text-warning" />
                  <span>2026 Beta Phase</span>
               </div>
               <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-none">
                  Elite Search for the <br />
                  <span className="text-primary italic">Modern Professional.</span>
               </h1>
               <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium leading-relaxed">
                  Uncompromising automation for your career. Secure your place in our exclusive initial cohort.
               </p>
            </div>

            {/* Pricing Card */}
            <div className="max-w-5xl w-full grid md:grid-cols-1 gap-8 items-center justify-center animate-in fade-in zoom-in duration-1000 delay-200">
               <Card className="glass-morphism border-primary/20 p-10 md:p-16 relative overflow-hidden group shadow-[0_40px_100px_rgba(0,0,0,0.12)] rounded-[3rem] w-full max-w-2xl mx-auto flex flex-col md:flex-row gap-12">
                  <div className="flex-1 space-y-8 relative z-10">
                     <div className="space-y-4">
                        <h2 className="text-3xl font-bold tracking-tight">Beta Pioneer</h2>
                        <p className="text-muted-foreground font-medium text-sm leading-relaxed">
                           Full access to the Applyrd agentic ecosystem during our foundational testing phase.
                        </p>
                     </div>

                     <div className="space-y-4">
                        {features.map((f, i) => (
                           <div key={i} className="flex items-center gap-3">
                              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                                 <Check size={12} className="text-primary" />
                              </div>
                              <span className="text-sm font-bold opacity-80">{f}</span>
                           </div>
                        ))}
                     </div>
                  </div>

                  <div className="w-full md:w-[280px] space-y-10 flex flex-col justify-center relative z-10">
                     <div className="space-y-1">
                        <div className="flex items-baseline gap-2">
                           <span className="text-7xl font-data font-bold tracking-tighter">$0</span>
                           <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">/ Year</span>
                        </div>
                        <p className="text-xs font-bold text-primary tracking-widest uppercase opacity-70">Founding Member Price</p>
                     </div>

                     <div className="space-y-4">
                        <Link href="/dashboard" className="block w-full">
                           <Button className="w-full signature-gradient h-16 rounded-2xl text-lg font-bold shadow-2xl shadow-primary/20 hover:scale-[1.05] transition-all">
                              Get Early Access <ArrowRight className="ml-2" />
                           </Button>
                        </Link>
                        <p className="text-[10px] text-center text-muted-foreground font-bold uppercase tracking-widest opacity-60">
                           Limited to 500 invitations
                        </p>
                     </div>
                  </div>

                  <Sparkles className="absolute -bottom-10 -right-10 w-48 h-48 text-primary/5 group-hover:rotate-12 transition-transform duration-1000" />
               </Card>
            </div>
         </main>

         <footer className="py-20 text-center border-t border-border/5">
            <p className="text-sm text-muted-foreground font-medium">© 2026 Applyrd. Elite Career Engineering.</p>
         </footer>
      </div>
   );
}
