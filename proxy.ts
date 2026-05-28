import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Edge middleware — authentication gate ONLY.
 *
 * Why no role checks here?
 *   The Edge runtime cannot run `firebase-admin`, so it cannot verify a
 *   Firebase session cookie. Decoding the JWT manually (the previous
 *   implementation) was insecure: a forged token could route a user into
 *   the admin shell. Even though the API re-checked, the UX leaked.
 *
 *   Per CONTEXT.md §4.4: middleware only checks for cookie *presence*.
 *   Role enforcement is delegated to Node-runtime route layouts, which
 *   call `requireRole()` from `@/lib/auth/server`:
 *     - app/(admin)/admin/layout.tsx        -> requireRole("admin")
 *     - app/(employee)/employee/layout.tsx  -> employee status check
 *     - app/vendor-management/layout.tsx    -> requireRole("admin")
 *
 *   Layouts can safely use `firebase-admin` because they run on Node.
 */

// Helper to check session-cookie presence. Edge runtime cannot verify the
// cookie's signature; we delegate the cryptographic check to Node layouts.
const SESSION_COOKIE = "__session";
// Legacy cookies tolerated during the rollout window. Remove once all
// active clients have rotated through POST /api/auth/session at least once.
const LEGACY_COOKIES = ["session", "firebaseToken"] as const;

function hasSessionCookie(request: NextRequest): boolean {
  if (request.cookies.get(SESSION_COOKIE)?.value) return true;
  for (const name of LEGACY_COOKIES) {
    if (request.cookies.get(name)?.value) return true;
  }
  return false;
}

// Protected routes that require authentication
const protectedRoutes = [
  "/user",
  // "/cart",
  "/wishlist",
  "/success",
  "/checkout",
  "/settings",
  "/admin",
  "/employee",
  "/vendor",
  "/vendor-management",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route),
  );
  if (!isProtected) return NextResponse.next();

  if (!hasSessionCookie(request)) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Authenticated. Role enforcement happens in the Node-runtime layout
  // for the matched route group (admin / employee / vendor-management).
  // Forward the pathname on the *request* headers so server layouts can
  // read it via `headers()` and make path-aware decisions (e.g. let
  // /admin/access-denied render without re-redirecting non-admins to it).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
