import Link from "next/link"
import { auth, signIn } from "@/auth"
import { ArrowRight, ChevronRight, Zap, Shield, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

async function handleGoogleSignIn() {
  "use server"
  await signIn("google", { redirectTo: "/dashboard" })
}

export default async function LandingPage() {
  const session = await auth()
  
  return (
    <div className="flex flex-col min-h-screen bg-surface text-on-surface selection:bg-primary/10">
      {/* Editorial Header */}
      <header className="glass-nav px-8 py-5 flex items-center justify-between transition-all duration-300">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-9 h-9 signature-gradient rounded flex items-center justify-center text-white font-bold shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">J</div>
            <span className="text-2xl font-bold tracking-tighter italic">JobPilot</span>
          </div>
          <nav className="hidden lg:flex items-center gap-9 text-[13px] font-bold uppercase tracking-widest text-muted-foreground">
             <Link href="#features" className="hover:text-primary transition-colors">Navigator</Link>
             <Link href={session ? "/dashboard" : "#agents"} className="hover:text-primary transition-colors">Agents</Link>
             <Link href="/pricing" className="hover:text-primary transition-colors">Access</Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
           {session ? (
             <Link href="/dashboard">
               <Button variant="ghost" className="text-sm font-bold h-10 px-6 hover:bg-surface-container-low no-line">Go to Dashboard</Button>
             </Link>
           ) : (
             <form action={handleGoogleSignIn}>
               <Button type="submit" variant="ghost" className="text-sm font-bold h-10 px-6 hover:bg-surface-container-low no-line">Sign In</Button>
             </form>
           )}
           {session ? (
             <Link href="/dashboard">
               <Button className="signature-gradient h-11 px-7 rounded-xl font-bold text-sm shadow-xl shadow-primary/10 hover:opacity-95 transition-all">Dashboard</Button>
             </Link>
           ) : (
             <form action={handleGoogleSignIn}>
               <Button type="submit" className="signature-gradient h-11 px-7 rounded-xl font-bold text-sm shadow-xl shadow-primary/10 hover:opacity-95 transition-all">Get Started</Button>
             </form>
           )}
        </div>
      </header>

      <main className="flex-1">
        {/* Intentional Asymmetry Hero */}
        <section className="px-6 md:px-8 pt-16 md:pt-24 pb-20 md:pb-40 max-w-[1400px] mx-auto grid lg:grid-cols-12 gap-10 md:gap-16 items-center overflow-hidden">
          <div className="lg:col-span-7 space-y-8 md:space-y-10 animate-in fade-in slide-in-from-left-10 duration-1000">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest">
                <Sparkles size={12} className="match-pulse after:bg-primary/40" />
                <span>Next-Gen Agentic Search</span>
             </div>
             
             <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-[0.9] tracking-tighter break-words">
                The Career <br />
                <span className="italic text-primary">Autopilot.</span>
             </h1>
             
             <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed font-medium">
                Smarter job hunting. Our AI agents curate matches, refine your narrative, and bridge the gap to your next role.
             </p>

             <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 pt-4">
                {session ? (
                  <Link href="/dashboard" className="w-full sm:w-auto">
                    <Button className="w-full signature-gradient h-16 px-10 rounded-2xl text-lg font-bold shadow-2xl shadow-primary/20 hover:scale-[1.02] transition-all">
                      Go to Dashboard <ArrowRight className="ml-3" size={20} />
                    </Button>
                  </Link>
                ) : (
                  <form action={handleGoogleSignIn} className="w-full sm:w-auto">
                    <Button type="submit" className="w-full signature-gradient h-16 px-10 rounded-2xl text-lg font-bold shadow-2xl shadow-primary/20 hover:scale-[1.02] transition-all">
                      Start Your Search <ArrowRight className="ml-3" size={20} />
                    </Button>
                  </form>
                )}
                <div className="w-full sm:w-auto flex items-center justify-center gap-4 px-6 h-16 rounded-2xl border border-border/20 text-muted-foreground font-bold cursor-pointer hover:bg-surface-container-low transition-colors">
                   <Zap size={20} className="text-warning" />
                   <span>Watch System Overview</span>
                </div>
             </div>
          </div>

          <div className="lg:col-span-5 relative animate-in fade-in zoom-in duration-1000 delay-300">
             <div className="absolute -inset-4 bg-primary/5 blur-3xl rounded-full" />
             <div className="relative bg-surface-container-lowest rounded-[2.5rem] p-4 shadow-[0_40px_100px_rgba(0,0,0,0.08)] border border-white/40 overflow-hidden">
                <div className="aspect-[4/5] bg-surface-container-low rounded-[2rem] flex flex-col p-8 overflow-hidden">
                   <div className="flex justify-between items-start mb-12">
                      <div className="space-y-1">
                         <div className="h-2 w-32 bg-primary/10 rounded-full" />
                         <div className="h-2 w-20 bg-primary/10 rounded-full" />
                      </div>
                      <div className="w-12 h-12 rounded-2xl signature-gradient" />
                   </div>
                   
                   <div className="space-y-6 flex-1">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-20 bg-surface-container-lowest rounded-2xl p-4 flex items-center gap-4 animate-in fade-in slide-in-from-right-10 duration-700" style={{ animationDelay: `${i*150}ms` }}>
                           <div className="w-10 h-10 rounded-full bg-surface-container-low" />
                           <div className="flex-1 space-y-2">
                              <div className="h-2 w-3/4 bg-on-surface/5 rounded-full" />
                              <div className="h-1.5 w-1/2 bg-on-surface/5 rounded-full" />
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        </section>

        {/* Editorial Features Section */}
        <section id="features" className="bg-surface-container-low py-32 px-8 overflow-hidden">
           <div className="max-w-[1400px] mx-auto">
              <div id="agents" className="flex flex-col lg:flex-row justify-between items-end gap-10 mb-24">
                 <div className="max-w-2xl space-y-6">
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tighter leading-none">High-Fidelity Automation.</h2>
                    <p className="text-lg text-muted-foreground font-medium">We've built specialized nodes to handle every phase of the professional journey.</p>
                 </div>
                 <div className="text-sm font-bold uppercase tracking-[0.2em] text-primary/40 pb-2">Core Competencies / 2026</div>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                 {[
                   { 
                     title: "Deep Search Agent", 
                     desc: "Proprietary vector search across all major job boards and private company portals.", 
                     icon: <Sparkles className="text-primary" size={24} /> 
                   },
                   { 
                     title: "Narrative Architect", 
                     desc: "Transforms your background into a surgical instrument for specific career goals.", 
                     icon: <Zap className="text-warning" size={24} /> 
                   },
                   { 
                     title: "Network Catalyst", 
                     desc: "Automated identity discovery and contact management for warm introductions.", 
                     icon: <Shield className="text-success" size={24} /> 
                   }
                 ].map((f, i) => (
                   <div key={i} className="group p-10 bg-surface-container-lowest rounded-3xl hover:translate-y-[-8px] transition-all duration-500 shadow-sm hover:shadow-2xl hover:shadow-primary/5">
                      <div className="w-14 h-14 rounded-2xl bg-surface-container-low flex items-center justify-center mb-8 border border-white group-hover:bg-primary transition-colors">
                         <div className="group-hover:text-white transition-colors">{f.icon}</div>
                      </div>
                      <h3 className="text-2xl font-bold mb-4 tracking-tight">{f.title}</h3>
                      <p className="text-muted-foreground leading-relaxed font-medium">{f.desc}</p>
                   </div>
                 ))}
              </div>
           </div>
        </section>
      </main>

      <footer className="px-8 py-20 border-t border-border/10">
         <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
            <div className="space-y-6">
               <div className="flex items-center gap-2">
                 <div className="w-7 h-7 signature-gradient rounded flex items-center justify-center text-white font-bold text-xs">J</div>
                 <span className="text-xl font-bold tracking-tighter">JobPilot</span>
               </div>
               <p className="text-sm text-muted-foreground font-medium max-w-xs leading-relaxed">
                 The definitive platform for the modern professional. Built with precision in Silicon Valley.
               </p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-16">
               <div className="space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Product</h4>
                  <ul className="space-y-3 text-sm font-bold">
                     <li><Link href="/dashboard" className="hover:text-primary transition-colors">Nodes</Link></li>
                     <li><Link href="/pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
                     <li><Link href="/onboarding" className="hover:text-primary transition-colors">Beta Access</Link></li>
                  </ul>
               </div>
               <div className="space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Company</h4>
                  <ul className="space-y-3 text-sm font-bold">
                     <li><Link href="/" className="hover:text-primary transition-colors">Journal</Link></li>
                     <li><Link href="/" className="hover:text-primary transition-colors">Architecture</Link></li>
                     <li><Link href="/" className="hover:text-primary transition-colors">Security</Link></li>
                  </ul>
               </div>
            </div>
         </div>
      </footer>
    </div>
  )
}
