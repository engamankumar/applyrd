"use server"

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

/**
 * Persists the Google Refresh Token (the "Permanent Pass") to the User record.
 * This is called from the dashboard client after a successful sign-in to ensure
 * background job agents stay authorized for Gmail briefings 24/7.
 */
export async function syncAgentAuthorization(refreshToken: string) {
  const session = await auth();
  
  if (!session?.user?.email) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await prisma.user.update({
      where: { email: session.user.email },
      data: { refresh_token: refreshToken },
    });
    console.log(`✅ [Agentic Auth Sync] Secured permanent pass for ${session.user.email}`);
    return { success: true };
  } catch (error) {
    console.error("❌ [Agentic Auth Sync] Persistence failed:", error);
    return { success: false, error: "Database error" };
  }
}
