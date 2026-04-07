import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid profile email https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/contacts.readonly",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at

        // EDGE SAFE LOGGING
        console.log(`🔑 [Auth] Token received for account: ${account.provider}`)
      }
      return token
    },
    async session({ session, token }: any) {
      session.accessToken = token.accessToken
      session.refreshToken = token.refreshToken
      // userId is set in a separate server component fetch if needed for now
      return session
    },
  },
  events: {
    async signIn({ user, account }: any) {
      if (account?.provider === "google") {
        const { prisma } = await import("@/lib/prisma")
        
        try {
          console.log(`💾 [Auth Persistence] Synchronizing tokens for ${user.email}...`)
          await prisma.user.upsert({
            where: { email: user.email },
            update: {
              access_token: account.access_token,
              refresh_token: account.refresh_token,
            },
            create: {
              email: user.email,
              name: user.name || "Default User",
              access_token: account.access_token,
              refresh_token: account.refresh_token,
            }
          })
          console.log(`✅ [Auth Persistence] Successfully persisted persistent keys to DB.`)
        } catch (e) {
          console.error(`❌ [Auth Persistence Error] Failed to save tokens:`, e)
        }
      }
    }
  }
})
