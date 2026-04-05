"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { 
  TrendingUp, Sparkles, BookOpen, ChevronRight, Award, 
  Target, Zap, Compass, CheckCircle2, Map as MapIcon,
  Search, Star
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import axios from "axios"
import { getUserProfile } from "@/lib/actions/onboarding"

const AGENT_API = process.env.NEXT_PUBLIC_AGENT_SERVICE_URL;

type RoadmapData = {
  missing_skills: string[]
  skill_gap_summary: string
  recommended_labs: { title: string, url: string }[]
  target_job?: string
  readiness_score: number
}

export default function CareerRoadmapPage() {
  const [data, setData] = useState<RoadmapData | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [profile, setProfile] = useState<any>(null)

  const fetchRoadmap = async () => {
    setLoading(true)
    try {
      const userProfile = await getUserProfile();
      setProfile(userProfile);
      
      const targetRole = (userProfile?.preferred_roles && userProfile.preferred_roles.length > 0) 
        ? userProfile.preferred_roles[0] 
        : "Senior Infrastructure Engineer";

      // Orchestrate a "Analyze career and skills gap" request
      const res = await axios.post(`${AGENT_API}/agent/orchestrate`, {
        message: `Analyze my career trajectory and identify skill gaps for a ${targetRole} role.`,
        user_email: userProfile?.email,
        context: { 
          preferences: { role: targetRole },
          email: userProfile?.email
        }
      })
      
      const skillRes = res.data.results.find((r: any) => r.agent === "skill_gap_agent")?.data
      const labRes = res.data.results.find((r: any) => r.agent === "google_skills_agent")?.data?.recommended_labs

      setData({
        missing_skills: skillRes?.missing_skills || [
          { name: `Strategic ${targetRole} Planning`, description: "Mastering the top-level vision and roadmap execution for this specific role." },
          { name: "Metric-Driven Prioritization", description: "Using data and customer insights to guide complex project trade-offs." },
          { name: "Cross-Functional Leadership", description: "Influence without authority across engineering, design, and business teams." },
          { name: "Market & User Research", description: "Identifying deep user pain points to drive high-impact product features." },
          { name: "Agile Product Lifecycle", description: "Navigating the full journey from ideation to launch and iteration." }
        ],
        skill_gap_summary: skillRes?.skill_gap_summary || `Analyzing the technical and leadership requirements needed to transition into your ${targetRole} role.`,
        recommended_labs: labRes || [],
        target_job: targetRole,
        readiness_score: skillRes?.readiness_score || 50
      })
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchRoadmap()
  }, [])

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div className="space-y-3">
          <Badge className="bg-primary/5 text-primary border-none font-bold text-[10px] tracking-widest px-4 py-1.5 uppercase">
            AI Career Intelligence
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight text-on-surface leading-tight">
            Autonomous <br/> <span className="text-primary italic">Career Roadmap.</span>
          </h1>
          <p className="text-muted-foreground font-medium max-w-lg leading-relaxed text-sm">
            Our agents analyze your profile against real-world market demands to identify tactical skill gaps.
          </p>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="outline" onClick={fetchRoadmap} disabled={loading} className="rounded-xl font-bold h-12 px-6 hover:bg-surface-container-low transition-all">
             {loading ? "Recalculating..." : "Refresh Pulse"}
           </Button>
           <Button className="rounded-xl font-bold h-12 px-6 signature-gradient shadow-xl shadow-primary/20">
             Export PDF
           </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Gap Analysis Card */}
        <div className="lg:col-span-2 space-y-8">
           <div className="p-10 rounded-[3rem] bg-surface-container-lowest border border-white shadow-sm relative overflow-hidden group">
              <div className="relative z-10 space-y-8">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <Target size={20} />
                   </div>
                   <h3 className="text-xl font-bold tracking-tight">Gap Analysis</h3>
                </div>
                
                <p className="text-on-surface/80 font-medium leading-relaxed italic text-lg border-l-3 border-primary/20 pl-8">
                  &ldquo;{data?.skill_gap_summary || "Analyzing your profile infrastructure..."}&rdquo;
                </p>

                <div className="grid md:grid-cols-2 gap-6">
                  {data?.missing_skills.map((skill: any, i) => (
                    <div key={i} className="p-6 rounded-[2rem] bg-white border border-black/5 hover:border-primary/20 dark:bg-surface-container-low dark:border-white/40 flex flex-col gap-3 group/skill hover:shadow-xl hover:shadow-primary/5 transition-all">
                       <div className="flex items-center justify-between">
                         <span className="font-ex-bold text-base text-on-surface group-hover/skill:text-primary transition-colors">
                           {typeof skill === 'string' ? skill : skill.name}
                         </span>
                         <Zap size={16} className="text-warning fill-warning/20 animate-pulse" />
                       </div>
                       {skill.description && (
                         <p className="text-xs text-on-surface/60 leading-relaxed group-hover/skill:text-on-surface/80 transition-colors italic">
                           {skill.description}
                         </p>
                       )}
                    </div>
                  ))}
                </div>
              </div>
           </div>

           {/* Recommended Learning Paths */}
           <div className="p-10 rounded-[3rem] signature-gradient text-white shadow-2xl shadow-primary/20 relative overflow-hidden group">
              <div className="relative z-10 space-y-10">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <BookOpen size={20} />
                   </div>
                   <h3 className="text-xl font-bold tracking-tight">Recommended Learning Paths</h3>
                </div>

                <div className="space-y-6">
                   {data?.recommended_labs.map((lab, i) => (
                     <motion.div 
                        key={i} 
                        initial={{ opacity: 0, x: -20 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center justify-between bg-white text-on-surface p-6 rounded-3xl group/lab hover:scale-[1.02] transition-all cursor-pointer shadow-lg shadow-black/5"
                        onClick={() => window.open(lab.url, '_blank')}
                     >
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary">
                              <Star size={16} fill="currentColor" />
                           </div>
                           <span className="font-bold text-sm">{lab.title}</span>
                        </div>
                        <ChevronRight size={18} className="text-muted-foreground group-hover/lab:translate-x-1 transition-transform" />
                     </motion.div>
                   ))}
                </div>

                <div className="p-6 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20">
                   <p className="text-xs font-bold leading-relaxed opacity-90">
                     💡 Completing these {data?.recommended_labs.length} specialized courses will significantly boost your profile for {data?.target_job || 'the market'}.
                   </p>
                </div>
              </div>
           </div>
        </div>

        {/* Sidebar Roadmap Stats */}
        <div className="space-y-8">
           <div className="p-10 rounded-[3rem] bg-surface-container-low border border-border/5 space-y-8">
              <div className="flex items-center gap-3">
                 <Compass size={20} className="text-primary" />
                 <h4 className="font-bold text-xs uppercase tracking-widest text-on-surface/40">Readiness Pulse</h4>
              </div>

              <div className="space-y-10">
                 <div className="space-y-4">
                    <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider">
                       <span>Market Readiness</span>
                       <span className="text-primary">{data?.readiness_score}%</span>
                    </div>
                    <Progress value={data?.readiness_score} className="h-4 rounded-full bg-white/50" />
                 </div>
                 
                 <div className="space-y-6">
                    <h5 className="font-bold text-xs">Phased Milestone Execution</h5>
                    {[
                      { title: "Skill Acquisition", active: true },
                      { title: "Resume Optimization", active: false },
                      { title: "Direct Outreach", active: false },
                      { title: "Interview Simulation", active: false }
                    ].map((m, i) => (
                      <div key={i} className={`flex items-center gap-4 ${m.active ? 'opacity-100' : 'opacity-40'}`}>
                         <div className={`w-6 h-6 rounded-full flex items-center justify-center ${m.active ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-surface-container-lowest text-muted-foreground'}`}>
                            {m.active ? <Zap size={10} /> : <CheckCircle2 size={10} />}
                         </div>
                         <span className="text-xs font-bold tracking-tight">{m.title}</span>
                      </div>
                    ))}
                 </div>
              </div>
           </div>

           <div className="p-8 rounded-[3rem] bg-primary/5 border border-primary/10 flex flex-col items-center text-center space-y-4">
              <Sparkles size={24} className="text-primary" />
              <h5 className="font-bold text-xs">Continuously Evolving</h5>
              <p className="text-[10px] font-medium text-muted-foreground leading-relaxed px-4">
                Your Roadmap is live-updated as you complete labs and update your profile.
              </p>
           </div>
        </div>
      </div>
    </div>
  )
}
