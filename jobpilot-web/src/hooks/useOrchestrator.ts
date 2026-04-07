"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

import { syncFoundJobs } from "@/lib/actions/onboarding";

export interface OrchestrationStep {
  agent: string;
  action: string;
  reason: string;
}

export interface OrchestrationResult {
  agent: string;
  data: any;
}

const AGENT_API = process.env.NEXT_PUBLIC_AGENT_SERVICE_URL || "http://localhost:8000";
const ORCHESTRATOR_URL = `${AGENT_API}/agent/orchestrate`;

export function useOrchestrator() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<OrchestrationStep[]>([]);
  const [results, setResults] = useState<OrchestrationResult[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const orchestrate = async (userMsg: string, context: any = {}) => {
    setLoading(true);
    setError(null);
    setSteps([]);
    setResults([]);
    setMessage(null);
    
    // Fallback if no context provided
    const orchestrationContext = {
       preferences: context.preferences || { role: "Frontend Developer", location: "Remote" },
       ...context
    };
    
    try {
      const { data } = await axios.post(`${AGENT_API}/agent/orchestrate`, {
        message: userMsg,
        context: orchestrationContext
      });

      if (data.status === "success") {
        console.log("ORCHESTRATE SUCCESS:", data);
        setSteps(data.plan || []);
        setResults(data.results || []);
        setMessage(data.final_message);

        // EXTRA: Sync found jobs to database for the Kanban board
        const searchResult = data.results?.find((r: any) => r.agent === "job_search_agent");
        const jobs = searchResult?.data?.jobs || (Array.isArray(searchResult?.data) ? searchResult.data : []);
        console.log("Search Result found in results:", !!searchResult, jobs.length);
        
        if (jobs.length > 0) {
          console.log("Synchronizing discovered jobs to pipeline...", jobs);
          const syncRes = await syncFoundJobs(jobs);
          console.log("Sync Result from Server Action:", syncRes);
          
          if (syncRes.success) {
            const count = syncRes.count || 0;
            if (count > 0) {
              setMessage(`✅ Success! ${count} new roles have been automatically parsed, matched, and deposited into your Kanban Pipeline.`);
            } else {
              setMessage(`✅ Dashboard refreshed. The discovered roles were already in your active pipeline.`);
            }
            router.refresh();
          }
        }
      } else {
        setError(data.error || "Something went wrong.");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return { orchestrate, loading, error, steps, results, message };
}
