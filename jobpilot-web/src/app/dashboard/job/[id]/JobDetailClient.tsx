"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

import { 
  ArrowLeft, Briefcase, DollarSign, Clock, Check, Star, Share2,
  ExternalLink, Sparkles, Zap, MessageSquare, FileText, Users, Copy, RefreshCw,
  Download, ListChecks
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"
import { useTailorResume, useCoverLetter, useScheduleNotification } from "@/hooks/useAgent"
import jsPDF from "jspdf"


import { saveJobTailoredResult } from "@/lib/actions/onboarding"

export default function JobDetailClient({ job, userEmail }: { job: any, userEmail: string }) {
  const { data: session } = useSession()
  const accessToken = (session as any)?.accessToken || ""



  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"overview" | "tailor" | "cover">("overview")
  const [tailorResult, setTailorResult] = useState<any>(job.tailoredResult || null)
  const [coverResult, setCoverResult] = useState<string | null>(null)
  const [copiedCover, setCopiedCover] = useState(false)

  const { mutateAsync: tailorResume, isPending: isTailoring } = useTailorResume()
  const { mutateAsync: generateCoverLetter, isPending: isGeneratingCover } = useCoverLetter()
  const [notified, setNotified] = useState(false)
  const { mutateAsync: scheduleNotification, isPending: isSchedulingNotify } = useScheduleNotification()
  const [syncResult, setSyncResult] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleInboxSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_AGENT_SERVICE_URL}/agent/monitor-gmail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_domain: job.company.toLowerCase() + ".com" })
      });
      const data = await res.json();
      if (data.status === "success") {
        setSyncResult(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  }

  const handleTailor = async () => {
    const res = await tailorResume({
      user_id: (session?.user as any)?.id,
      email: session?.user?.email,
      job_title: job.title,
      company_name: job.company,
      job_description: job.description,
      resume_text: "Dynamic Resume Node"
    })
    
    if (res.status === "success") {
      setTailorResult(res.data)
      // Persist to DB
      await saveJobTailoredResult(job.id, res.data);
    }
  }

  const handleCoverLetter = async () => {
    const res = await generateCoverLetter({
      user_id: (session?.user as any)?.id,
      email: session?.user?.email,
      resume_text: "Dynamic Resume Node",
      job_description: job.description,
      company_name: job.company,
      job_title: job.title
    })
    if (res.status === "success") setCoverResult(res.data.cover_letter)
  }

  const downloadTailoredResume = useCallback(() => {
    console.log("📥 [Download] Starting PDF generation...");
    if (!tailorResult?.tailored_resume) {
      alert("Please wait for the resume to be tailored first.");
      return;
    }

    try {
      // Initialize Library
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const content = tailorResult.tailored_resume;
      const company = job.company || "Company";
      // User Information & Contact info from AI extraction
      const fullName = (session?.user?.name || "Candidate Name").toUpperCase();
      const email = session?.user?.email || "email@example.com";
      const contactInfoObj = tailorResult?.contact_info || {};
      
      const contactParts = [email];
      if (contactInfoObj.phone && contactInfoObj.phone !== "null" && contactInfoObj.phone !== "extracted phone or null") contactParts.push(contactInfoObj.phone);
      if (contactInfoObj.location && contactInfoObj.location !== "null" && contactInfoObj.location !== "extracted city/state or null") contactParts.push(contactInfoObj.location);
      if (contactInfoObj.linkedin && contactInfoObj.linkedin !== "null" && contactInfoObj.linkedin !== "extracted linkedin url or null") contactParts.push(contactInfoObj.linkedin);
      if (contactInfoObj.website && contactInfoObj.website !== "null" && contactInfoObj.website !== "portfolio or personal site url or null") contactParts.push(contactInfoObj.website);
      
      const contactLine = contactParts.join("  |  ");

      // Precise Filename
      const firstName = fullName.split(' ')[0];
      const safeCompany = company.replace(/[^a-z0-9]/gi, '_');
      const filename = `${firstName}_${safeCompany}_Resume.pdf`.replace(/_{2,}/g, '_');

      console.log(`📄 [Download] Target: ${filename}`);

      // --- Contact Information Header ---
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(0, 0, 0);
      const nameWidth = doc.getTextWidth(fullName);
      doc.text(fullName, (pageWidth - nameWidth) / 2, 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      const contactWidth = doc.getTextWidth(contactLine);
      doc.text(contactLine, (pageWidth - contactWidth) / 2, 26);
      
      // Divider Line
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.3);
      doc.line(margin, 30, pageWidth - margin, 30);

      // --- Body Content ---
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(33, 33, 33);
      
      const lines = doc.splitTextToSize(content, pageWidth - (margin * 2));
      let cursorY = 42; // Higher start now that sub-header is gone

      lines.forEach((line: string) => {
        if (cursorY > 275) {
          doc.addPage();
          cursorY = 20;
        }
        doc.text(line, margin, cursorY);
        cursorY += 6.5;
      });

      // Final Save
      doc.save(filename);
      console.log("✅ [Download] Successfully sent to browser.");
    } catch (err: any) {
      console.error("❌ [Download] PDF Critical Failure:", err);
      alert("PDF generation failed. Try copying the text below instead.");
    }
  }, [tailorResult, job, session])
  const handleNotify = async () => {
    try {
      await scheduleNotification({
        job_title: job.title,
        company: job.company,
        user_email: userEmail || "test-user@example.com",
        access_token: accessToken,


        delay_seconds: 10
      })
      setNotified(true)
      setTimeout(() => setNotified(false), 5000)
    } catch (e) {
      console.error(e)
    }
  }

  const copyCover = () => {
    if (coverResult) {
      navigator.clipboard.writeText(coverResult)
      setCopiedCover(true)
      setTimeout(() => setCopiedCover(false), 2000)
    }
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: <Briefcase size={14} /> },
    { id: "tailor", label: "Tailor Resume", icon: <Sparkles size={14} /> },
    { id: "cover", label: "Cover Letter", icon: <MessageSquare size={14} /> },
  ]

  return (
    <div className="min-h-screen bg-surface p-8 max-w-7xl mx-auto selection:bg-primary/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <Button variant="ghost" onClick={() => router.back()} className="flex items-center gap-2 text-muted-foreground hover:bg-surface-container-low h-12 px-6 rounded-xl font-bold text-sm no-line">
          <ArrowLeft size={18} /> Back
        </Button>
        <div className="flex gap-3">
          <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl border border-border/10 hover:bg-surface-container-low">
            <Share2 size={18} />
          </Button>
          <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl border border-border/10 hover:bg-surface-container-low">
            <Star size={18} className="text-warning fill-warning" />
          </Button>
          <a 
            href={job.applyUrl && job.applyUrl.trim() !== "" && job.applyUrl !== "#" ? job.applyUrl : `https://www.google.com/search?q=${encodeURIComponent(job.company + " " + job.title + " careers")}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center whitespace-nowrap signature-gradient h-12 px-8 rounded-xl font-bold text-sm text-white shadow-xl shadow-primary/10 hover:opacity-90 transition-all"
          >
            Apply via Broker <ExternalLink size={16} className="ml-2" />
          </a>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-8 animate-in fade-in slide-in-from-left-6 duration-1000">
          {/* Job Header */}
          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-[1.5rem] signature-gradient flex items-center justify-center text-white font-bold text-2xl shadow-xl shadow-primary/10">{job.company[0]}</div>
              <div className="space-y-1">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-on-surface">{job.title}</h1>
                <div className="flex items-center gap-3 text-sm font-bold text-primary italic uppercase tracking-widest">
                  <span>{job.company}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-muted/20" />
                  <span className="text-muted-foreground">{job.location}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              {[
                { icon: <Briefcase size={16} />, value: "Full-Time" },
                { icon: <DollarSign size={16} />, value: job.salary },
                { icon: <Clock size={16} />, value: job.posted }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3 bg-surface-container-low rounded-xl border border-white text-sm font-bold text-on-surface/70">
                  <span className="text-primary">{item.icon}</span> {item.value}
                </div>
              ))}
            </div>
          </div>

          {/* Tab Bar */}
          <div className="flex gap-2 p-1.5 bg-surface-container-low rounded-2xl w-fit border border-white">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all
                  ${activeTab === tab.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-surface-container-lowest'}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "overview" && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="p-10 rounded-[2.5rem] bg-surface-container-lowest border border-white shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-8">Job Description</div>
                <div className="prose prose-neutral max-w-none text-on-surface/80 leading-[1.8] font-medium text-base whitespace-pre-line">
                  {job.description}
                </div>
              </motion.div>
            )}

            {activeTab === "tailor" && (
              <motion.div key="tailor" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                {!tailorResult ? (
                  <div className="p-14 rounded-[3rem] bg-surface-container-lowest border border-white shadow-sm text-center space-y-8">
                    <div className="w-20 h-20 rounded-full signature-gradient flex items-center justify-center mx-auto shadow-2xl shadow-primary/20">
                      <Sparkles size={32} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold mb-3">ATS Resume Tailoring</h3>
                      <p className="text-muted-foreground font-medium max-w-md mx-auto leading-relaxed">
                        Our AI Agents will analyze this job description and rewrite your resume bullets with targeted keywords to maximize your ATS score for this specific role.
                      </p>
                    </div>
                    <Button
                      onClick={handleTailor}
                      disabled={isTailoring}
                      className="signature-gradient h-14 px-12 rounded-2xl font-bold shadow-2xl shadow-primary/20 hover:scale-[1.02] transition-all flex gap-3 mx-auto"
                    >
                      {isTailoring ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />}
                      {isTailoring ? "Tailoring Resume..." : (tailorResult ? "Regenerate Tailored Resume" : "Initiate Auto-Tailoring")}
                    </Button>
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <div className="grid grid-cols-3 gap-5">
                      <div className="p-8 rounded-3xl bg-surface-container-low border border-border/10 text-center">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Original Score</div>
                        <div className="text-4xl font-data font-bold text-muted-foreground italic">{tailorResult.original_ats_score}%</div>
                      </div>
                      <div className="p-8 rounded-3xl bg-primary/5 border border-primary/20 text-center relative overflow-hidden ring-4 ring-primary/5 transition-all hover:scale-[1.02]">
                        <div className="absolute top-3 right-3 text-primary animate-pulse"><Sparkles size={14} /></div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-primary mb-3">Tailored Score</div>
                        <div className="text-5xl font-data font-bold text-primary italic">{tailorResult.tailored_ats_score}%</div>
                      </div>
                      <div className="p-8 rounded-3xl bg-success/5 border border-success/20 text-center">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-success mb-3">AI Confidence</div>
                        <div className="text-4xl font-data font-bold text-success italic">{((tailorResult.confidence_score || 0.85) * 100).toFixed(0)}%</div>
                      </div>
                    </div>

                    <div className="p-8 rounded-3xl bg-surface-container-low border border-white space-y-6">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        <ListChecks size={14} /> Strategic Improvements
                      </div>
                      <ul className="space-y-3">
                        {tailorResult.changes_made?.map((change: string, idx: number) => (
                          <li key={idx} className="flex gap-3 text-sm font-medium text-on-surface/80">
                            <Check size={16} className="text-success shrink-0 mt-0.5" />
                            {change}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-10 rounded-[2.5rem] bg-surface-container-lowest border border-white shadow-sm space-y-8">
                      <div className="flex items-center justify-between">
                         <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tailored Resume Preview</div>
                        <Button id="download-resume-btn" variant="ghost" onClick={downloadTailoredResume} className="h-10 px-6 rounded-xl border border-primary/20 text-primary font-bold text-xs gap-2 no-line hover:bg-primary/5">
                           <Download size={14} /> Download .PDF
                        </Button>
                        <Button 
                          variant="ghost" 
                          onClick={() => setTailorResult(null)} 
                          className="h-10 px-4 rounded-xl text-muted-foreground font-bold text-xs gap-2 no-line hover:bg-surface-container-low"
                        >
                           <RefreshCw size={14} /> Regenerate
                        </Button>
                      </div>
                      <div className="prose prose-neutral max-w-none text-on-surface/70 leading-[1.7] font-medium text-sm whitespace-pre-line bg-surface-container-low/30 p-8 rounded-2xl border border-dashed border-border/20 italic">
                        {tailorResult.tailored_resume}
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {activeTab === "cover" && (
              <motion.div key="cover" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                 {/* ... (Cover letter UI) ... */}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="lg:col-span-4 space-y-8 animate-in fade-in slide-in-from-right-6 duration-1000 h-fit lg:sticky lg:top-8">
          <div className="p-10 bg-surface-container-lowest border border-white shadow-2xl shadow-primary/5 rounded-[2.5rem] relative overflow-hidden group space-y-8">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                <Sparkles size={14} className="match-pulse" /> AI Match Audit
              </div>
              <Badge variant="ghost" className="bg-primary/5 text-primary no-line h-6 px-3 rounded-full text-[10px] font-bold font-data italic">VALIDATED</Badge>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-8xl font-data font-bold tracking-tighter italic text-primary">
                {tailorResult?.tailored_ats_score || job.matchScore}
              </span>
              <span className="text-sm font-bold uppercase tracking-widest opacity-30">%</span>
            </div>
            <p className="text-xs font-bold leading-relaxed text-muted-foreground italic border-l-2 pl-4 border-primary/20">
              &ldquo;{job.matchReason}&rdquo;
            </p>
            <Button
              onClick={handleNotify}
              disabled={isSchedulingNotify || notified}
              variant="outline"
              className={`w-full h-12 rounded-2xl font-bold transition-all border-2 ${notified ? 'border-success text-success bg-success/5' : 'border-primary/20 hover:border-primary text-primary'}`}
            >
              {isSchedulingNotify ? <RefreshCw size={16} className="animate-spin mr-2" /> : (notified ? <Check size={16} className="mr-2" /> : <Zap size={16} className="mr-2" />)}
              {isSchedulingNotify ? "Scheduling..." : (notified ? "Notification Set" : "Notify Me via AI Agent")}
            </Button>
          </div>

          <div className="p-10 bg-surface-container-low border border-white shadow-sm rounded-[2.5rem] space-y-6">
             <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <Clock size={14} /> Agentic Inbox Monitor
             </div>
             <div className="space-y-4">
                <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                   Our agents scan your authenticated inbox daily for recruiter replies.
                </p>
                
                {syncResult ? (
                   <div className="p-4 rounded-xl bg-success/10 border border-success/20 animate-in zoom-in-95 duration-500">
                      <div className="text-[10px] font-bold text-success uppercase tracking-widest mb-1 flex items-center gap-2">
                         <Check size={12} /> {syncResult.status}
                      </div>
                      <p className="text-[11px] text-on-surface font-medium italic">"{syncResult.email_excerpt}"</p>
                   </div>
                ) : (
                   <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleInboxSync}
                      className="w-full h-10 rounded-xl border border-border/10 text-[10px] font-bold uppercase tracking-widest hover:bg-white no-line"
                   >
                      {isSyncing ? <RefreshCw size={14} className="animate-spin mr-2" /> : "Manual Sync Now"}
                   </Button>
                )}
             </div>
          </div>

        </div>
      </div>
    </div>
  )
}
