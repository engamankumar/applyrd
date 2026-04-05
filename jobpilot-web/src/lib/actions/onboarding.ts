"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function completeOnboarding(data: any) {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }

  const { preferences, resume, reminders, billing } = data;

  try {
    // 1. Update or Create User Profile
    const user = await prisma.user.upsert({
      where: { email: session.user.email },
      update: {
        preferred_roles: preferences?.title ? [preferences.title] : [],
        location_preference: preferences?.location || "Remote",
        work_type: preferences?.type ? [preferences.type] : ["Full-time"],
        reminder_time: reminders?.time || "09:00",
        subscription_tier: billing?.plan || "beta",
      },
      create: {
        email: session.user.email,
        name: session.user.name || "Beta Pioneer",
        preferred_roles: preferences?.title ? [preferences.title] : [],
        location_preference: preferences?.location || "Remote",
        work_type: preferences?.type ? [preferences.type] : ["Full-time"],
        reminder_time: reminders?.time || "09:00",
        subscription_tier: billing?.plan || "beta",
      }
    });

    // 2. Create Initial Resume Record if provided
    if (resume) {
      await prisma.resume.create({
        data: {
          user_id: user.id,
          original_url: resume.url || "uploaded_locally",
          parsed_skills: resume.skills || [],
          parsed_personal_info: resume.personal_info || {},
          is_active: true,
        },
      });
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Onboarding Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getDashboardStats() {
  const session = await auth();
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      jobs: true,
      _count: {
        select: {
          resumes: true,
          jobs: true,
          applications: true,
        }
      }
    }
  });

  if (!user) return null;

  const avgMatchScore = user.jobs.length > 0
    ? Math.round(user.jobs.reduce((acc: number, job: any) => acc + (job.match_score || 84), 0) / user.jobs.length)
    : 84;

  const appliedCount = user.jobs.filter((j: any) => j.status === 'applied').length;
  const interviewCount = user.jobs.filter((j: any) => j.status === 'interview').length;

  return {
    resumes: user._count.resumes,
    jobs: user._count.jobs,
    applications: appliedCount,
    interviews: interviewCount,
    matchScore: avgMatchScore,
  };
}

export async function getUserJobs() {
  const session = await auth();
  if (!session?.user?.email) return [];

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      jobs: {
        orderBy: { found_at: 'desc' }
      }
    }
  });

  const uniqueJobs = new Map();
  user?.jobs.forEach((j: any) => {
    const key = `${j.title}-${j.company}`;
    if (!uniqueJobs.has(key)) {
      uniqueJobs.set(key, j);
    }
  });

  return Array.from(uniqueJobs.values()).map((j: any) => ({
    id: j.id,
    title: j.title,
    company: j.company,
    status: j.status || "found",
    match_score: j.match_score,
    description: j.description || "",
  })) || [];
}

export async function getJobById(id: string) {
  if (!id || typeof id !== "string") {
    console.error("[ERROR] Malformed Job ID:", id);
    return null;
  }
  
  const session = await auth();
  if (!session?.user?.email) return null;

  return await prisma.job.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      company: true,
      location: true,
      salary_range: true,
      found_at: true,
      match_score: true,
      description: true,
      apply_url: true,
      match_reason: true,
      tailored_result: true,
    }
  });
}

export async function saveJobTailoredResult(jobId: string, result: any) {
  const session = await auth();
  if (!session?.user?.email) return { error: "Unauthorized" };

  try {
    await prisma.job.update({
      where: { id: jobId },
      data: { tailored_result: result }
    });
    revalidatePath(`/dashboard/job/${jobId}`);
    return { success: true };
  } catch (err: any) {
    console.error("Save tailored result error:", err);
    return { error: err.message };
  }
}

export async function saveResumeData(data: {
  skills: string[]
  experience: any[]
  education: any[]
  personal_info: any
}) {
  const session = await auth()
  if (!session?.user?.email) return { error: "Unauthorized" }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return { error: "User not found" }

  try {
    await prisma.resume.create({
      data: {
        user_id: user.id,
        original_url: "uploaded_locally",
        parsed_skills: data.skills || [],
        parsed_experience: data.experience || [],
        parsed_education: data.education || [],
        parsed_personal_info: data.personal_info || {},
        is_active: true,
      } as any
    })
    revalidatePath("/dashboard/resume")
    revalidatePath("/dashboard")
    return { success: true, userId: user.id }
  } catch (err: any) {
    console.error("Save resume error:", err)
    return { error: err.message }
  }
}

export async function getAllResumes() {
  const session = await auth();
  if (!session?.user?.email) return [];

  return await prisma.resume.findMany({
    where: { user: { email: session.user.email } },
    orderBy: { created_at: 'desc' }
  });
}

