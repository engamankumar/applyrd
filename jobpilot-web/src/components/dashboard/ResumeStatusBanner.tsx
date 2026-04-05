"use client"

import Link from "next/link"
import { FileText, AlertTriangle, CheckCircle, ArrowRight, Zap } from "lucide-react"

interface ResumeStatusBannerProps {
  hasResume: boolean
  resumeFileName?: string
  resumeSkillCount?: number
}

export default function ResumeStatusBanner({ hasResume, resumeFileName, resumeSkillCount }: ResumeStatusBannerProps) {
  if (hasResume) {
    return (
      <div className="mx-4 mb-4 p-4 rounded-xl bg-emerald-500/8 border border-emerald-500/20 group hover:bg-emerald-500/12 transition-all duration-300">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle size={16} className="text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-800 text-emerald-400 uppercase tracking-widest font-bold">Resume Active</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {resumeSkillCount ? `${resumeSkillCount} skills detected` : "Resume indexed"} · Match scores enabled
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Link href="/dashboard/resume" className="block mx-4 mb-4 group">
      <div className="p-4 rounded-xl bg-amber-500/8 border border-amber-500/25 hover:bg-amber-500/14 hover:border-amber-500/40 transition-all duration-300 cursor-pointer">
        {/* Pulsing warning dot */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
            <AlertTriangle size={16} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">No Resume</span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">
              All job match scores will show 0%. Upload to unlock AI scoring.
            </p>
            <div className="flex items-center gap-1 text-amber-400 group-hover:gap-2 transition-all">
              <Zap size={10} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Upload Resume</span>
              <ArrowRight size={10} className="translate-x-0 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
