# Ejemplo de Implementación de Autenticación

Este documento muestra cómo agregar autenticación a tus rutas API.

## Ejemplo: Proteger ruta POST (Crear servicio)

### Antes (Sin autenticación):
```typescript
// app/api/services/route.ts
export async function POST(req: Request) {
  try {
    const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);
    
    // ... resto del código
  }
}
```

### Después (Con autenticación):
```typescript
// app/api/services/route.ts
import { requireAuth } from "../middleware/auth";

export async function POST(req: Request) {
  try {
    // ✅ Verificar autenticación
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { user, supabase } = auth;

    // Ahora puedes usar el supabase autenticado del usuario
    // O si necesitas SERVICE_ROLE_KEY para operaciones específicas:
    const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const adminSupabase = createClient(supabaseUrl, serviceKey);

    // ... resto del código
  }
}
```

## Ejemplo: Proteger ruta DELETE (Eliminar servicios)

```typescript
// app/api/services/route.ts
import { requireAuth, requireRole } from "../middleware/auth";

export async function DELETE(req: Request) {
  try {
    // ✅ Requerir autenticación y rol de admin
    const auth = await requireRole(['admin']);
    if (auth instanceof NextResponse) return auth;
    const { user, supabase } = auth;

    const body = await req.json().catch(() => ({}));
    const codes: string[] = Array.isArray(body?.codes) ? body.codes : [];

    if (!codes.length) {
      return NextResponse.json(
        { error: "No hay códigos para eliminar" },
        { status: 400 }
      );
    }

    // Usar SERVICE_ROLE_KEY solo si es necesario para operaciones administrativas
    const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const adminSupabase = createClient(supabaseUrl, serviceKey);

    const { error } = await adminSupabase
      .from("services")
      .delete()
      .in("code", codes);

    if (error) {
      return NextResponse.json(
        { error: `Error eliminando servicios: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, deleted: codes.length }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}
```

## Configuración en Supabase

### 1. Habilitar Row Level Security (RLS)

En tu dashboard de Supabase:
1. Ve a Authentication > Policies
2. Selecciona la tabla `services`
3. Crea políticas RLS según tus necesidades:

```sql
-- Ejemplo: Solo usuarios autenticados pueden leer servicios
CREATE POLICY "Usuarios autenticados pueden leer servicios"
ON services FOR SELECT
TO authenticated
USING (true);

-- Ejemplo: Solo admins pueden crear servicios
CREATE POLICY "Solo admins pueden crear servicios"
ON services FOR INSERT
TO authenticated
WITH CHECK (
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
);

-- Ejemplo: Usuarios solo pueden modificar sus propios servicios
CREATE POLICY "Usuarios pueden modificar sus servicios"
ON services FOR UPDATE
TO authenticated
USING (agente = auth.email());
```

### 2. Configurar autenticación en tu aplicación

Necesitarás crear páginas de login/signup. Ejemplo básico:

```typescript
// app/login/page.tsx
"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const supabase = createSupabaseBrowserClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) alert(error.message);
    else window.location.href = "/app";
  }

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit">Iniciar sesión</button>
    </form>
  );
}
```

## Notas Importantes

1. **SERVICE_ROLE_KEY vs ANON_KEY:**
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Clave pública, segura para usar en el cliente
   - `SUPABASE_SERVICE_ROLE_KEY`: Clave privada, NUNCA exponer al cliente. Solo usar en servidor con autenticación.

2. **RLS es esencial:** Row Level Security en Supabase actúa como una capa adicional de seguridad incluso si alguien obtiene la ANON_KEY.

3. **Sesiones:** Supabase maneja automáticamente las sesiones con cookies cuando usas `createSupabaseServerClient()`.

4. **Protección de rutas:** También puedes proteger rutas de páginas usando middleware de Next.js:

```typescript
// middleware.ts (en la raíz del proyecto)
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith("/app")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
```
