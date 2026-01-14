import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware de Next.js para proteger rutas
 * Redirige a /login si el usuario no está autenticado y trata de acceder a /app
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Verificar que las variables de entorno estén disponibles
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Si faltan variables de entorno, permitir acceso a /login pero redirigir /app a /login
    if (pathname.startsWith("/app")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Si el usuario está autenticado y trata de acceder a /login o /, redirigir a /app
    if (user && (pathname === "/login" || pathname === "/")) {
      return NextResponse.redirect(new URL("/app", request.url));
    }

    // Si alguien trata de acceder a /signup, redirigir a /login (registro solo desde Supabase)
    if (pathname === "/signup") {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Si el usuario NO está autenticado y trata de acceder a /app o /, redirigir a /login
    if (!user && (pathname.startsWith("/app") || pathname === "/")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  } catch (error) {
    // Si hay un error con Supabase, permitir acceso a /login pero proteger /app
    if (pathname.startsWith("/app")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
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
