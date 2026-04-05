import { getUserProfile } from "@/lib/actions/onboarding"
import SettingsContent from "./SettingsContent"

export default async function SettingsPage() {
  const profile = await getUserProfile();
  
  return (
    <div className="p-10 max-w-7xl mx-auto min-h-screen bg-surface selection:bg-primary/10 transition-all duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10 mb-20">
         <div className="space-y-4">
            <h1 className="text-5xl font-bold tracking-tight text-on-surface leading-none">System <br /><span className="text-primary italic underline decoration-primary/20">Protocols.</span></h1>
            <p className="text-lg text-muted-foreground font-medium max-w-lg leading-relaxed tracking-tight">Modify your agentic configurations and node deployments.</p>
         </div>
      </div>

      <SettingsContent initialData={profile} />
    </div>
  )
}
