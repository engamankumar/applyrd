"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { MoreHorizontal, Clock, Plus, Mail, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createManualJob, updateJobStatus } from "@/lib/actions/onboarding";
import { toast } from "sonner";
import { Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOrchestrator } from "@/hooks/useOrchestrator";

const columns = [
  { id: "found", title: "Found", color: "bg-primary" },
  { id: "inbox_lead", title: "Gmail Inbox", color: "bg-[#ea4335]" },
  { id: "applied", title: "Applied", color: "bg-tertiary" },
  { id: "responded", title: "Responded", color: "bg-secondary" },
  { id: "interview", title: "Interview", color: "bg-warning" },
  { id: "offer", title: "Offer/Rejected", color: "bg-success" }
];

export default function KanbanBoard({ initialJobs = [], hasJobs = false }: { initialJobs?: any[], hasJobs?: boolean }) {
  const [jobs, setJobs] = useState<any[]>(initialJobs);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { data: session } = useSession();
  const [newTitle, setNewTitle] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [sortByScoreDesc, setSortByScoreDesc] = useState(false);
  const [filterActive, setFilterActive] = useState(false);
  const [draggedJobId, setDraggedJobId] = useState<string | null>(null);
  const { orchestrate, loading: orchestratorLoading } = useOrchestrator();

  const handleSync = async () => {
    if (!session?.user?.email) return;
    setIsSyncing(true);
    
    // Use the toast id to manage it manually for better control
    const toastId = toast.loading('Syncing Inbox: AI is analyzing your job updates...');
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_AGENT_SERVICE_URL}/agent/force-sweep?email=${session.user.email}`);
      const data = await res.json();
      
      if (data.status === "success" || data.status === "sync_started") {
        toast.success("Inbox sync complete!", { id: toastId });
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error("Sync failed: " + (data.message || "Unknown error"), { id: toastId });
      }
    } catch (e) {
      toast.error("Network error during sync.", { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedJobId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    if (!draggedJobId) return;
    await executeMove(draggedJobId, targetStatus);
  };

  const executeMove = async (jobId: string, targetStatus: string) => {
    const previousJobs = [...jobs];
    setJobs(jobs.map(j => j.id === jobId ? { ...j, status: targetStatus } : j));
    setDraggedJobId(null);
    
    const res = await updateJobStatus(jobId, targetStatus);
    if (!res?.success) {
      toast.error("Failed to move job");
      setJobs(previousJobs);
    }
  };

  const handleAddJob = async () => {
    if (!newTitle || !newCompany) return;

    setLoading(true);
    const res = await createManualJob({ title: newTitle, company: newCompany, status: "found" });
    setLoading(false);

    if (res.success) {
      toast.success("Job deployed successfully.");
      setJobs([...jobs, res.job]);
      setIsAdding(false);
      setNewTitle("");
      setNewCompany("");
    } else {
      toast.error("Deployment failed.");
    }
  };

  useEffect(() => {
    setJobs(initialJobs);
  }, [initialJobs]);

  if (loading) return <div className="p-10 text-center opacity-50 font-bold uppercase tracking-widest text-[10px]">Initializing Pipeline...</div>;

  return (
    <section>
      <div className="flex items-center justify-between mb-6 border-b border-border/5 pb-4">
        <div>
          <h2 className="text-xl font-bold text-on-surface tracking-tight">Job Pipeline</h2>
          <p className="text-[11px] text-muted-foreground font-medium mt-1 uppercase tracking-wider">Across all agentic search nodes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSync}
            disabled={isSyncing}
            className={`h-8 text-[10px] font-bold px-3 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/5 transition-all flex gap-2 ${isSyncing ? 'animate-pulse' : ''}`}
          >
            {isSyncing ? <RefreshCw size={12} className="animate-spin" /> : <Mail size={12} />}
            {isSyncing ? "Syncing..." : "Sync Inbox"}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger 
              className={`h-8 text-xs font-bold px-3 rounded-md transition-all ${filterActive ? 'bg-primary/10 text-primary' : 'hover:bg-surface-container-lowest hover:text-primary'}`}
            >
              Filter {filterActive ? 'On' : ''}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFilterActive(false)}>Clear Filter</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterActive(true)}>Score &gt; 80%</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSortByScoreDesc(!sortByScoreDesc)}
            className={`h-8 text-xs font-bold px-3 transition-all ${sortByScoreDesc ? 'bg-primary/10 text-primary' : 'hover:bg-surface-container-lowest hover:text-primary'}`}
          >
            Sort by Score {sortByScoreDesc ? '(Desc)' : '(Asc)'}
          </Button>
          {!hasJobs && (
            <Button 
              size="sm" 
              onClick={() => orchestrate("Find 5 new high-quality jobs for me.")}
              disabled={orchestratorLoading}
              className="h-8 bg-primary/10 text-primary border-none hover:bg-primary/20 text-xs font-bold animate-pulse"
            >
              <Search size={14} className="mr-2" /> {orchestratorLoading ? "Searching..." : "Start First Search"}
            </Button>
          )}
        </div>
      </div>
      
      <ScrollArea className="w-full pb-6">
        <div className="flex gap-6 min-w-max p-1">
          {isSyncing && (
            <div className="fixed top-[72px] left-0 right-0 z-50 h-1 bg-emerald-500/20">
               <div className="h-full bg-emerald-500 animate-[shimmer_2s_infinite_linear] bg-[length:200%_100%] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            </div>
          )}

          {columns.map((column) => {
          let columnJobs = jobs.filter(j => j.status?.toLowerCase() === column.id);
          
          if (filterActive && columnJobs.length > 0) {
            columnJobs = columnJobs.filter(j => (j.match_score || 0) > 80); // rudimentary filter logic
          }
          
          if (sortByScoreDesc) {
            columnJobs = [...columnJobs].sort((a,b) => (b.match_score || 0) - (a.match_score || 0));
          } else {
            columnJobs = [...columnJobs].sort((a,b) => (a.match_score || 0) - (b.match_score || 0));
          }

          return (
            <div 
              key={column.id} 
              className="w-[320px] flex flex-col h-full rounded-2xl bg-surface-container-low p-5"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className="flex items-center gap-2 mb-6">
                <div className={`w-2.5 h-2.5 rounded-sm ${column.color}`} />
                <h3 className="font-bold text-on-surface text-[10px] uppercase tracking-[0.2em]">{column.title}</h3>
                <Badge variant="ghost" className="bg-surface-container-lowest ml-auto font-data font-bold text-xs">
                  {columnJobs.length}
                </Badge>
              </div>

              <div className="flex flex-col gap-4 overflow-y-auto pr-1 min-h-[50px]">
                {columnJobs.map(job => (
                  <Link 
                    draggable
                    onDragStart={(e) => handleDragStart(e, job.id)}
                    key={job.id} 
                    href={`/dashboard/job/${job.id}`} 
                    className="block transition-all group hover:scale-[1.02] cursor-grab active:cursor-grabbing"
                  >
                    <Card className="p-5 bg-surface-container-lowest border-none transition-all shadow-sm hover:shadow-xl hover:shadow-primary/5 relative">
                      {job.source_platform === 'gmail' && (
                        <div className="absolute -top-1 -right-1 z-20">
                          <Badge className="bg-[#ea4335] hover:bg-[#ea4335] text-white text-[9px] font-bold px-1.5 py-0.5 shadow-md flex items-center gap-1">
                            <Mail size={10} /> Gmail
                          </Badge>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-lg signature-gradient flex items-center justify-center text-[10px] font-bold text-white uppercase">
                          {job.company?.[0] || 'J'}
                        </div>
                        <div className={`match-pulse px-3 py-1.5 rounded-full text-[10px] font-bold font-data bg-primary/10 text-primary`}>
                          {job.match_score || 0}% Match
                        </div>
                      </div>

                      <h4 className="font-bold text-sm text-on-surface mb-1 group-hover:text-primary transition-colors">{job.title}</h4>
                      <div className="flex flex-col gap-1 mb-5">
                         <p className="text-[11px] text-muted-foreground font-medium">{job.company}</p>
                         {job.location && (
                           <p className="text-[10px] text-primary/60 font-medium italic">📍 {job.location}</p>
                         )}
                         {job.salary_range && (
                           <p className="text-[10px] text-emerald-500 font-bold">💰 {job.salary_range}</p>
                         )}
                      </div>

                      <div className="flex items-center justify-between border-t border-muted/10 pt-4 mt-2">
                        <div className="flex items-center gap-3 text-neutral-400">
                          <div className="flex items-center gap-1">
                            <Clock size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-tight">Just Now</span>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger 
                            className="text-neutral-300 hover:text-primary transition-colors p-1"
                            onClick={(e) => e.preventDefault()}
                          >
                            <MoreHorizontal size={16} />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {columns.map(col => (
                              <DropdownMenuItem 
                                key={col.id} 
                                onClick={(e) => {
                                  e.preventDefault();
                                  executeMove(job.id, col.id);
                                }}
                              >
                                Move to {col.title}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </Card>
                  </Link>
                ))}

                {columnJobs.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 px-4 opacity-20 border-2 border-dashed border-on-surface/5 rounded-2xl">
                    <p className="text-[10px] font-bold uppercase text-center italic">No items</p>
                  </div>
                )}

                {column.id === "found" && (
                  <div className="space-y-3">
                    {isAdding ? (
                      <div className="p-4 bg-surface-container-lowest rounded-2xl border border-primary/20 space-y-3 animate-in fade-in zoom-in-95">
                        <input
                          autoFocus
                          placeholder="Role Title"
                          id="manual-job-title"
                          className="w-full bg-transparent border-none font-bold text-sm focus:ring-0 placeholder:opacity-30"
                          value={newTitle}
                          onChange={e => setNewTitle(e.target.value)}
                        />
                        <input
                          placeholder="Company"
                          id="manual-job-company"
                          className="w-full bg-transparent border-none text-[11px] focus:ring-0 placeholder:opacity-30"
                          value={newCompany}
                          onChange={e => setNewCompany(e.target.value)}
                        />
                        <div className="flex gap-2 pt-2">
                          <Button
                            id="save-manual-job-action"
                            size="sm"
                            onClick={handleAddJob}
                            className="h-9 bg-primary text-white text-[11px] font-bold uppercase tracking-widest flex-[2] shadow-lg shadow-primary/20 active:scale-95 transition-all"
                          >
                            {loading ? "Deploying..." : "Inject Node (Save)"}
                          </Button>
                          <Button
                            id="cancel-manual-job-action"
                            size="sm"
                            variant="ghost"
                            onClick={() => setIsAdding(false)}
                            className="h-9 text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex-1"
                          >
                            Abort
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        id="add-manual-job-btn"
                        onClick={() => setIsAdding(true)}
                        variant="ghost"
                        className="w-full h-12 border-2 border-dashed border-on-surface/5 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-surface-container-lowest hover:border-primary/20 hover:text-primary transition-all group"
                      >
                        <Plus size={14} className="mr-2 group-hover:rotate-90 transition-transform" /> Add Manual Job
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
    </section>
  );
}
