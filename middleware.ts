import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware de Next.js para proteger rutas
 * Redirige a /login si el usuario no está autenticado y trata de acceder a /app
 */
export async function middleware(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Si el usuario está autenticado y trata de acceder a /login, redirigir a /app
  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  // Si alguien trata de acceder a /signup, redirigir a /login (registro solo desde Supabase)
  if (pathname === "/signup") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Si el usuario NO está autenticado y trata de acceder a /app, redirigir a /login
  if (!user && pathname.startsWith("/app")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
