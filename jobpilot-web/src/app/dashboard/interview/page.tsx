"use client"

import { useState, useRef, useEffect } from "react"
import { 
  Play, MessageSquare, Sparkles, Zap, Check, ChevronRight,
  TrendingUp, Send, Mic, StopCircle, Award, Star, RotateCcw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"
import { getMockInterviewSessions, getUserProfile, getUserJobs } from "@/lib/actions/onboarding"
import axios from "axios"

const AGENT_API = process.env.NEXT_PUBLIC_AGENT_SERVICE_URL || "http://localhost:8000"

type ChatMsg = {
  role: "ai" | "user"
  content: string
  feedback?: string
}

type Evaluation = {
  overall_score: number
  strengths: string[]
  improvements: string[]
  summary: string
}

type SimConfig = {
  company: string
  role: string
  jd?: string
  totalQuestions: number
}

export default function InterviewPrepPage() {
  const [phase, setPhase] = useState<"setup" | "simulation" | "result">("setup")
  const [config, setConfig] = useState<SimConfig>({ 
    company: "", 
    role: "", 
    totalQuestions: 5 
  })
  const [availableJobs, setAvailableJobs] = useState<any[]>([])
  const [selectedCompany, setSelectedCompany] = useState("")
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [turn, setTurn] = useState(0)
  const [answer, setAnswer] = useState("")
  const [loading, setLoading] = useState(false)
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [totalQuestions, setTotalQuestions] = useState(5)
  const [pastSessions, setPastSessions] = useState<any[]>([])
  const [userEmail, setUserEmail] = useState<string | null>(null)
  
  const bottomRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    async function loadData() {
      const [sessions, profile, jobs] = await Promise.all([
        getMockInterviewSessions(),
        getUserProfile(),
        getUserJobs()
      ]);
      setPastSessions(sessions);
      setUserEmail(profile?.email || null);
      setAvailableJobs(jobs || []);
    }
    loadData();
  }, [phase]); // Reload when ending session

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  const startSimulation = async () => {
    setPhase("simulation")
    setMessages([])
    setTurn(0)
    setLoading(true)
    try {
      const res = await axios.post(`${AGENT_API}/agent/mock-interview`, {
        turn: 0, 
        user_answer: "", 
        company_name: config.company, 
        job_title: config.role,
        job_description: config.jd,
        total_questions: config.totalQuestions,
        user_email: userEmail
      })
      if (res.data.status === "success") {
        const d = res.data.data
        setTotalQuestions(d.total_questions || 5)
        setMessages([{ role: "ai", content: d.question }])
        setTurn(1)
      }
    } catch (e) {
      setMessages([{ role: "ai", content: "Tell me about yourself and your background." }])
      setTurn(1)
    }
    setLoading(false)
  }

  const submitAnswer = async () => {
    if (!answer.trim()) return
    const userAnswer = answer.trim()
    setAnswer("")
    setMessages(prev => [...prev, { role: "user", content: userAnswer }])
    setLoading(true)

    try {
      const res = await axios.post(`${AGENT_API}/agent/mock-interview`, {
        turn, 
        user_answer: userAnswer, 
        company_name: config.company, 
        job_title: config.role,
        job_description: config.jd,
        total_questions: config.totalQuestions,
        user_email: userEmail
      })
      if (res.data.status === "success") {
        const d = res.data.data
        if (d.done) {
          setEvaluation(d.evaluation)
          setPhase("result")
        } else {
          const msgs: ChatMsg[] = []
          if (d.feedback_on_previous) {
            msgs.push({ role: "ai", content: `💡 **Feedback:** ${d.feedback_on_previous}`, feedback: d.feedback_on_previous })
          }
          msgs.push({ role: "ai", content: `**Q${d.question_number}/${d.total_questions}:** ${d.question}` })
          setMessages(prev => [...prev, ...msgs])
          setTurn(prev => prev + 1)
        }
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: "ai", content: "Great answer! Moving on to the next question..." }])
    }
    setLoading(false)
  }

  const resetSimulation = () => {
    setPhase("setup")
    setMessages([])
    setTurn(0)
    setEvaluation(null)
    setAnswer("")
  }

  const companies = Array.from(new Set(availableJobs.map(j => j.company))).sort();
  const jobsForSelectedCompany = availableJobs.filter(j => j.company === selectedCompany);

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-surface selection:bg-primary/10">
      <AnimatePresence mode="wait">
        {/* SETUP PHASE */}
        {phase === "setup" && (
          <motion.div key="setup" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 mb-8">
              <div className="space-y-3">
                <h1 className="text-5xl font-bold tracking-tight text-on-surface leading-none">
                  Simulate <br /><span className="text-primary underline decoration-primary/20 italic">The Encounter.</span>
                </h1>
                <p className="text-lg text-muted-foreground font-medium max-w-lg leading-relaxed">
                  Select a role from your pipeline or enter custom details to begin your AI-driven simulation.
                </p>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Config Card */}
              <div className="p-10 rounded-[3rem] bg-surface-container-lowest border border-white shadow-sm space-y-10">
                
                {/* Pipeline Selection */}
                {availableJobs.length > 0 && (
                  <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                      <Sparkles size={16} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Select from your Pipeline</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold opacity-50 ml-1">COMPANY</label>
                        <select 
                          value={selectedCompany}
                          onChange={(e) => {
                            setSelectedCompany(e.target.value);
                            setConfig(p => ({ ...p, company: e.target.value, role: "", jd: "" }));
                          }}
                          className="w-full h-12 px-4 bg-white border-none rounded-2xl font-bold text-sm text-on-surface focus:ring-1 focus:ring-primary/30"
                        >
                          <option value="">Select Company...</option>
                          {companies.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold opacity-50 ml-1">JOB ROLE</label>
                        <select 
                          disabled={!selectedCompany}
                          value={availableJobs.find(j => j.title === config.role && j.company === selectedCompany)?.id || ""}
                          onChange={(e) => {
                            const job = availableJobs.find(j => j.id === e.target.value);
                            if (job) {
                              setConfig({ 
                                company: job.company, 
                                role: job.title, 
                                jd: job.description,
                                totalQuestions: config.totalQuestions 
                              });
                            }
                          }}
                          className="w-full h-12 px-4 bg-white border-none rounded-2xl font-bold text-sm text-on-surface focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
                        >
                          <option value="">Select Role...</option>
                          {jobsForSelectedCompany.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-8">
                  {/* Question Limit Selection */}
                  <div className="space-y-4">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-primary">SESSION DURATION</div>
                    <div className="grid grid-cols-3 gap-3 p-1.5 bg-surface-container-low rounded-2xl">
                      {[3, 5, 10].map((num) => (
                        <button
                          key={num}
                          onClick={() => setConfig(p => ({ ...p, totalQuestions: num }))}
                          className={`h-11 rounded-xl font-bold text-sm transition-all ${
                            config.totalQuestions === num 
                            ? "bg-white shadow-sm text-primary" 
                            : "text-muted-foreground hover:bg-white/50"
                          }`}
                        >
                          {num} Questions
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-primary mb-4">Target Company</div>
                    <input
                      value={config.company}
                      onChange={e => {
                        setConfig(p => ({...p, company: e.target.value}));
                        setSelectedCompany(""); // Clear pipeline selection if manually edited
                      }}
                      className="w-full h-14 px-6 bg-surface-container-low border-none rounded-2xl font-bold text-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/30"
                      placeholder="e.g. Google, Stripe, Apple"
                    />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-primary mb-4">Target Role</div>
                    <input
                      value={config.role}
                      onChange={e => setConfig(p => ({...p, role: e.target.value}))}
                      className="w-full h-14 px-6 bg-surface-container-low border-none rounded-2xl font-bold text-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/30"
                      placeholder="e.g. Senior Frontend Engineer"
                    />
                  </div>
                </div>

                <Button
                  onClick={startSimulation}
                  disabled={!config.company || !config.role}
                  className="w-full signature-gradient h-16 rounded-2xl font-bold text-md shadow-2xl shadow-primary/20 flex gap-3 hover:scale-[1.02] transition-all"
                >
                  <Play size={20} /> Enter Simulation Room
                </Button>
              </div>

              {/* Feature Card */}
              <div className="p-10 rounded-[3rem] signature-gradient text-white shadow-2xl shadow-primary/20 relative overflow-hidden group space-y-10">
                <div className="relative z-10">
                  <div className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-4">What to Expect</div>
                  <h3 className="text-3xl font-bold tracking-tight mb-8">5-Question Simulation + Live Feedback</h3>
                  {[
                    "Behavioral, Technical & Situational questions",
                    "Real-time AI feedback after each answer",
                    "Final evaluation scorecard with strengths & gaps",
                    "Tailored to company culture & role requirements"
                  ].map((f, i) => (
                    <div key={i} className="flex items-start gap-4 mb-5">
                      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Check size={12} />
                      </div>
                      <span className="text-sm font-bold opacity-90 leading-relaxed">{f}</span>
                    </div>
                  ))}
                </div>
                <Sparkles size={220} className="absolute -bottom-16 -right-16 text-white/5 group-hover:scale-110 transition-all duration-1000" />
              </div>
            </div>

            {/* Past Sessions */}
            <div className="pt-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-6">Historical Performance</div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pastSessions.length > 0 ? (
                  pastSessions.map((sess, i) => (
                    <motion.div 
                      key={sess.id} 
                      initial={{ opacity: 0, scale: 0.9 }} 
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-6 rounded-[2rem] bg-surface-container-low border border-border/5 hover:bg-surface-container-lowest transition-all group"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-xl signature-gradient flex items-center justify-center text-white font-bold shadow-lg shadow-primary/10">
                          {sess.application?.job?.company?.[0] || "J"}
                        </div>
                        <Badge variant="outline" className="font-bold text-[10px] border-primary/20 text-primary">
                          {sess.overall_score}%
                        </Badge>
                      </div>
                      <h4 className="font-bold text-sm text-on-surface mb-1 truncate">{sess.application?.job?.title || "Mock Interview"}</h4>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{sess.application?.job?.company || "General Practice"}</p>
                      
                      <div className="mt-4 pt-4 border-t border-border/5 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {new Date(sess.created_at).toLocaleDateString()}
                        </span>
                        <ChevronRight size={14} className="text-primary group-hover:translate-x-1 transition-transform" />
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full p-12 rounded-[3rem] bg-surface-container-low/50 border-2 border-dashed border-on-surface/5 flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                     <div className="w-16 h-16 rounded-full bg-surface-container-lowest flex items-center justify-center text-muted-foreground">
                        <TrendingUp size={24} />
                     </div>
                     <p className="text-[10px] font-bold uppercase tracking-[0.2em]">No simulation nodes <br/> active in history</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* SIMULATION PHASE */}
        {phase === "simulation" && (
          <motion.div key="sim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-[calc(100vh-130px)]">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl signature-gradient flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary/20">
                  {config.company[0]}
                </div>
                <div>
                  <h2 className="font-bold text-xl tracking-tight">{config.role}</h2>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-primary">{config.company} · Live Simulation</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="px-4 py-2 bg-surface-container-low rounded-xl text-[10px] font-bold uppercase tracking-widest">
                  Turn {turn}/{totalQuestions}
                </div>
                <Button variant="ghost" onClick={resetSimulation} className="text-danger/60 hover:text-danger hover:bg-danger/5 rounded-xl h-10 px-5 font-bold text-xs no-line">
                  End Session
                </Button>
              </div>
            </div>

            {/* Chat Window */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-2 pb-6">
              <AnimatePresence>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                  >
                    {msg.role === "ai" && (
                      <div className="w-10 h-10 rounded-2xl signature-gradient flex items-center justify-center text-white shrink-0 shadow-md shadow-primary/20 mt-1">
                        <Sparkles size={16} />
                      </div>
                    )}
                    <div className={`max-w-[75%] px-7 py-5 rounded-3xl leading-relaxed text-sm font-medium
                      ${msg.role === "ai"
                        ? msg.feedback
                          ? "bg-success/8 border border-success/20 text-on-surface"
                          : "bg-surface-container-lowest border border-white shadow-sm text-on-surface"
                        : "signature-gradient text-white shadow-xl shadow-primary/15"
                      }`}
                    >
                      {msg.content.split("**").map((part, j) =>
                        j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                      )}
                    </div>
                    {msg.role === "user" && (
                      <div className="w-10 h-10 rounded-2xl bg-surface-container-low flex items-center justify-center font-bold text-primary shrink-0 mt-1 border border-white text-[11px]">
                        {userEmail?.substring(0, 2).toUpperCase() || "ME"}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                  <div className="w-10 h-10 rounded-2xl signature-gradient flex items-center justify-center text-white shrink-0 shadow-md shadow-primary/20">
                    <Sparkles size={16} />
                  </div>
                  <div className="px-7 py-5 rounded-3xl bg-surface-container-lowest border border-white shadow-sm flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </motion.div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input Bar */}
            <div className="shrink-0 pt-4 border-t border-muted/10">
              <div className="flex gap-4 items-end">
                <textarea
                  ref={textRef}
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitAnswer() }}}
                  placeholder="Type your answer... (Enter to submit, Shift+Enter for new line)"
                  rows={3}
                  disabled={loading}
                  className="flex-1 px-6 py-4 bg-surface-container-lowest border border-white rounded-3xl font-medium text-sm text-on-surface resize-none focus:outline-none focus:ring-1 focus:ring-primary/30 shadow-sm leading-relaxed disabled:opacity-50"
                />
                <Button
                  onClick={submitAnswer}
                  disabled={!answer.trim() || loading}
                  className="signature-gradient h-14 w-14 rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-all shrink-0 disabled:opacity-40"
                  size="icon"
                >
                  <Send size={18} />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-3 text-center opacity-50">
                Your answers are analyzed in real-time by the AI Interview Agent
              </p>
            </div>
          </motion.div>
        )}

        {/* RESULT PHASE */}
        {phase === "result" && evaluation && (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="max-w-3xl mx-auto space-y-10 py-8">
            <div className="text-center space-y-4">
              <div className="w-24 h-24 rounded-full signature-gradient flex items-center justify-center text-white mx-auto shadow-2xl shadow-primary/30">
                <Award size={40} />
              </div>
              <h1 className="text-4xl font-bold tracking-tight">Session Complete!</h1>
              <p className="text-muted-foreground font-medium text-lg">{config.role} at {config.company}</p>
            </div>

            {/* Score */}
            <div className="p-14 rounded-[3rem] signature-gradient text-white text-center shadow-2xl shadow-primary/20 relative overflow-hidden group">
              <div className="relative z-10">
                <div className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-4">Overall Interview Score</div>
                <div className="text-9xl font-data font-bold tracking-tighter italic mb-4">{evaluation.overall_score}</div>
                <div className="text-lg font-bold opacity-80">out of 100</div>
                <div className="mt-8 flex justify-center">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={28} className={i < Math.round(evaluation.overall_score / 20) ? "text-warning fill-warning" : "text-white/30"} />
                  ))}
                </div>
              </div>
              <Sparkles size={200} className="absolute -bottom-16 -right-16 text-white/5 group-hover:scale-110 transition-all duration-1000" />
            </div>

            {/* Summary */}
            <div className="p-10 rounded-[3rem] bg-surface-container-lowest border border-white shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-5">AI Coach Summary</div>
              <p className="text-on-surface font-medium leading-relaxed text-lg italic border-l-2 border-primary/30 pl-6">&ldquo;{evaluation.summary}&rdquo;</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Strengths */}
              <div className="p-10 rounded-[3rem] bg-success/5 border border-success/20 shadow-sm space-y-6">
                <div className="text-[10px] font-bold uppercase tracking-widest text-success">Strengths</div>
                {evaluation.strengths.map((s, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                      <Check size={14} className="text-success" />
                    </div>
                    <span className="font-bold text-sm">{s}</span>
                  </div>
                ))}
              </div>
              {/* Improvements */}
              <div className="p-10 rounded-[3rem] bg-warning/5 border border-warning/20 shadow-sm space-y-6">
                <div className="text-[10px] font-bold uppercase tracking-widest text-warning">Improve On</div>
                {evaluation.improvements.map((s, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                      <TrendingUp size={14} className="text-warning" />
                    </div>
                    <span className="font-bold text-sm">{s}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={resetSimulation}
              className="w-full signature-gradient h-16 rounded-2xl font-bold text-md shadow-2xl shadow-primary/20 hover:scale-[1.02] transition-all flex gap-3"
            >
              <RotateCcw size={18} /> Run Another Simulation
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