export async function getApplicationsStats() {
  const session = await auth();
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      jobs: true,
      applications: true
    }
  });

  if (!user) return null;

  const totalApps = user.jobs.length;
  const avgScore = user.jobs.length > 0 
    ? Math.round(user.jobs.reduce((acc: number, j: any) => acc + (j.match_score || 0), 0) / user.jobs.length) 
    : 0;

  return {
    totalApps,
    avgScore,
    interviews: 0, // Mock for now or fetch from applications
    deployments: totalApps
  };
}

export async function getLatestResume() {
  const session = await auth();
  if (!session?.user?.email) return null;

  const resume = await prisma.resume.findFirst({
    where: { user: { email: session.user.email } },
    orderBy: { created_at: 'desc' }
  });

  return resume;
}

export async function syncFoundJobs(jobs: any[]) {
  const session = await auth();
  if (!session?.user?.email) return { success: false };

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!user) return { success: false };

  try {
    const createdJobs = [];
    for (const job of jobs) {
      try {
        console.log(`Syncing job: ${job.title} at ${job.company}`);
        // Support all variations of score field naming from different agent responses
        let rawScore = job.match_score || job.matchScore || job.score || 85;
        const score = typeof rawScore === 'string' ? parseInt(rawScore, 10) : Number(rawScore);
        const finalScore = isNaN(score) ? 85 : Math.round(score);

        const title = job.title || "Untitled Role";
        const company = job.company || "Unknown Company";

        const existingJob = await prisma.job.findFirst({
          where: { user_id: user.id, title, company }
        });

        if (existingJob) continue;

        const created = await prisma.job.create({
          data: {
            user_id: user.id,
            title,
            company,
            location: job.location || "Remote",
            match_score: finalScore,
            match_reason: job.match_reason || "",
            description: job.jd || job.description || "",
            apply_url: job.apply_url || "",
            status: "found",
          } as any
        });
        createdJobs.push(created);
      } catch (e: any) {
        console.error("Individual Job Sync Error:", e.message);
      }
    }

    revalidatePath("/dashboard");
    return { success: true, count: createdJobs.length, jobs: createdJobs };
  } catch (error: any) {
    console.error("Critical Sync Jobs Error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateJobStatus(id: string, status: any) {
  try {
    // Update the job status in the database
    // Note: status is intended to map to ApplicationStatus enum in PRD
    await prisma.job.update({
      where: { id },
      data: { status: status as string } as any
    });
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Update Status Error:", error);
    return { success: false };
  }
}

export async function getUserProfile() {
  const session = await auth();
  if (!session?.user?.email) return null;

  return await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      name: true,
      email: true,
      preferred_roles: true,
      location_preference: true,
      reminder_time: true,
    }
  });
}

export async function updateUserProfile(data: any) {
  const session = await auth();
  if (!session?.user?.email) return { error: "Unauthorized" };

  try {
    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        name: data.name,
        preferred_roles: data.preferred_roles,
        location_preference: data.location_preference,
        reminder_time: data.reminder_time || "09:00",
      }
    });
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (err) {
    console.error("Update profile error:", err);
    return { error: "Failed to update profile" };
  }
}

export async function createManualJob(data: any) {
  const session = await auth();
  if (!session?.user?.email) return { error: "Unauthorized" };

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) return { error: "User not found" };

    const job = await prisma.job.create({
      data: {
        user_id: user.id,
        title: data.title,
        company: data.company,
        location: data.location || "Remote",
        match_score: data.match_score || 0,
        status: data.status || "found",
      } as any
    });

    revalidatePath("/dashboard");
    return { success: true, job };
  } catch (err: any) {
    console.error("Create job error:", err);
    return { error: err.message };
  }
}

export async function setActiveResume(resumeId: string) {
  const session = await auth();
  if (!session?.user?.email) return { error: "Unauthorized" };

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return { error: "User not found" };

  try {
    // 1. Transactionally update is_active status
    await prisma.$transaction([
      prisma.resume.updateMany({
        where: { user_id: user.id },
        data: { is_active: false }
      }),
      prisma.resume.update({
        where: { id: resumeId },
        data: { is_active: true }
      })
    ]);

    revalidatePath("/dashboard/resume");
    revalidatePath("/dashboard");
    return { success: true, userId: user.id };
  } catch (err: any) {
    console.error("Set active resume error:", err);
    return { error: err.message };
  }
}

export async function getMockInterviewSessions() {
  const session = await auth();
  if (!session?.user?.email) return [];

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return [];

  return await prisma.mockInterviewSession.findMany({
    where: { user_id: user.id },
    include: {
      application: {
        include: {
          job: true
        }
      }
    },
    orderBy: { created_at: 'desc' }
  });
}
