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

  // Auth callback & password recovery must work in any account state.
  if (pathname.startsWith("/auth")) {
    return supabaseResponse;
  }

  const { data: profile } = await supabase
    .from("professional_profiles")
    .select("status")
    .eq("id", user.id)
    .maybeSingle();

  const status = (profile?.status ?? null) as ProfessionalStatus | null;

  if (isPublic || !canAccess(status, pathname)) {
    return redirectTo(homePathFor(status));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
