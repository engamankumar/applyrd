"use client";

import { Bell, Mail, Search, Calendar, CheckCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState, useTransition } from "react";
import { getRecentNotifications, type Notification } from "@/lib/actions/notifications";

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

const ICON_MAP: Record<Notification["type"], React.ReactNode> = {
  gmail_sync: <Mail size={14} className="text-[#ea4335]" />,
  job_search: <Search size={14} className="text-primary" />,
  interview: <Calendar size={14} className="text-amber-400" />,
  application: <CheckCircle size={14} className="text-emerald-400" />,
};

const BG_MAP: Record<Notification["type"], string> = {
  gmail_sync: "bg-[#ea4335]/10",
  job_search: "bg-primary/10",
  interview: "bg-amber-400/10",
  application: "bg-emerald-400/10",
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const data = await getRecentNotifications();
      setNotifications(data);
    });
  }, []);

  const hasNew = notifications.length > 0;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground hover:bg-surface-container-low transition-colors"
      >
        <Bell size={20} />
        {hasNew && (
          <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full border-2 border-surface-container-lowest animate-pulse" />
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={8}
        className="w-80 p-0 bg-surface-container-low border-border/10 shadow-2xl rounded-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-muted/10">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface">
              Activity Feed
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Last 7 days</p>
          </div>
          {notifications.length > 0 && (
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {notifications.length} events
            </span>
          )}
        </div>

        {/* Body */}
        <div className="max-h-[360px] overflow-y-auto">
          {isPending ? (
            <div className="flex flex-col gap-2 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 items-start animate-pulse">
                  <div className="w-7 h-7 rounded-xl bg-surface-container-lowest shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 bg-surface-container-lowest rounded w-3/4" />
                    <div className="h-2 bg-surface-container-lowest rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 gap-3 text-center">
              <div className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center">
                <Bell size={18} className="text-muted-foreground opacity-30" />
              </div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                No activity yet
              </p>
              <p className="text-[10px] text-muted-foreground/60">
                Gmail syncs, job captures, and interviews will appear here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-muted/10">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-surface-container-lowest/50 transition-colors"
                >
                  <div
                    className={`w-7 h-7 rounded-xl ${BG_MAP[n.type]} flex items-center justify-center shrink-0 mt-0.5`}
                  >
                    {ICON_MAP[n.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-on-surface leading-tight">{n.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{n.body}</p>
                  </div>
                  <span className="text-[9px] font-bold text-muted-foreground/60 shrink-0 mt-0.5 uppercase tracking-wide">
                    {timeAgo(n.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-muted/10 px-4 py-2.5">
            <p className="text-[10px] text-muted-foreground/50 text-center">
              Showing agent activity from the last 7 days
            </p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
