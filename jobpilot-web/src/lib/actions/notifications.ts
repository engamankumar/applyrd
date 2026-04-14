"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type Notification = {
  id: string;
  type: "gmail_sync" | "job_search" | "interview" | "application";
  title: string;
  body: string;
  timestamp: string; // ISO string
  count?: number;
};

export async function getRecentNotifications(): Promise<Notification[]> {
  const session = await auth();
  if (!session?.user?.email) return [];

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user) return [];

  const since = new Date();
  since.setDate(since.getDate() - 7); // last 7 days

  // Fetch all relevant jobs in one query
  const jobs = await prisma.job.findMany({
    where: {
      user_id: user.id,
      found_at: { gte: since },
    },
    select: {
      id: true,
      title: true,
      company: true,
      status: true,
      source_platform: true,
      found_at: true,
    },
    orderBy: { found_at: "desc" },
  });

  const notifications: Notification[] = [];

  // --- Group Gmail sync events by day ---
  const gmailJobs = jobs.filter((j) => j.source_platform === "gmail");
  if (gmailJobs.length > 0) {
    // Group by calendar date
    const byDay = new Map<string, typeof gmailJobs>();
    for (const job of gmailJobs) {
      const day = job.found_at.toISOString().split("T")[0];
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day)!.push(job);
    }
    for (const [, dayJobs] of byDay) {
      const latest = dayJobs[0].found_at;
      notifications.push({
        id: `gmail-sync-${latest.toISOString()}`,
        type: "gmail_sync",
        title: "Gmail Sync Completed",
        body: `${dayJobs.length} new lead${dayJobs.length > 1 ? "s" : ""} extracted from your inbox`,
        timestamp: latest.toISOString(),
        count: dayJobs.length,
      });
    }
  }

  // --- Group daily sweep events by day ---
  const sweepJobs = jobs.filter((j) => j.source_platform === "daily_sweep");
  if (sweepJobs.length > 0) {
    const byDay = new Map<string, typeof sweepJobs>();
    for (const job of sweepJobs) {
      const day = job.found_at.toISOString().split("T")[0];
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day)!.push(job);
    }
    for (const [, dayJobs] of byDay) {
      const latest = dayJobs[0].found_at;
      notifications.push({
        id: `sweep-${latest.toISOString()}`,
        type: "job_search",
        title: "Job Search Completed",
        body: `${dayJobs.length} new role${dayJobs.length > 1 ? "s" : ""} found and scored by your agent`,
        timestamp: latest.toISOString(),
        count: dayJobs.length,
      });
    }
  }

  // --- Interview invites (individual notifications) ---
  const interviews = jobs.filter((j) => j.status === "interview_scheduled");
  for (const job of interviews.slice(0, 5)) {
    notifications.push({
      id: `interview-${job.id}`,
      type: "interview",
      title: "Interview Invite Detected",
      body: `${job.title} at ${job.company}`,
      timestamp: job.found_at.toISOString(),
    });
  }

  // --- Application confirmations ---
  const applied = jobs.filter((j) => j.status === "applied" && j.source_platform === "gmail");
  for (const job of applied.slice(0, 3)) {
    notifications.push({
      id: `applied-${job.id}`,
      type: "application",
      title: "Application Confirmed",
      body: `${job.title} at ${job.company}`,
      timestamp: job.found_at.toISOString(),
    });
  }

  // Sort all notifications newest-first
  return notifications.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}
