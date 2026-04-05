"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Search, 
  Plus, 
  Bell, 
  Settings, 
  LogOut, 
  LayoutGrid, 
  Briefcase, 
  FileText, 
  Calendar, 
  Menu,
  X,
  Moon,
  Sun,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { createManualJob } from "@/lib/actions/onboarding"
import { toast } from "sonner"
import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"

interface DashboardLayoutProps {
  children: React.ReactNode
  hasResume: boolean
  resumeSkillCount: number
}

export default function DashboardLayout({ children, hasResume, resumeSkillCount }: DashboardLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  
  const [isAddingJob, setIsAddingJob] = useState(false)
  const [newJobTitle, setNewJobTitle] = useState("")
  const [newJobCompany, setNewJobCompany] = useState("")
  const [addingLoading, setAddingLoading] = useState(false)

  const handleGlobalSearch = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      router.push(`/dashboard/applications?q=${encodeURIComponent(searchQuery)}`)
      setSearchQuery("")
    }
  }

  const navItems = [
    { label: "Dashboard", icon: <LayoutGrid size={20} />, href: "/dashboard" },
    { label: "Applications", icon: <Briefcase size={20} />, href: "/dashboard/applications" },
    { label: "Refined Resume", icon: <FileText size={20} />, href: "/dashboard/resume" },
    { label: "Interview Prep", icon: <Calendar size={20} />, href: "/dashboard/interview" },
    { label: "Career Roadmap", icon: <TrendingUp size={20} />, href: "/dashboard/roadmap" },
  ]

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <div className={`flex flex-col h-screen bg-surface overflow-hidden ${isDarkMode ? 'dark' : ''}`}>
      {/* Header */}
      <header className="h-16 px-6 bg-surface-container-lowest flex items-center justify-between shrink-0 z-50 border-b border-muted/5 transition-colors">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4">
             <Button 
                variant="ghost" 
                size="icon" 
                className="lg:hidden no-line" 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
             >
                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
             </Button>
             <Link href="/dashboard" className="flex items-center gap-2 group">
               <div className="w-8 h-8 signature-gradient rounded flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-primary/20 transition-transform group-hover:scale-105">J</div>
               <span className="text-xl font-bold text-on-surface tracking-tight italic hidden sm:block">JobPilot</span>
             </Link>
          </div>

          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground opacity-50" size={16} />
            <Input 
              placeholder="Inject application node..." 
              className="w-[300px] h-9 pl-10 bg-surface-container-low border-none rounded-lg text-sm font-bold focus-visible:ring-1 focus-visible:ring-primary/20" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleGlobalSearch}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
             variant="ghost" 
             size="icon" 
             onClick={toggleDarkMode}
             className="text-muted-foreground hover:bg-surface-container-low"
          >
             {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground relative hover:bg-surface-container-low">
            <Bell size={20} />
            <div className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full border-2 border-surface-container-lowest" />
          </Button>
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-primary font-bold border border-primary/10 text-[10px] shadow-sm">
            AK
          </div>
          <Dialog open={isAddingJob} onOpenChange={setIsAddingJob}>
            <DialogTrigger className="signature-gradient hover:opacity-90 shadow-lg shadow-primary/10 hidden sm:flex gap-2 h-9 items-center border-none rounded-lg px-4 font-bold text-xs text-white cursor-pointer transition-opacity">
                 <Plus size={14} />
                 <span>Deploy New Job</span>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-surface-container-low border-border/10">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold tracking-tight text-on-surface">Inject Manual Job</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4">
                 <Input 
                   value={newJobTitle}
                   onChange={e => setNewJobTitle(e.target.value)}
                   placeholder="Role Title" 
                   className="bg-surface border-border/10" 
                 />
                 <Input 
                   value={newJobCompany}
                   onChange={e => setNewJobCompany(e.target.value)}
                   placeholder="Company Name" 
                   className="bg-surface border-border/10" 
                 />
                 <Button 
                   disabled={addingLoading}
                   onClick={async () => {
                      if(!newJobTitle || !newJobCompany) return;
                      setAddingLoading(true);
                      const res = await createManualJob({ title: newJobTitle, company: newJobCompany, status: "found" });
                      setAddingLoading(false);
                      if (res.success) {
                        toast.success("Job deployed successfully.");
                        setIsAddingJob(false);
                        setNewJobTitle("");
                        setNewJobCompany("");
                      } else {
                        toast.error("Deployment failed.");
                      }
                   }}
                   className="mt-4 signature-gradient font-bold"
                 >
                   {addingLoading ? "Deploying..." : "Deploy Node"}
                 </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
         {/* Sidebar Nav - Desktop */}
        <aside className="hidden lg:flex w-64 bg-surface-container-low flex-col py-8 shrink-0 transition-all duration-300">
          <div className="px-4 space-y-2 flex-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`w-full flex items-center gap-4 px-5 py-3 rounded-xl transition-all group
                  ${pathname === item.href ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]' : 'text-muted-foreground hover:bg-surface-container-lowest border border-transparent hover:border-white'}`}
              >
                <div className={`${pathname === item.href ? 'text-white' : 'text-primary/60 group-hover:text-primary'} transition-colors`}>
                  {item.icon}
                </div>
                <span className="font-bold text-[13px] tracking-tight text-inherit uppercase tracking-widest leading-none">{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Resume Status Banner */}
          {!hasResume ? (
            <Link href="/dashboard/resume" className="block mx-4 mb-3 group">
              <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/25 hover:bg-amber-500/14 hover:border-amber-500/40 transition-all duration-300">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                    <AlertTriangle size={14} className="text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">No Resume</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">Upload to enable AI scoring</p>
                  </div>
                  <Zap size={12} className="text-amber-400 shrink-0" />
                </div>
              </div>
            </Link>
          ) : (
            <div className="mx-4 mb-3 p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <CheckCircle size={14} className="text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Resume Active</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <p className="text-[10px] text-muted-foreground">{resumeSkillCount} skills · Scoring on</p>
                </div>
              </div>
            </div>
          )}

          <div className="px-4 space-y-2 pt-4 border-t border-muted/10">
             <Link href="/dashboard/settings" className="w-full flex items-center gap-4 px-5 py-3 text-muted-foreground hover:bg-surface-container-lowest rounded-xl transition-all group">
                <Settings size={20} className="group-hover:text-primary transition-colors" />
                <span className="font-bold text-[13px] tracking-widest uppercase leading-none">Settings</span>
             </Link>
              <button 
                onClick={() => signOut({ callbackUrl: "/" })}
                className="w-full flex items-center gap-4 px-5 py-3 text-danger/60 hover:text-danger hover:bg-danger/5 rounded-xl transition-all group"
              >
                 <LogOut size={20} className="group-hover:text-danger transition-colors" />
                 <span className="font-bold text-[13px] tracking-widest uppercase leading-none">Sign Out</span>
              </button>
          </div>
        </aside>

        {/* Mobile Dropdown Nav */}
        <AnimatePresence>
          {isMobileMenuOpen && (
             <motion.div 
               initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
               animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
               exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
               transition={{ type: "spring", damping: 25, stiffness: 200 }}
               className="lg:hidden fixed inset-0 z-[100] bg-surface/98 backdrop-blur-2xl flex flex-col pt-32 px-8 overflow-y-auto"
             >
                <div className="space-y-4 mb-16">
                   {navItems.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`w-full flex items-center gap-6 px-8 py-6 rounded-[2rem] transition-all group active:scale-95
                          ${pathname === item.href ? 'signature-gradient text-white shadow-2xl shadow-primary/20 scale-[1.02]' : 'bg-surface-container-low text-on-surface hover:bg-surface-container-lowest'}`}
                      >
                         <div className={`${pathname === item.href ? 'text-white' : 'text-primary'}`}>
                           {item.icon}
                         </div>
                         <span className="font-bold text-lg tracking-widest uppercase italic">{item.label}</span>
                         <ArrowRight size={20} className={`ml-auto ${pathname === item.href ? 'opacity-100' : 'opacity-0'} transition-opacity`} />
                      </Link>
                   ))}
                   <Link 
                     href="/dashboard/settings" 
                     onClick={() => setIsMobileMenuOpen(false)} 
                     className="w-full flex items-center gap-6 px-8 py-6 bg-surface-container-low text-on-surface rounded-[2rem] active:scale-95"
                   >
                      <Settings size={20} className="text-primary" />
                      <span className="font-bold text-lg tracking-widest uppercase italic">Settings</span>
                   </Link>
                </div>

                <div className="mt-auto pb-12 pt-8 border-t border-muted/10 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full signature-gradient flex items-center justify-center text-white font-bold shadow-lg shadow-primary/20">AK</div>
                      <div>
                         <div className="text-sm font-bold">Aman Kumar</div>
                         <div className="text-[10px] font-bold text-primary tracking-widest uppercase">Growth Node</div>
                      </div>
                   </div>
                    <Button 
                      onClick={() => signOut({ callbackUrl: "/" })}
                      variant="ghost" 
                      className="h-12 px-6 rounded-xl bg-surface-container-low text-danger text-xs font-bold no-line"
                    >
                      Sign Out
                    </Button>
                </div>

                <Button 
                   variant="ghost" 
                   size="icon" 
                   onClick={() => setIsMobileMenuOpen(false)}
                   className="absolute top-8 right-8 h-12 w-12 rounded-2xl bg-surface-container-low no-line"
                >
                   <X size={24} />
                </Button>
             </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-surface transition-all duration-300 relative">
          <div className="absolute inset-x-0 h-40 bg-gradient-to-b from-surface-container-lowest/50 to-transparent pointer-events-none z-10" />
          <div className="relative z-20">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
