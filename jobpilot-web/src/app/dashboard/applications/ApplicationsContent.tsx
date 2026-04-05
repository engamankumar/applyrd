"use client"

import { useEffect, useState } from "react"
import { Search, MapPin, Briefcase, Star, Sparkles, ExternalLink, TrendingUp, Zap, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { motion, AnimatePresence } from "framer-motion"
import { useJobSearch } from "@/hooks/useAgent"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { syncFoundJobs } from "@/lib/actions/onboarding"

export default function ApplicationsContent({ initialJobs, stats, resumeText }: { initialJobs: any[], stats: any, resumeText: string }) {
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get("q") || "")
  const [jobs, setJobs] = useState(initialJobs)
  const { mutateAsync: searchJobs, isPending: isSearching } = useJobSearch()

  const handleSearch = async (forcedQuery?: string) => {
    const q = forcedQuery || query
    if (!q.trim()) return

    try {
      toast.loading("Orchestrating search agents...", { id: "search" })
      const res = await searchJobs({
        preferences: { preferred_roles: [q] },
        resume_text: resumeText || "Dynamic Growth Node Architecture"
      })

      const discoveredJobs = res.data?.jobs || res.jobs || []

      if (discoveredJobs.length > 0) {
        // Finalize: Sync these jobs to the database so they get real IDs
        const syncRes = await syncFoundJobs(discoveredJobs)
        if (syncRes.success) {
          // Refetch or update UI with latest from DB (ideally you'd return the created jobs)
          // For now, we'll just set the discovered jobs, but they might still have mock IDs 
          // if we don't return the newly created ones. 
          // Actually, syncFoundJobs should return the created records.
          // I'll update syncFoundJobs to return the jobs.
          if (syncRes?.jobs) {
            setJobs([...jobs, ...syncRes.jobs])
            toast.success(`Discovered ${discoveredJobs.length} matches and synced to node.`, { id: "search" })
          } else {
            window.location.reload()
          }
        }
      } else {
        toast.error("No matches found in the current subnetwork.", { id: "search" })
      }
    } catch (e) {
      console.error(e)
      toast.error("Handshake failed during discovery.", { id: "search" })
    }
  }

  useEffect(() => {
    const q = searchParams.get("q")
    if (q) {
      setQuery(q)
      handleSearch(q)
    }
  }, [searchParams])

  const columns = [
    { id: "found", label: "Found", color: "bg-primary" },
    { id: "applied", label: "Applied", color: "bg-indigo-400" },
    { id: "responded", label: "Responded", color: "bg-teal-400" },
    { id: "interview", label: "Interview", color: "bg-warning" },
    { id: "offer", label: "Offer", color: "bg-success" }
  ]

  const pipeline: Record<string, any[]> = {
    found: jobs.filter(j => (!j.status || j.status === "found") && (j.title.toLowerCase().includes(query.toLowerCase()) || j.company.toLowerCase().includes(query.toLowerCase()))),
    applied: jobs.filter(j => j.status === "applied" && (j.title.toLowerCase().includes(query.toLowerCase()) || j.company.toLowerCase().includes(query.toLowerCase()))),
    responded: jobs.filter(j => j.status === "responded" && (j.title.toLowerCase().includes(query.toLowerCase()) || j.company.toLowerCase().includes(query.toLowerCase()))),
    interview: jobs.filter(j => j.status === "interview" && (j.title.toLowerCase().includes(query.toLowerCase()) || j.company.toLowerCase().includes(query.toLowerCase()))),
    offer: jobs.filter(j => j.status === "offer" && (j.title.toLowerCase().includes(query.toLowerCase()) || j.company.toLowerCase().includes(query.toLowerCase())))
  }

  return (
    <div className="p-8 space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-on-surface">
            Application <span className="text-primary italic">Pipeline.</span>
          </h1>
          <p className="text-muted-foreground font-medium">
            Monitoring <span className="font-data text-primary">{jobs.length}</span> active pursuit nodes.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground opacity-40" size={16} />
            <Input
              placeholder="Search roles..."
              className="pl-11 h-12 bg-surface-container-low border-none rounded-xl font-bold text-sm"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
            />
          </div>
          <Button onClick={() => handleSearch()} disabled={isSearching} className="signature-gradient h-12 px-6 rounded-xl font-bold text-sm shadow-xl shadow-primary/10 shrink-0 flex gap-2">
            {isSearching ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {isSearching ? "Searching..." : "AI Search"}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-5 min-w-max">
          {columns.map(col => (
            <div key={col.id} className="w-[300px] flex flex-col rounded-2xl bg-surface-container-low p-5 shrink-0">
              <div className="flex items-center gap-2 mb-5">
                <div className={`w-2.5 h-2.5 rounded-sm ${col.color}`} />
                <h3 className="font-bold text-on-surface text-[10px] uppercase tracking-[0.2em]">{col.label}</h3>
                <Badge variant="ghost" className="bg-surface-container-lowest ml-auto font-data font-bold text-xs">{pipeline[col.id]?.length || 0}</Badge>
              </div>

              <div className="space-y-4">
                <AnimatePresence>
                  {pipeline[col.id].map((job, i) => (
                    <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <Link href={`/dashboard/job/${job.id}`} className="block">
                        <div className="p-5 bg-surface-container-lowest rounded-2xl border border-white shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group hover:scale-[1.02]">
                          <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 rounded-xl signature-gradient flex items-center justify-center text-[11px] font-bold text-white shadow-md shadow-primary/20">{job.company?.[0] ?? "?"}</div>
                            <div className={`px-3 py-1.5 rounded-full text-[10px] font-bold font-data ${job.match_score >= 90 ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>{job.match_score}% Match</div>
                          </div>
                          <h4 className="font-bold text-sm text-on-surface mb-1 group-hover:text-primary transition-colors line-clamp-2">{job.title}</h4>
                          <p className="text-[11px] text-muted-foreground font-medium mb-3 line-clamp-1">{job.company}</p>
                          <div className="flex items-center justify-between border-t border-muted/10 pt-3 mt-3">
                            <div className="flex items-center gap-1.5 text-muted-foreground/40">
                              <Briefcase size={10} />
                              <span className="text-[10px] font-bold uppercase tracking-tight">Full-Time</span>
                            </div>
                            <ExternalLink size={12} className="text-muted-foreground/30 group-hover:text-primary transition-colors" />
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {[
          { label: "Total Applications", value: stats?.totalApps || 0, icon: <Briefcase size={18} />, color: "text-primary" },
          { label: "Avg Match Score", value: `${stats?.avgScore || 0}%`, icon: <TrendingUp size={18} />, color: "text-success" },
          { label: "Interviews Pending", value: stats?.interviews || 0, icon: <Star size={18} />, color: "text-warning" },
          { label: "Agent Deployments", value: stats?.deployments || 0, icon: <Zap size={18} />, color: "text-primary" }
        ].map((stat, i) => (
          <div key={i} className="p-8 rounded-2xl bg-surface-container-lowest border border-white shadow-sm flex items-center gap-5">
            <div className={`${stat.color} opacity-60`}>{stat.icon}</div>
            <div>
              <div className="text-2xl font-data font-bold tracking-tight">{stat.value}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
