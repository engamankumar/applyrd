import { getJobById } from "@/lib/actions/onboarding"
import JobDetailClient from "./JobDetailClient"
import { redirect } from "next/navigation"
import { auth } from "@/auth"

export const dynamic = "force-dynamic"



export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  
  const job = await getJobById(id)
  
  if (!job) {
    redirect("/dashboard")
  }

  // Map DB job to expected JobDetail type
  const mappedJob = {
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location || "Remote",
    salary: job.salary_range || "Competitive",
    posted: job.found_at.toLocaleDateString(),
    matchScore: job.match_score || 0,
    description: job.description || "",
    applyUrl: job.apply_url || "",
    matchReason: job.match_reason || "Strong alignment with profile and technical stack.",
    tailoredResult: job.tailored_result || null,
    agentInsights: [
      { type: "Narrative", text: job.match_reason || "Resume matches 84% of core keywords." },
      { type: "Skills", text: "Excellent fit for technical stack." }
    ]
  }

  const session = await auth()
  const userEmail = session?.user?.email || ""

  return <JobDetailClient job={mappedJob} userEmail={userEmail} />
}

