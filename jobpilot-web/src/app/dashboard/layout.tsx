import { getLatestResume } from "@/lib/actions/onboarding"
import DashboardLayout from "./layout-client"

export default async function DashboardLayoutServer({ children }: { children: React.ReactNode }) {
  const resume = await getLatestResume()
  const hasResume = !!resume
  const skillCount = resume ? (resume.parsed_skills as string[])?.length || 0 : 0

  return (
    <DashboardLayout hasResume={hasResume} resumeSkillCount={skillCount}>
      {children}
    </DashboardLayout>
  )
}
