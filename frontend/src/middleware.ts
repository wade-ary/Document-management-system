import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Define public routes, including the home (/) route
const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)', '/'])

export default clerkMiddleware(async (auth, request) => {
  // If the route is not public, protect it with Clerk's authentication
  if (!isPublicRoute(request)) {
    const { userId } = await auth()
    
    if (!userId) {
      // Redirect to custom sign-in page instead of Clerk's hosted page
      const signInUrl = new URL('/sign-in', request.url)
      signInUrl.searchParams.set('redirect_url', request.url)
      return NextResponse.redirect(signInUrl)
    }
  }
})

export const config = {
  matcher: [
    // Protect all routes except for static files and Next.js internals
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
