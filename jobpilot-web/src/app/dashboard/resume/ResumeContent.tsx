"use client"

import { useState, useRef, useCallback } from "react"
import { FileText, Sparkles, Check, TrendingUp, AlertTriangle, RefreshCw, Zap, Upload, X, CloudUpload, CheckCircle2, FileUp, GraduationCap, Briefcase, Brain, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { useGapAnalysis } from "@/hooks/useAgent"
import { saveResumeData, setActiveResume } from "@/lib/actions/onboarding"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export default function ResumeContent({ initialResumes, latestResume }: { initialResumes: any[], latestResume: any }) {
  const [targetRole, setTargetRole] = useState("")
  const [gapData, setGapData] = useState<any>(null)
  const [rightPanel, setRightPanel] = useState<"resume" | "gap">("resume")
  const { mutateAsync: runGapAnalysis, isPending: isAnalyzing } = useGapAnalysis()
  const router = useRouter()

  // Upload states
  const [isDragging, setIsDragging] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // The currently displayed resume version
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(latestResume?.id || null);

  const selectedResume = initialResumes.find(r => r.id === selectedResumeId) || (uploadResult ? null : initialResumes[0]);

  // Decide what data to show in details
  const displayData = uploadResult ? {
    skills: uploadResult.skills || [],
    experience: uploadResult.experience || [],
    education: uploadResult.education || [],
    personal_info: uploadResult.personal_info || {},
    created_at: new Date().toISOString(),
    isNewUpload: true
  } : selectedResume ? {
    skills: (selectedResume.parsed_skills as string[]) || [],
    experience: (selectedResume.parsed_experience as any[]) || [],
    education: (selectedResume.parsed_education as any[]) || [],
    personal_info: (selectedResume.parsed_personal_info as any) || {},
    created_at: selectedResume.created_at,
    id: selectedResume.id,
    isNewUpload: false
  } : null;

  const skills = displayData?.skills || []
  const experience = displayData?.experience || []
  const education = displayData?.education || []

  const handleGapAnalysis = async () => {
    if (!displayData) return;
    try {
      const res = await runGapAnalysis({ skills: displayData.skills, target_role: targetRole })
      if (res.status === "success") {
        setGapData(res.data)
        setRightPanel("gap")
      }
    } catch (e) {
      console.error(e)
    }
  }

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }, [])
  const onDragLeave = useCallback(() => setIsDragging(false), [])
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }, [])

  const handleFileSelect = (file: File) => {
    const allowed = ["application/pdf", "text/plain"]
    if (!allowed.includes(file.type) && !file.name.endsWith(".txt") && !file.name.endsWith(".pdf")) {
      toast.error("Only PDF and TXT files are supported"); return
    }
    setUploadFile(file); setUploadResult(null)
  }

  const handleUpload = async () => {
    if (!uploadFile) return
    setIsUploading(true); setUploadResult(null)
    try {
      const formData = new FormData()
      formData.append("file", uploadFile)
      const agentApi = process.env.NEXT_PUBLIC_AGENT_SERVICE_URL || "https://jobpilot-agents-704256979090.europe-west1.run.app"
      const res = await fetch(`${agentApi}/agent/parse-resume`, { method: "POST", body: formData })
      const data = await res.json()
      if (data.status === "success") {
        setUploadResult(data.data)
        toast.success("Resume parsed! Review and save below.")
      } else {
        toast.error(data.message || "Failed to parse resume")
      }
    } catch {
      toast.error("Could not connect to AI agent. Is the backend running?")
    } finally {
      setIsUploading(false)
    }
  }

  const handleSave = async () => {
    if (!uploadResult) return
    setIsSaving(true)
    try {
      const res = await saveResumeData({
        skills: uploadResult.skills || [],
        experience: uploadResult.experience || [],
        education: uploadResult.education || [],
        personal_info: uploadResult.personal_info || {},
      })
      if (res.success) {
        toast.success("✅ Resume saved! Recalculating match scores...");
        
        // Trigger server match score update
        if (res.userId) {
          const agentApi = process.env.NEXT_PUBLIC_AGENT_SERVICE_URL || "https://jobpilot-agents-704256979090.europe-west1.run.app"
          fetch(`${agentApi}/agent/recalculate-scores`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: res.userId })
          }).then(() => {
             toast.success("🎯 Match scores updated!");
             router.refresh();
          }).catch(err => console.error("Recalculate failed:", err));
        }
        
        setUploadFile(null); setUploadResult(null)
        router.refresh()
      } else {
        console.error("[CRITICAL] Save Resume Error:", res.error);
        toast.error(`Failed to save: ${res.error || "Unknown server error"}`);
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleSetActive = async (id: string) => {
    setIsSaving(true)
    try {
      const res = await setActiveResume(id)
      if (res.success) {
        toast.success("✅ Resume activated! Recalculating match scores...");

        if (res.userId) {
          const agentApi = process.env.NEXT_PUBLIC_AGENT_SERVICE_URL || "https://jobpilot-agents-704256979090.europe-west1.run.app"
          fetch(`${agentApi}/agent/recalculate-scores`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: res.userId })
          }).then(() => {
            toast.success("🎯 All match scores updated!");
            router.refresh();
          });
        }
        router.refresh()
      } else {
        toast.error(res.error || "Activation failed")
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="grid lg:grid-cols-12 gap-12">

      {/* ── LEFT: Upload + Version Catalog ── */}
      <div className="lg:col-span-4 space-y-4">

        {/* Upload Zone */}
        <div className="space-y-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <FileUp size={12} className="text-primary" /> Upload New Resume
          </div>

          <div
            onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300 group
              ${isDragging ? "border-primary bg-primary/8 scale-[1.02]"
                : uploadFile ? "border-emerald-500/40 bg-emerald-500/5"
                  : "border-muted/20 hover:border-primary/40 hover:bg-primary/3 bg-surface-container-low"}`}
          >
            <input ref={fileInputRef} type="file" accept=".pdf,.txt" className="hidden"
              onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
            <AnimatePresence mode="wait">
              {uploadFile ? (
                <motion.div key="file" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-2 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
                    <FileText size={24} className="text-emerald-400" />
                  </div>
                  <p className="text-sm font-bold text-on-surface truncate max-w-full">{uploadFile.name}</p>
                  <p className="text-[10px] text-muted-foreground">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                  <button onClick={e => { e.stopPropagation(); setUploadFile(null); setUploadResult(null) }}
                    className="text-[10px] text-danger/60 hover:text-danger flex items-center gap-1 mt-1">
                    <X size={10} /> Remove
                  </button>
                </motion.div>
              ) : (
                <motion.div key="drop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-2 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CloudUpload size={24} className="text-primary" />
                  </div>
                  <p className="text-sm font-bold text-on-surface">Drop resume here</p>
                  <p className="text-[10px] text-muted-foreground">PDF or TXT · Click to browse</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {uploadFile && !uploadResult && (
            <Button onClick={handleUpload} disabled={isUploading}
              className="w-full h-11 signature-gradient rounded-2xl font-bold text-xs shadow-lg hover:scale-[1.01] transition-all flex gap-2">
              {isUploading ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {isUploading ? "Analyzing with Gemini..." : "Parse with AI"}
            </Button>
          )}

          <AnimatePresence>
            {uploadResult && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="p-5 rounded-2xl bg-surface-container-low border border-emerald-500/20 space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Parsed Successfully</span>
                </div>
                {uploadResult.skills?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Skills ({uploadResult.skills.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {uploadResult.skills.slice(0, 12).map((s: string) => (
                        <span key={s} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-primary/10 text-primary">{s}</span>
                      ))}
                      {uploadResult.skills.length > 12 && <span className="text-[10px] text-muted-foreground px-2 py-1">+{uploadResult.skills.length - 12} more</span>}
                    </div>
                  </div>
                )}
                {uploadResult.experience?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Experience</p>
                    {uploadResult.experience.slice(0, 2).map((e: any, i: number) => (
                      <p key={i} className="text-xs text-on-surface font-medium">• {e.role} @ {e.company}</p>
                    ))}
                  </div>
                )}
                <Button onClick={handleSave} disabled={isSaving}
                  className="w-full h-10 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs flex gap-2">
                  {isSaving ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                  {isSaving ? "Saving..." : "Save to Profile"}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Divider */}
        {initialResumes.length > 0 && (
          <div className="flex items-center gap-3 py-2">
            <div className="flex-1 h-px bg-muted/10" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">History</span>
            <div className="flex-1 h-px bg-muted/10" />
          </div>
        )}

        {/* Version Catalog */}
        {initialResumes.map((v) => {
          const vSkills = (v.parsed_skills as string[]) || []
          const vExp = (v.parsed_experience as any[]) || []
          const isActive = selectedResumeId === v.id
          const isLatest = v.id === latestResume?.id
          return (
            <button key={v.id} onClick={() => { setSelectedResumeId(v.id); setRightPanel("resume"); setGapData(null); setUploadResult(null) }}
              className={`w-full p-6 rounded-[2rem] transition-all duration-300 text-left flex flex-col gap-3
               ${isActive ? 'bg-primary text-white shadow-2xl shadow-primary/20 scale-[1.02]'
                  : 'bg-surface-container-low text-muted-foreground hover:bg-surface-container-lowest border border-white hover:shadow-sm hover:scale-[1.01]'}`}
            >
              <div className="flex justify-between items-center w-full">
                <div className={`text-[9px] font-bold uppercase tracking-widest ${isActive ? 'text-white/50' : 'text-muted-foreground/60'}`}>
                  Resume Version
                </div>
                <div className="flex items-center gap-1.5">
                  {isLatest && (
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-emerald-500/15 text-emerald-500'}`}>
                      ACTIVE
                    </span>
                  )}
                  <span className={`text-sm font-bold ${isActive ? 'text-white' : 'text-primary'}`}>
                    {vSkills.length} skills
                  </span>
                </div>
              </div>

              <div>
                <h3 className={`text-base font-bold tracking-tight ${isActive ? 'text-white' : 'text-on-surface'}`}>
                  {vExp[0]?.role || `Version ${v.id.slice(0, 8)}`}
                </h3>
                {vExp[0]?.company && (
                  <p className={`text-[11px] ${isActive ? 'text-white/60' : 'text-muted-foreground'}`}>
                    {vExp[0].company}
                  </p>
                )}
              </div>

              <div className={`flex items-center gap-2 text-[10px] font-bold ${isActive ? 'text-white/50' : 'text-muted-foreground/60'}`}>
                <Calendar size={10} />
                {new Date(v.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                {vSkills.length > 0 && (
                  <span className="ml-auto truncate max-w-[120px]">{vSkills.slice(0, 3).join(", ")}{vSkills.length > 3 ? "..." : ""}</span>
                )}
              </div>
            </button>
          )
        })}

        {/* Gap Analysis Engine */}
        {initialResumes.length > 0 && (
          <div className="pt-2">
            <div className="p-6 bg-surface-container-lowest rounded-[2rem] border border-white shadow-sm space-y-5">
              <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <TrendingUp size={14} className="text-primary" /> Gap Analysis Engine
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-primary mb-3">Target Role</div>
                <input value={targetRole} onChange={e => setTargetRole(e.target.value)}
                  className="w-full h-12 px-4 bg-surface-container-low border-none rounded-xl font-bold text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/20"
                  placeholder="e.g. Senior Software Engineer" />
              </div>
              <Button onClick={handleGapAnalysis} disabled={isAnalyzing || skills.length === 0}
                className="w-full signature-gradient h-12 rounded-2xl font-bold text-xs shadow-xl shadow-primary/10 hover:scale-[1.02] transition-all flex gap-2">
                {isAnalyzing ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {isAnalyzing ? "Analyzing..." : skills.length === 0 ? "Upload resume first" : "Run Gap Analysis"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT: Resume Detail / Gap Analysis ── */}
      <div className="lg:col-span-8">
        <AnimatePresence mode="wait">

          {/* No resume state */}
          {initialResumes.length === 0 && (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center text-center p-16 rounded-[4rem] bg-surface-container-low/30 border-2 border-dashed border-on-surface/5 opacity-30 space-y-4">
              <div className="w-20 h-20 rounded-full bg-surface-container-low flex items-center justify-center">
                <FileText size={32} className="text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-bold italic">No Resume Yet</h3>
              <p className="text-sm font-bold uppercase tracking-widest max-w-xs">Upload your resume to unlock AI match scoring and gap analysis.</p>
            </motion.div>
          )}

          {/* Resume detail view */}
          {selectedResume && rightPanel === "resume" && (
            <motion.div key={`resume-${selectedResumeId}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }} className="space-y-6">

              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2 flex items-center gap-2">
                    <Zap size={10} /> Resume Profile
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-on-surface">
                    {experience[0]?.role || "Your Resume"}
                  </h2>
                  {experience[0]?.company && (
                    <p className="text-sm text-muted-foreground mt-1">{experience[0].company} · {experience[0].duration || experience[0].years || ""}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground bg-surface-container-low px-3 py-1.5 rounded-full">
                    <Calendar size={10} />
                    {new Date(selectedResume.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                  </div>

                  {selectedResume.id !== latestResume?.id && !uploadResult && (
                    <Button
                      size="xs"
                      onClick={() => handleSetActive(selectedResume.id)}
                      disabled={isSaving}
                      className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white rounded-xl font-bold h-7 px-3 text-[9px] uppercase tracking-widest"
                    >
                      {isSaving ? "Setting..." : "Set as Active"}
                    </Button>
                  )}
                </div>
              </div>

              {/* Skills */}
              {skills.length > 0 && (
                <div className="p-6 rounded-3xl bg-surface-container-low border border-white space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Brain size={14} className="text-primary" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Skills Detected</span>
                    <span className="ml-auto text-[11px] font-bold text-primary">{skills.length} total</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((s: string) => (
                      <span key={s} className="text-xs font-bold px-3 py-1.5 rounded-xl bg-primary/8 text-primary border border-primary/10 hover:bg-primary/15 transition-colors">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience */}
              {experience.length > 0 && (
                <div className="p-6 rounded-3xl bg-surface-container-low border border-white space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                      <Briefcase size={14} className="text-indigo-400" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Work Experience</span>
                  </div>
                  <div className="space-y-3">
                    {experience.map((e: any, i: number) => (
                      <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-surface-container-lowest">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0 text-sm font-bold text-indigo-400">
                          {(e.company || e.role || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-on-surface">{e.role}</p>
                          <p className="text-[11px] text-muted-foreground">{e.company}</p>
                          {(e.duration || e.years) && (
                            <p className="text-[10px] text-primary font-bold mt-0.5">{e.duration || e.years}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {education.length > 0 && (
                <div className="p-6 rounded-3xl bg-surface-container-low border border-white space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <GraduationCap size={14} className="text-emerald-400" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Education</span>
                  </div>
                  <div className="space-y-3">
                    {education.map((e: any, i: number) => (
                      <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-surface-container-lowest">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                          <GraduationCap size={14} className="text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-on-surface">{e.degree}</p>
                          <p className="text-[11px] text-muted-foreground">{e.institution}</p>
                          {e.year && <p className="text-[10px] text-primary font-bold mt-0.5">Class of {e.year}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty fields hint */}
              {skills.length === 0 && experience.length === 0 && education.length === 0 && (
                <div className="p-10 rounded-3xl bg-surface-container-low border border-white text-center opacity-40 space-y-3">
                  <FileText size={28} className="mx-auto text-muted-foreground" />
                  <p className="text-sm font-bold">This version has no parsed data.</p>
                  <p className="text-[11px] text-muted-foreground">Try uploading a new, complete resume file.</p>
                </div>
              )}

              {/* Prompt to run gap analysis */}
              {skills.length > 0 && (
                <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-on-surface">Ready for Gap Analysis</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Enter a target role in the panel and run analysis to see what skills you're missing.</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <TrendingUp size={16} className="text-primary" />
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Gap analysis results */}
          {rightPanel === "gap" && gapData && (
            <motion.div key="gap" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Gap Analysis Results</div>
                  <h2 className="text-xl font-bold tracking-tight">{targetRole}</h2>
                </div>
                <button onClick={() => setRightPanel("resume")}
                  className="text-[10px] font-bold text-muted-foreground hover:text-primary flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-primary/5 transition-all">
                  ← Back to Resume
                </button>
              </div>

              <div className="grid md:grid-cols-3 gap-5">
                <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 space-y-4">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                    <Check size={12} /> Matched
                  </div>
                  {gapData.matched_skills?.map((s: string) => (
                    <div key={s} className="text-sm font-bold flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      {s}
                    </div>
                  ))}
                </div>
                <div className="p-6 rounded-3xl bg-red-500/5 border border-red-500/20 space-y-4">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-red-400 flex items-center gap-2">
                    <AlertTriangle size={12} /> Missing
                  </div>
                  {gapData.missing_skills?.map((s: string) => (
                    <div key={s} className="text-sm font-bold flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                      {s}
                    </div>
                  ))}
                </div>
                <div className="p-6 rounded-3xl bg-amber-500/5 border border-amber-500/20 space-y-4">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-amber-400 flex items-center gap-2">
                    <TrendingUp size={12} /> Stretch
                  </div>
                  {gapData.stretch_skills?.map((s: string) => (
                    <div key={s} className="text-sm font-bold flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      {s}
                    </div>
                  ))}
                </div>
              </div>

              {gapData.action_plan?.length > 0 && (
                <div className="p-8 rounded-3xl bg-surface-container-lowest border border-white shadow-sm space-y-4">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                    <Sparkles size={12} /> Action Plan
                  </div>
                  {gapData.action_plan.map((r: string, i: number) => (
                    <p key={i} className="text-sm font-bold leading-relaxed flex gap-3">
                      <span className="text-primary shrink-0">{i + 1}.</span> {r}
                    </p>
                  ))}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
