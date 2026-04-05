import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const isLoggedIn = !!session

  const protectedPaths = ["/dashboard", "/onboarding"]
  const isProtectedRoute = protectedPaths.some(path => nextUrl.pathname.startsWith(path))

  // Not logged in and trying to access protected route → redirect to home
  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/", nextUrl))
  }

  // Logged in but not done onboarding (no name in session) → redirect to onboarding
  // This is a soft check — skipped for now to allow demo without DB
  // if (isLoggedIn && nextUrl.pathname.startsWith("/dashboard") && !session?.user?.name) {
  //   return NextResponse.redirect(new URL("/onboarding", nextUrl))
  // }

  return NextResponse.next()
})

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*"]
}
