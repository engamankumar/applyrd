import StatsBar from "@/components/dashboard/StatsBar"
import KanbanBoard from "@/components/dashboard/KanbanBoard"
import ActivityFeed from "@/components/dashboard/ActivityFeed"
import AIAssistant from "@/components/dashboard/AIAssistant"
import { TrendingUp, Sparkles, AlertTriangle, CheckCircle, ArrowRight, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { getDashboardStats, getUserJobs, getLatestResume } from "@/lib/actions/onboarding"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const [stats, jobs, resume] = await Promise.all([
    getDashboardStats(),
    getUserJobs(),
    getLatestResume()
  ]);

  const hasJobs = jobs.length > 0;
  const hasResume = !!resume;
  const skillCount = resume ? (resume.parsed_skills as string[])?.length || 0 : 0;

  return (
    <div className="p-8">

      {/* Resume Status Alert Banner */}
      {!hasResume ? (
        <Link href="/dashboard/resume">
          <div className="mb-6 flex items-center gap-4 p-4 rounded-2xl bg-amber-500/8 border border-amber-500/30 hover:bg-amber-500/12 hover:border-amber-500/50 transition-all duration-300 group cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <AlertTriangle size={20} className="text-amber-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-bold text-amber-400">No resume detected</span>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              </div>
              <p className="text-xs text-muted-foreground">
                All job match scores will show <strong className="text-amber-400">0%</strong> until you upload your resume. AI-powered scoring requires your resume.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-amber-400 shrink-0 group-hover:gap-2.5 transition-all">
              <Zap size={14} />
              <span className="text-xs font-bold uppercase tracking-widest">Upload Now</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>
      ) : (
        <div className="mb-6 flex items-center gap-4 p-4 rounded-2xl bg-emerald-500/8 border border-emerald-500/20">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
            <CheckCircle size={20} className="text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-bold text-emerald-400">Resume Active</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-xs text-muted-foreground">
              {skillCount > 0 ? `${skillCount} skills indexed` : "Resume indexed"} · AI match scoring is enabled for all discovered roles
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 min-w-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-on-surface tracking-tight mb-1">Welcome to JobPilot 👋</h1>
            <p className="text-muted-foreground font-medium italic">Your agent nodes are active and waiting for a command.</p>
          </div>
           
           <StatsBar data={stats} />
           
           <KanbanBoard initialJobs={jobs} hasJobs={hasJobs} />
        </div>

        {/* Right Sidebar - Activity & AI */}
        <div className="w-full lg:w-[320px] shrink-0 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
           <AIAssistant />
           <ActivityFeed />
           
           <div className="p-6 rounded-2xl bg-surface-container-low border border-border/5 relative overflow-hidden group">
              <div className="relative z-10 flex flex-col items-center text-center py-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                  <Sparkles size={20} />
                </div>
                <h4 className="font-bold text-xs uppercase tracking-widest text-on-surface/60 mb-2">Resume Intelligence</h4>
                <p className="text-[11px] font-medium text-muted-foreground leading-relaxed px-4">
                  {hasResume 
                    ? `Your resume is active with ${skillCount} skills. Jobs are being matched automatically.`
                    : "Upload your resume to generate your match score and identify tactical skill gaps."
                  }
                </p>
                <Link href={hasResume ? "/dashboard/resume" : "/dashboard/resume"} className="w-full mt-6">
                  <Button variant="outline" className="w-full font-bold h-10 border-primary/20 text-primary hover:bg-primary/5">
                    {hasResume ? "Manage Resume" : "Upload Resume"}
                  </Button>
                </Link>
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}
