import { getLatestResume } from "@/lib/actions/onboarding"
import ResumeStatusBanner from "@/components/dashboard/ResumeStatusBanner"

export default async function ResumeStatusServer() {
  const resume = await getLatestResume()
  const hasResume = !!resume
  const skillCount = resume ? (resume.parsed_skills as string[])?.length || 0 : 0

  return (
    <ResumeStatusBanner
      hasResume={hasResume}
      resumeSkillCount={skillCount}
    />
  )
}
