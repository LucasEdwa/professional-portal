import { canAccess, homePathFor, type ProfessionalStatus } from "@/lib/professional";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Reachable without a session. `/auth/*` also hosts the password-recovery page. */
const PUBLIC_PREFIXES = ["/login", "/register", "/auth"];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Redirects must carry any refreshed auth cookies, or the session is lost.
  function redirectTo(pathname: string) {
    const response = NextResponse.redirect(new URL(pathname, request.url));
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie);
    });
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  if (!user) {
    return isPublic ? supabaseResponse : redirectTo("/login");
  }

  // Auth callback, password recovery and MFA screens work in any account state.
  if (pathname.startsWith("/auth") || pathname === "/mfa" || pathname.startsWith("/mfa/")) {
    return supabaseResponse;
  }

  // Patient data (approved professionals) and the admin area require a
  // second factor (HSLF-FS 2016:40). The database enforces the same (aal2).
  async function mfaRedirect(): Promise<NextResponse | null> {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (data?.currentLevel === "aal2") return null;
    return redirectTo(data?.nextLevel === "aal2" ? "/mfa/verify" : "/mfa/setup");
  }

  const { data: profile } = await supabase
    .from("professional_profiles")
    .select("status")
    .eq("id", user.id)
    .maybeSingle();

  const status = (profile?.status ?? null) as ProfessionalStatus | null;

  // Admin area is independent of the admin's own professional status.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (isAdmin !== true) return redirectTo(homePathFor(status));
    return (await mfaRedirect()) ?? supabaseResponse;
  }

  if (isPublic || !canAccess(status, pathname)) {
    // Staff without an approved practice of their own land in the admin area.
    if (status !== "approved" && (isPublic || pathname === "/")) {
      const { data: isAdmin } = await supabase.rpc("is_admin");
      if (isAdmin === true) return redirectTo("/admin");
    }
    return redirectTo(homePathFor(status));
  }

  if (status === "approved") {
    return (await mfaRedirect()) ?? supabaseResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
