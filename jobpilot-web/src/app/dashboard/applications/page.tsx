import { getUserJobs, getApplicationsStats, getLatestResume } from "@/lib/actions/onboarding"
import ApplicationsContent from "./ApplicationsContent"

export default async function ApplicationsPage() {
  const [jobs, stats, resume] = await Promise.all([
    getUserJobs(),
    getApplicationsStats(),
    getLatestResume()
  ])

  return <ApplicationsContent 
    initialJobs={jobs} 
    stats={stats} 
    resumeText={Array.isArray(resume?.parsed_skills) ? (resume?.parsed_skills as string[]).join(", ") : ""}
  />
}
