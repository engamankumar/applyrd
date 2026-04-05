import { getAllResumes, getLatestResume } from "@/lib/actions/onboarding"
import ResumeContent from "./ResumeContent"

export default async function ResumePage() {
  const resumes = await getAllResumes()
  const latestResume = await getLatestResume()

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-surface selection:bg-primary/10 transition-all duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10 mb-16">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight text-on-surface leading-none">
            Narrative <br /><span className="text-primary italic underline decoration-primary/20">Architecture.</span>
          </h1>
          <p className="text-lg text-muted-foreground font-medium max-w-xl leading-relaxed tracking-tight">
            Your AI Resume Agent analyzes your profile and identifies gaps against your target role.
          </p>
        </div>
      </div>

      <ResumeContent initialResumes={resumes} latestResume={latestResume} />
    </div>
  )
}
