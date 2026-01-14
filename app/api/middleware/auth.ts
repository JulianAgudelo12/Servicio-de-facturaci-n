import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Middleware de autenticación para rutas API
 * Verifica que el usuario esté autenticado antes de permitir acceso
 * 
 * Uso:
 * ```typescript
 * const auth = await requireAuth();
 * if (auth instanceof NextResponse) return auth; // Error de autenticación
 * const { user, supabase } = auth; // Usuario autenticado
 * ```
 */
export async function requireAuth(): Promise<
  | { user: any; supabase: any }
  | NextResponse<{ error: string }>
> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (!user || error) {
      return NextResponse.json(
        { error: "No autorizado. Debes iniciar sesión." },
        { status: 401 }
      );
    }

    return { user, supabase };
  } catch (err: any) {
    // No exponer detalles del error en producción
    const isDevelopment = process.env.NODE_ENV === "development";
    return NextResponse.json(
      { 
        error: isDevelopment 
          ? `Error de autenticación: ${err?.message}` 
          : "Error de autenticación" 
      },
      { status: 500 }
    );
  }
}

/**
 * Opcional: Verificar roles específicos
 * Ejemplo: requireRole(['admin', 'manager'])
 */
export async function requireRole(
  allowedRoles: string[]
): Promise<
  | { user: any; supabase: any }
  | NextResponse<{ error: string }>
> {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { user } = auth;
  // Asumiendo que el rol está en user.user_metadata.role
  const userRole = user.user_metadata?.role || user.role;

  if (!allowedRoles.includes(userRole)) {
    return NextResponse.json(
      { error: "No tienes permisos suficientes" },
      { status: 403 }
    );
  }

  return auth;
}
