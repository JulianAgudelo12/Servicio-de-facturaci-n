# Revisión de Seguridad - Sistema de Facturación

## ⚠️ PROBLEMAS CRÍTICOS (Deben corregirse ANTES de subir a GitHub)

### 1. **FALTA DE AUTENTICACIÓN EN RUTAS API** 🔴 CRÍTICO

**Problema:** Todas las rutas API (`/api/services/*`) están completamente abiertas sin autenticación.

**Impacto:** Cualquier persona puede:
- Ver todos los servicios
- Crear servicios falsos
- Modificar o eliminar servicios existentes
- Acceder a información sensible de clientes

**Ubicación:**
- `app/api/services/route.ts` (GET, POST, DELETE)
- `app/api/services/[code]/route.ts` (GET, PUT)
- `app/api/services/[code]/invoice/route.ts` (GET)

**Solución recomendada:**
```typescript
// Crear middleware de autenticación
// app/api/middleware/auth.ts
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function requireAuth() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (!user || error) {
    return NextResponse.json(
      { error: "No autorizado" },
      { status: 401 }
    );
  }
  
  return { user, supabase };
}
```

Luego agregar en cada ruta:
```typescript
const auth = await requireAuth();
if (auth instanceof NextResponse) return auth;
const { user, supabase } = auth;
```

### 2. **USO DE SERVICE_ROLE_KEY SIN PROTECCIÓN** 🔴 CRÍTICO

**Problema:** Se usa `SUPABASE_SERVICE_ROLE_KEY` directamente, que otorga acceso total a la base de datos.

**Impacto:** Si alguien accede a esta clave, puede hacer cualquier operación en tu base de datos.

**Ubicación:** Todas las rutas API usan esta clave.

**Solución recomendada:**
- Usar autenticación con usuarios reales
- Usar `NEXT_PUBLIC_SUPABASE_ANON_KEY` con Row Level Security (RLS) habilitado en Supabase
- Solo usar SERVICE_ROLE_KEY en casos muy específicos y protegidos

### 3. **PÁGINA DE PRUEBA EXPUESTA** 🟡 ALTO

**Problema:** `app/test-supabase/page.tsx` puede exponer información sensible.

**Impacto:** Puede mostrar datos de la base de datos a cualquiera que acceda a `/test-supabase`.

**Solución:**
- Eliminar el archivo si no es necesario
- O protegerlo con autenticación
- O moverlo a una ruta protegida

---

## ⚠️ PROBLEMAS MODERADOS (Recomendado corregir)

### 4. **VALIDACIÓN DE ENTRADA LIMITADA** 🟡 MODERADO

**Problemas:**
- No hay sanitización de inputs
- No hay validación de formato (teléfono, fecha, etc.)
- No hay límites de tamaño para archivos subidos
- No hay validación de tipos de archivo más estricta

**Ubicación:** 
- `app/api/services/route.ts` (POST)
- `app/api/services/[code]/route.ts` (PUT)

**Solución recomendada:**
```typescript
// Validar formato de teléfono
const phoneRegex = /^[0-9+\-\s()]+$/;
if (!phoneRegex.test(telefono)) {
  return NextResponse.json(
    { error: "Formato de teléfono inválido" },
    { status: 400 }
  );
}

// Validar tamaño de archivo (ej: máximo 10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
if (file.size > MAX_FILE_SIZE) {
  return NextResponse.json(
    { error: "Archivo demasiado grande" },
    { status: 400 }
  );
}

// Validar formato de fecha
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
if (!dateRegex.test(fecha)) {
  return NextResponse.json(
    { error: "Formato de fecha inválido" },
    { status: 400 }
  );
}
```

### 5. **MANEJO DE ERRORES EXPONE INFORMACIÓN** 🟡 MODERADO

**Problema:** Los mensajes de error pueden exponer detalles internos del sistema.

**Ubicación:** Todas las rutas API.

**Solución recomendada:**
```typescript
// En producción, no exponer detalles del error
const isDevelopment = process.env.NODE_ENV === 'development';

return NextResponse.json(
  { 
    error: isDevelopment 
      ? err?.message ?? "Error interno" 
      : "Error procesando la solicitud" 
  },
  { status: 500 }
);
```

### 6. **FALTA DE RATE LIMITING** 🟡 MODERADO

**Problema:** No hay límites de peticiones, permitiendo abuso.

**Solución recomendada:**
- Implementar rate limiting con `@upstash/ratelimit` o similar
- Limitar por IP o por usuario autenticado

---

## ✅ BUENAS PRÁCTICAS ENCONTRADAS

1. ✅ Variables de entorno correctamente configuradas
2. ✅ `.gitignore` incluye `.env*` (archivos de entorno no se subirán)
3. ✅ No hay credenciales hardcodeadas en el código
4. ✅ Uso de Supabase (protección contra SQL injection)

---

## 📋 CHECKLIST ANTES DE SUBIR A GITHUB

- [ ] Implementar autenticación en todas las rutas API
- [ ] Eliminar o proteger `app/test-supabase/page.tsx`
- [ ] Agregar validación de entrada robusta
- [ ] Mejorar manejo de errores (no exponer detalles en producción)
- [ ] Verificar que `.env.local` NO esté en el repositorio
- [ ] Verificar que no haya archivos `.env` en el repositorio
- [ ] Considerar agregar rate limiting
- [ ] Habilitar Row Level Security (RLS) en Supabase
- [ ] Revisar permisos de almacenamiento en Supabase Storage

---

## 🔒 VERIFICACIÓN FINAL

Antes de hacer commit, ejecuta:

```bash
# Verificar que no hay archivos .env en el repositorio
git ls-files | grep -E "\.env"

# Verificar que no hay credenciales hardcodeadas
grep -r "SUPABASE_SERVICE_ROLE_KEY" --exclude-dir=node_modules .
grep -r "eyJ" --exclude-dir=node_modules . | grep -v "node_modules"

# Verificar que .gitignore está configurado correctamente
cat .gitignore | grep "\.env"
```

---

## 📚 RECURSOS ADICIONALES

- [Next.js Authentication](https://nextjs.org/docs/app/building-your-application/authentication)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
