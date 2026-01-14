# Explicación Detallada de los Cambios de Seguridad

## 🎯 Objetivo

Implementar medidas de seguridad para proteger tu aplicación antes de subirla a GitHub. Todos los cambios están explicados paso a paso.

---

## 📁 Estructura de Archivos Creados/Modificados

```
app/api/
├── middleware/
│   └── auth.ts                    ← NUEVO: Middleware de autenticación
├── utils/
│   ├── validators.ts              ← NUEVO: Funciones de validación
│   └── errors.ts                  ← NUEVO: Manejo seguro de errores
└── services/
    ├── route.ts                    ← MODIFICADO: Agregada autenticación y validación
    └── [code]/
        ├── route.ts                ← MODIFICADO: Agregada autenticación y validación
        └── invoice/
            └── route.ts            ← MODIFICADO: Agregada autenticación
```

---

## 🔐 1. Sistema de Autenticación

### ¿Qué es?
Un sistema que verifica que el usuario esté autenticado antes de permitir acceso a las rutas API.

### ¿Por qué es importante?
**ANTES:** Cualquiera podía acceder a tus APIs sin iniciar sesión:
```bash
# Cualquiera podía hacer esto:
curl http://localhost:3000/api/services
# Y obtener TODOS los servicios
```

**AHORA:** Solo usuarios autenticados pueden acceder:
```bash
# Sin autenticación → Error 401
curl http://localhost:3000/api/services
# {"error": "No autorizado. Debes iniciar sesión."}

# Con autenticación → Funciona
# (necesitas token de sesión)
```

### Cómo funciona:

**Archivo:** `app/api/middleware/auth.ts`

```typescript
// Esta función verifica si el usuario está autenticado
export async function requireAuth() {
  // 1. Obtiene el cliente de Supabase con las cookies de sesión
  const supabase = await createSupabaseServerClient();
  
  // 2. Verifica si hay un usuario autenticado
  const { data: { user }, error } = await supabase.auth.getUser();
  
  // 3. Si no hay usuario, retorna error 401
  if (!user || error) {
    return NextResponse.json(
      { error: "No autorizado. Debes iniciar sesión." },
      { status: 401 }
    );
  }
  
  // 4. Si hay usuario, retorna el usuario y el cliente de Supabase
  return { user, supabase };
}
```

**Uso en las rutas:**
```typescript
export async function GET(req: Request) {
  // ✅ Paso 1: Verificar autenticación
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth; // Si hay error, retornarlo
  
  // ✅ Paso 2: Si llegamos aquí, el usuario está autenticado
  const { user, supabase } = auth;
  
  // ✅ Paso 3: Continuar con la lógica de la ruta
  // ...
}
```

---

## ✅ 2. Validación de Entrada

### ¿Qué es?
Verificar que los datos enviados por el usuario sean válidos antes de procesarlos.

### ¿Por qué es importante?
**ANTES:** Podías recibir datos maliciosos o inválidos:
```javascript
// Alguien podía enviar:
{
  fecha: "no-es-una-fecha",
  telefono: "<script>alert('hack')</script>",
  archivo: archivo_de_100GB.exe
}
```

**AHORA:** Todos los datos son validados:
```javascript
// Si envías datos inválidos:
{
  fecha: "no-es-una-fecha"
}
// → Error 400: "Formato de fecha inválido. Debe ser YYYY-MM-DD"
```

### Ejemplos de Validación:

**Archivo:** `app/api/utils/validators.ts`

#### Validación de Fecha:
```typescript
validateDate("2024-01-15")  // ✅ Válido
validateDate("15-01-2024")  // ❌ Error: formato incorrecto
validateDate("2024-13-45") // ❌ Error: fecha inválida
```

#### Validación de Teléfono:
```typescript
validatePhone("+57 300 123 4567")  // ✅ Válido
validatePhone("300-123-4567")      // ✅ Válido
validatePhone("<script>")          // ❌ Error: caracteres inválidos
```

#### Validación de Archivo:
```typescript
// Archivo PDF de 5MB → ✅ Válido
// Archivo EXE de 5MB → ❌ Error: tipo no permitido
// Archivo PDF de 15MB → ❌ Error: demasiado grande (máx 10MB)
```

### Sanitización:
```typescript
// ANTES:
cliente: "<script>alert('hack')</script>Juan"

// DESPUÉS (sanitizado):
cliente: "alert('hack')Juan"  // Elimina < y >
```

---

## 🛡️ 3. Manejo Seguro de Errores

### ¿Qué es?
Manejar errores sin exponer información sensible sobre tu sistema.

### ¿Por qué es importante?
**ANTES:** Los errores exponían información peligrosa:
```json
{
  "error": "Error en /var/www/app/database/connection.js:45: Cannot connect to postgresql://user:password@db:5432/mydb"
}
```
Un atacante podría usar esta información para atacar tu base de datos.

**AHORA:** Los errores son genéricos en producción:
```json
// Desarrollo (muestra detalles):
{
  "error": "Error obteniendo servicios: connection timeout"
}

// Producción (genérico):
{
  "error": "Error procesando la solicitud"
}
```

### Cómo funciona:

**Archivo:** `app/api/utils/errors.ts`

