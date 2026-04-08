"use client";

import { useState, useEffect } from "react";
import { Sparkles, ArrowRight, Loader2, CheckCircle2, Circle, AlertCircle, Play, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useOrchestrator } from "@/hooks/useOrchestrator";

export default function AIAssistant() {
  const [query, setQuery] = useState("");
  const [preferences, setPreferences] = useState<any>(null);
  const { orchestrate, loading, error, steps, results, message } = useOrchestrator();

  useEffect(() => {
    async function loadPrefs() {
      const { getUserProfile } = await import("@/lib/actions/onboarding");
      const profile = await getUserProfile();
      if (profile) setPreferences(profile);
    }
    loadPrefs();
  }, []);

  const handleAction = () => {
    if (!query.trim()) return;
    orchestrate(query, { preferences });
  };

  return (
    <Card className="glass-morphism border-primary/20 p-6 shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
        <Sparkles size={48} className="text-primary" />
      </div>

      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-lg signature-gradient flex items-center justify-center shadow-lg shadow-primary/20">
          <Sparkles size={16} className="text-white" />
        </div>
        <h3 className="text-lg font-bold text-on-surface tracking-tight">Applyrd Automation</h3>
      </div>

      <div className="space-y-6">
        <div className="relative">
          <Input
            placeholder="E.g., 'Tailor my resume for the Netflix Senior React role'"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAction()}
            className="h-14 pl-4 pr-16 bg-surface-container-lowest border-primary/10 rounded-2xl focus-visible:ring-primary/20 font-medium focus:border-primary/30 transition-all text-base shadow-sm"
          />
          <Button
            disabled={loading || !query.trim()}
            onClick={handleAction}
            className="absolute right-2 top-2 h-10 w-10 p-0 rounded-xl signature-gradient shadow-lg shadow-primary/20 hover:scale-105 transition-all"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
          </Button>
        </div>

        {/* Action Steps Display */}
        {steps.length > 0 && (
          <div className="py-2 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-primary opacity-80">Orchestration Plan</span>
              <Badge variant="outline" className="text-[10px] font-bold h-5 bg-primary/5 text-primary border-primary/10 tracking-tight">Active</Badge>
            </div>

            <div className="space-y-4 relative">
              {/* Vertical line connecting steps */}
              <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-primary/10" />

              {steps.map((step, idx) => {
                const isExecuting = loading && results.length <= idx;
                const isDone = results.length > idx;

                return (
                  <div key={idx} className={`flex gap-4 relative z-10 ${!isDone && !isExecuting ? 'opacity-50' : ''}`}>
                    <div className="mt-1 bg-surface-container-lowest rounded-full p-0.5">
                      {isDone ? (
                        <CheckCircle2 size={18} className="text-primary" />
                      ) : isExecuting ? (
                        <Loader2 size={18} className="text-primary animate-spin" />
                      ) : (
                        <Circle size={18} className="text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-on-surface leading-tight mb-1">{step.reason}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-data text-muted-foreground font-bold uppercase">{step.agent.replace('_', ' ')}</span>
                        {isDone && <span className="text-[10px] font-bold text-primary">COMPLETE</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Final Result / Output */}
        {message && !loading && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 animate-in zoom-in-95 duration-500">
              <p className="text-sm font-medium leading-relaxed italic text-on-surface/80">"{message}"</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {results.some(r => r.agent === "google_skills_agent") && (
                <Link href="/dashboard/roadmap">
                  <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold uppercase tracking-wider gap-2 border-primary/20 text-primary hover:bg-primary/5">
                    <TrendingUp size={12} /> View Career Roadmap
                  </Button>
                </Link>
              )}
              {results.some(r => r.agent === "mock_interview_agent" || r.agent === "prep_agent") && (
                <Link href="/dashboard/interview">
                  <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold uppercase tracking-wider gap-2 border-primary/20 text-primary hover:bg-primary/5">
                    <Play size={12} /> Start Interview Sim
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-error/5 border border-error/10 text-error animate-shake">
            <AlertCircle size={18} />
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}
      </div>
    </Card>
  );
}
