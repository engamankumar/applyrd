import { LayoutGrid, CheckCircle2, Calendar, Trophy, TrendingUp } from "lucide-react"
import { Card } from "@/components/ui/card"

export default function StatsBar({ data }: { data?: any }) {
  const stats = [
    { label: "Jobs Found", value: data?.jobs || 0, icon: <LayoutGrid className="text-primary" />, trend: data?.jobs > 0 ? `+${data.jobs}` : "0" },
    { label: "Applied", value: data?.applications || 0, icon: <CheckCircle2 className="text-tertiary" />, trend: "Sync" },
    { label: "Avg Match", value: data?.matchScore ? `${data.matchScore}%` : "0%", icon: <TrendingUp className="text-secondary" />, trend: "AI" },
    { label: "Interviews", value: data?.interviews || 0, icon: <Calendar className="text-warning" />, trend: "0" },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((s) => (
        <Card key={s.label} className="p-5 flex items-center justify-between border-none transition-all bg-surface-container-lowest hover:bg-white shadow-sm hover:shadow-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-surface-container-low rounded-xl flex items-center justify-center">
              {s.icon}
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-1">{s.label}</p>
              <h3 className="text-3xl font-bold font-data text-on-surface">{s.value}</h3>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-[10px] font-bold font-data text-muted-foreground bg-muted/10 px-2 py-1 rounded-full">
             {s.trend}
          </div>
        </Card>
      ))}
    </div>
  )
}