```typescript
export function handleError(err: any, defaultMessage: string) {
  const isDevelopment = process.env.NODE_ENV === "development";
  
  // En desarrollo: muestra detalles para debugging
  // En producción: solo mensaje genérico
  const errorMessage = isDevelopment 
    ? (err?.message || defaultMessage)
    : defaultMessage;

  return NextResponse.json(
    { error: errorMessage },
    { status: 500 }
  );
}
```

---

## 🔄 4. Cambios en Cada Ruta API

### Ruta: GET `/api/services` (Listar servicios)

**Cambios implementados:**

1. **Autenticación:**
```typescript
const auth = await requireAuth();
if (auth instanceof NextResponse) return auth;
```

2. **Validación de parámetros:**
```typescript
// Valida formato de fechas
if (desde) {
  const dateValidation = validateDate(desde);
  if (!dateValidation.valid) {
    return createErrorResponse(dateValidation.error!, 400);
  }
}

// Valida estados
if (estado) {
  const estadoValidation = validateEstado(estado);
  if (!estadoValidation.valid) {
    return createErrorResponse(estadoValidation.error!, 400);
  }
}
```

3. **Sanitización de búsquedas:**
```typescript
const q = sanitizeString(url.searchParams.get("q") ?? "");
```

**Resultado:** Solo usuarios autenticados pueden buscar servicios, con parámetros validados.

---

### Ruta: POST `/api/services` (Crear servicio)

**Cambios implementados:**

1. **Autenticación requerida**
2. **Validación completa de todos los campos:**
```typescript
const validations = [
  validateString(cliente, "Cliente"),
  validatePhone(telefono),
  validateString(maquina, "Máquina"),
  validateDate(fecha),
  validateTime(hora),
  validateEstado(estado),
  // ... más validaciones
];

for (const validation of validations) {
  if (!validation.valid) {
    return createErrorResponse(validation.error!, 400);
  }
}
```

3. **Validación de archivos:**
```typescript
if (file instanceof File) {
  const fileValidation = validateFile(file);
  if (!fileValidation.valid) {
    return createErrorResponse(fileValidation.error!, 400);
  }
  // Verifica:
  // - Tamaño máximo (10MB)
  // - Tipo permitido (PDF, PNG, JPG, DOC, DOCX)
}
```

**Resultado:** Solo usuarios autenticados pueden crear servicios, con todos los datos validados.

---

### Ruta: DELETE `/api/services` (Eliminar servicios)

**Cambios implementados:**

1. **Autenticación requerida**
2. **Límite de eliminaciones:**
```typescript
// Previene eliminaciones masivas accidentales
if (codes.length > 100) {
  return createErrorResponse(
    "No se pueden eliminar más de 100 servicios a la vez", 
    400
  );
}
```

3. **Validación de códigos:**
```typescript
const validCodes = codes.filter(
  (code) => typeof code === "string" && code.trim().length > 0
);
```

**Resultado:** Solo usuarios autenticados pueden eliminar, con límites de seguridad.

---

## 📊 Resumen de Protecciones

| Protección | Estado | Descripción |
|-----------|--------|-------------|
| 🔐 Autenticación | ✅ Implementada | Todas las rutas requieren usuario autenticado |
| ✅ Validación de entrada | ✅ Implementada | Todos los campos son validados |
| 🧹 Sanitización | ✅ Implementada | Strings son sanitizados |
| 🛡️ Manejo de errores | ✅ Implementado | No expone información sensible |
| 📁 Validación de archivos | ✅ Implementada | Tipo y tamaño validados |
| 🚫 Límites de operaciones | ✅ Implementados | Previene abusos |

---

## ⚠️ IMPORTANTE: Lo que Falta

### 1. Configurar Autenticación en Supabase

**Necesitas:**
1. Ir a tu dashboard de Supabase
2. Configurar métodos de autenticación (Email/Password)
3. Crear usuarios de prueba

**Sin esto, las rutas retornarán error 401.**

### 2. Crear Páginas de Login

**Necesitas crear:**
- `/app/login/page.tsx` - Página para iniciar sesión
- (Opcional) `/app/signup/page.tsx` - Página para registrarse

**Ejemplo básico de login:**
```typescript
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

### 3. Proteger Rutas de Páginas

**Crear:** `middleware.ts` en la raíz del proyecto

```typescript
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

  // Redirigir a login si no está autenticado y trata de acceder a /app
  if (!user && request.nextUrl.pathname.startsWith("/app")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
```

---

## ✅ Verificación Final

### Antes de subir a GitHub, verifica:

1. ✅ **No hay archivos `.env` en el repositorio**
   ```bash
   git ls-files | grep .env
   # No debe mostrar nada
   ```

2. ✅ **No hay credenciales hardcodeadas**
   ```bash
   grep -r "SUPABASE_SERVICE_ROLE_KEY" --exclude-dir=node_modules .
   # Solo debe aparecer en archivos que usan process.env
   ```

3. ✅ **`.gitignore` incluye `.env*`**
   ```bash
   cat .gitignore | grep "\.env"
   # Debe mostrar: .env*
   ```

---

## 🎉 Resultado

Tu aplicación ahora tiene:
- ✅ Autenticación en todas las rutas API
- ✅ Validación completa de entrada
- ✅ Manejo seguro de errores
- ✅ Protección contra ataques comunes

**El código está listo para subir a GitHub de forma segura.**

**Próximo paso:** Configurar autenticación en Supabase y crear las páginas de login para que todo funcione completamente.
