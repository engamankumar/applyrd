"use client"

import { useState } from "react"
import { 
  User, 
  Briefcase, 
  Bell, 
  CreditCard, 
  Shield, 
  Sparkles, 
  Check, 
  Zap,
  Loader2,
  LogOut
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"
import { updateUserProfile } from "@/lib/actions/onboarding"
import { toast } from "sonner"
import { signOut } from "next-auth/react"

export default function SettingsContent({ initialData }: { initialData: any }) {
  const [activeSegment, setActiveSegment] = useState("Narrative")
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    preferred_roles: initialData?.preferred_roles || [],
    location_preference: initialData?.location_preference || "",
    reminder_time: initialData?.reminder_time || "09:00",
    reminder_timezone: initialData?.reminder_timezone || "Asia/Kolkata",
  })

  const TIMEZONES = [
    { label: "India (IST) — UTC+5:30",          value: "Asia/Kolkata" },
    { label: "United Kingdom (GMT/BST) — UTC+0", value: "Europe/London" },
    { label: "US Eastern (ET) — UTC-5/-4",       value: "America/New_York" },
    { label: "US Central (CT) — UTC-6/-5",       value: "America/Chicago" },
    { label: "US Mountain (MT) — UTC-7/-6",      value: "America/Denver" },
    { label: "US Pacific (PT) — UTC-8/-7",       value: "America/Los_Angeles" },
    { label: "Canada — Toronto (ET)",            value: "America/Toronto" },
    { label: "Canada — Vancouver (PT)",          value: "America/Vancouver" },
    { label: "Germany / Berlin (CET) — UTC+1",   value: "Europe/Berlin" },
    { label: "France / Paris (CET) — UTC+1",     value: "Europe/Paris" },
    { label: "UAE / Dubai (GST) — UTC+4",        value: "Asia/Dubai" },
    { label: "Singapore (SGT) — UTC+8",          value: "Asia/Singapore" },
    { label: "Japan (JST) — UTC+9",              value: "Asia/Tokyo" },
    { label: "Australia — Sydney (AEDT) — UTC+11",value: "Australia/Sydney" },
    { label: "Australia — Melbourne (AEDT)",     value: "Australia/Melbourne" },
    { label: "New Zealand (NZDT) — UTC+13",      value: "Pacific/Auckland" },
    { label: "Brazil — São Paulo (BRT) — UTC-3", value: "America/Sao_Paulo" },
    { label: "UTC (Universal)",                  value: "UTC" },
  ]

  const segments = [
    { id: "Narrative", icon: <User size={18} /> },
    { id: "Strategic", icon: <Briefcase size={18} /> },
    { id: "Briefings", icon: <Bell size={18} /> },
    { id: "Activation", icon: <CreditCard size={18} /> },
    { id: "Privacy", icon: <Shield size={18} /> }
  ]

  const handleUpdate = async () => {
    setLoading(true)
    const res = await updateUserProfile(formData)
    setLoading(false)
    if (res.success) {
      toast.success("Protocol Updated Successfully")
    } else {
      toast.error("Handshake failed: " + res.error)
    }
  }

  return (
    <div className="grid lg:grid-cols-12 gap-12 animate-in fade-in slide-in-from-bottom-10 duration-1000">
      {/* Navigation Sidebar */}
      <div className="lg:col-span-3 space-y-2">
         {segments.map(seg => (
           <button 
             key={seg.id}
             onClick={() => setActiveSegment(seg.id)}
             className={`w-full flex items-center gap-5 px-8 py-5 rounded-[1.25rem] transition-all duration-300 group
              ${activeSegment === seg.id ? 'bg-primary text-white shadow-2xl shadow-primary/20 scale-105' : 'bg-surface-container-low text-muted-foreground hover:bg-surface-container-lowest border border-white hover:shadow-sm'}`}
           >
              <div className={`${activeSegment === seg.id ? 'text-white' : 'text-primary/60 group-hover:text-primary'} transition-colors`}>
                 {seg.icon}
              </div>
              <span className="text-sm font-bold uppercase tracking-[0.2em]">{seg.id}</span>
           </button>
         ))}

         <div className="pt-10 mt-10 border-t border-muted/10 space-y-2">
            <button 
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full flex items-center gap-5 px-8 py-5 rounded-2xl text-danger/60 hover:text-danger hover:bg-danger/5 transition-all font-bold text-sm uppercase tracking-widest no-line"
            >
               <LogOut size={18} /> Termination
            </button>
         </div>
      </div>

      <div className="lg:col-span-9">
         <div className="bg-surface-container-lowest rounded-[2.5rem] p-12 border border-muted/5 shadow-sm">
            <AnimatePresence mode="wait">
               {activeSegment === "Narrative" && (
                 <motion.div
                   key="narrative"
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: -20 }}
                   className="space-y-10"
                 >
                    <div className="flex items-center justify-between">
                       <div>
                          <h2 className="text-2xl font-bold tracking-tight mb-2 italic">Technical Archetype</h2>
                          <p className="text-muted-foreground text-sm font-medium">Configure your digital signature for the application node.</p>
                       </div>
                       <Badge variant="ghost" className="bg-primary/5 text-primary border-primary/10 px-4 py-2 font-data font-bold">
                          SYNC ACTIVE
                       </Badge>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                       <div className="space-y-3">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-primary/60 ml-1">Full Name</label>
                          <Input 
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="h-14 bg-surface-container-low border-none rounded-2xl px-6 font-bold focus-visible:ring-primary/20" 
                          />
                       </div>
                       <div className="space-y-3">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-primary/60 ml-1">Preferred Location</label>
                          <Input 
                            value={formData.location_preference}
                            onChange={e => setFormData({ ...formData, location_preference: e.target.value })}
                            className="h-14 bg-surface-container-low border-none rounded-2xl px-6 font-bold focus-visible:ring-primary/20" 
                          />
                       </div>
                       <div className="md:col-span-2 space-y-3">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-primary/60 ml-1">Primary Roles (Comma Separated)</label>
                          <Input 
                            value={formData.preferred_roles.join(", ")}
                            onChange={e => setFormData({ ...formData, preferred_roles: e.target.value.split(",").map(r => r.trim()) })}
                            className="h-14 bg-surface-container-low border-none rounded-2xl px-6 font-bold focus-visible:ring-primary/20" 
                          />
                       </div>
                    </div>

                    <div className="pt-8 border-t border-muted/5 flex items-center justify-between">
                       <div className="flex items-center gap-4 text-muted-foreground">
                          <Sparkles size={18} className="text-primary animate-pulse" />
                          <span className="text-xs font-medium">Auto-synced with agent subnetworkers</span>
                       </div>
                       <Button 
                         onClick={handleUpdate}
                         disabled={loading}
                         className="h-14 px-10 rounded-2xl signature-gradient font-bold text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-primary/20 border-none transition-all hover:scale-105 active:scale-95"
                       >
                          {loading ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                          Update Blueprint
                       </Button>
                    </div>
                 </motion.div>
               )}

                {activeSegment === "Briefings" && (
                  <motion.div
                    key="briefings"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-10"
                  >
                     <div>
                        <h2 className="text-2xl font-bold tracking-tight mb-2 italic">Agentic Briefings</h2>
                        <p className="text-muted-foreground text-sm font-medium">Configure when your agents deliver the daily job digest, in your local timezone.</p>
                     </div>

                     <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                           <label className="text-[10px] font-bold uppercase tracking-widest text-primary/60 ml-1">Daily Summary Time</label>
                           <input
                             type="time"
                             value={formData.reminder_time}
                             onChange={e => setFormData({ ...formData, reminder_time: e.target.value })}
                             className="w-full h-14 bg-surface-container-low border-none rounded-2xl px-6 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                           />
                        </div>
                        <div className="space-y-3">
                           <label className="text-[10px] font-bold uppercase tracking-widest text-primary/60 ml-1">Your Timezone</label>
                           <select
                             value={formData.reminder_timezone}
                             onChange={e => setFormData({ ...formData, reminder_timezone: e.target.value })}
                             className="w-full h-14 bg-surface-container-low border-none rounded-2xl px-6 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm appearance-none cursor-pointer"
                           >
                             {TIMEZONES.map(tz => (
                               <option key={tz.value} value={tz.value}>{tz.label}</option>
                             ))}
                           </select>
                        </div>
                     </div>

                     <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 flex items-center gap-6">
                        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white flex-shrink-0">
                           <Bell size={20} />
                        </div>
                        <div>
                           <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Timezone-Aware Scheduling</p>
                           <p className="text-[11px] text-muted-foreground font-medium">
                             Your briefing fires at your chosen time in <span className="text-primary font-bold">{TIMEZONES.find(t => t.value === formData.reminder_timezone)?.label ?? formData.reminder_timezone}</span>. Inbox auto-syncs every 6 hours via MCP nodes.
                           </p>
                        </div>
                     </div>

                     <div className="pt-8 border-t border-muted/5 flex justify-end gap-4">
                        <Button 
                          onClick={handleUpdate}
                          disabled={loading}
                          className="h-14 px-10 rounded-2xl signature-gradient font-bold text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-primary/20"
                        >
                           {loading ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                           Update Schedule
                        </Button>
                     </div>
                  </motion.div>
                )}

                {activeSegment !== "Narrative" && activeSegment !== "Briefings" && (
                  <motion.div
                    key="other"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="h-[400px] flex flex-col items-center justify-center text-center space-y-6 opacity-40 grayscale"
                  >
                     <div className="w-20 h-20 rounded-full bg-surface-container-low flex items-center justify-center">
                        <Zap size={32} />
                     </div>
                     <div>
                        <h3 className="text-lg font-bold uppercase tracking-widest">Node Segment Locked</h3>
                        <p className="text-sm italic">This module will be unlocked in the next deployment phase.</p>
                     </div>
                  </motion.div>
                )}
            </AnimatePresence>
         </div>
      </div>
    </div>
  )
}
