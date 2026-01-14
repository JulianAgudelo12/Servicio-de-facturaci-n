# Guía Completa de Implementación de Autenticación

## 📋 Archivos Creados

1. ✅ `app/login/page.tsx` - Página de inicio de sesión
2. ✅ `app/signup/page.tsx` - Página de registro
3. ✅ `middleware.ts` - Middleware para proteger rutas
4. ✅ `lib/hooks/useAuth.ts` - Hook para manejar autenticación en el cliente

---

## 🔧 Paso 1: Configurar Supabase

### 1.1 Habilitar Autenticación en Supabase

1. Ve a tu [Dashboard de Supabase](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **Authentication** → **Providers**
4. Habilita **Email** provider
5. (Opcional) Configura otros proveedores (Google, GitHub, etc.)

### 1.2 Configurar Email Templates (Opcional)

1. Ve a **Authentication** → **Email Templates**
2. Personaliza los templates de confirmación de email si lo deseas
3. Para desarrollo, puedes deshabilitar la confirmación de email:
   - Ve a **Authentication** → **Settings**
   - Desactiva **"Enable email confirmations"** (solo para desarrollo)

### 1.3 Crear Usuario de Prueba

**Opción A: Desde el Dashboard**
1. Ve a **Authentication** → **Users**
2. Click en **"Add user"** → **"Create new user"**
3. Ingresa email y contraseña
4. Click en **"Create user"**

**Opción B: Desde la aplicación**
1. Ve a `http://localhost:3000/signup`
2. Completa el formulario de registro
3. Si la confirmación de email está deshabilitada, podrás iniciar sesión inmediatamente

---

## 🚀 Paso 2: Probar la Autenticación

### 2.1 Probar Login

1. Inicia el servidor: `npm run dev`
2. Ve a `http://localhost:3000/login`
3. Ingresa tus credenciales
4. Deberías ser redirigido a `/app`

### 2.2 Verificar Protección de Rutas

**Sin autenticación:**
- Ve a `http://localhost:3000/app` → Debería redirigir a `/login`
- Ve a `http://localhost:3000/api/services` → Debería retornar 401

**Con autenticación:**
- Después de iniciar sesión, `/app` debería funcionar
- Las rutas API deberían funcionar correctamente

---

## 🎨 Paso 3: Personalizar (Opcional)

### 3.1 Agregar Botón de Cerrar Sesión

En cualquier componente de tu aplicación:

```typescript
"use client";
import { useAuth } from "@/lib/hooks/useAuth";

export default function Header() {
  const { user, signOut } = useAuth();

  return (
    <div>
      <p>Usuario: {user?.email}</p>
      <button onClick={signOut}>Cerrar sesión</button>
    </div>
  );
}
```

### 3.2 Mostrar Estado de Autenticación

```typescript
"use client";
import { useAuth } from "@/lib/hooks/useAuth";

export default function UserInfo() {
  const { user, loading } = useAuth();

  if (loading) return <p>Cargando...</p>;
  if (!user) return <p>No autenticado</p>;

  return (
    <div>
      <p>Email: {user.email}</p>
      <p>ID: {user.id}</p>
    </div>
  );
}
```

---

## 🔒 Paso 4: Configurar Row Level Security (RLS) en Supabase

Para mayor seguridad, configura RLS en tu base de datos:

### 4.1 Habilitar RLS en la tabla `services`

1. Ve a **Table Editor** → Selecciona la tabla `services`
2. Click en **"Enable RLS"**

### 4.2 Crear Políticas RLS

Ve a **Authentication** → **Policies** → Selecciona la tabla `services`

**Política 1: Usuarios autenticados pueden leer servicios**
```sql
CREATE POLICY "Usuarios autenticados pueden leer servicios"
ON services FOR SELECT
TO authenticated
USING (true);
```

**Política 2: Usuarios autenticados pueden crear servicios**
```sql
CREATE POLICY "Usuarios autenticados pueden crear servicios"
ON services FOR INSERT
TO authenticated
WITH CHECK (true);
```

**Política 3: Usuarios autenticados pueden actualizar servicios**
```sql
CREATE POLICY "Usuarios autenticados pueden actualizar servicios"
ON services FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
```

**Política 4: Usuarios autenticados pueden eliminar servicios**
```sql
CREATE POLICY "Usuarios autenticados pueden eliminar servicios"
ON services FOR DELETE
TO authenticated
USING (true);
```

---

## 📝 Variables de Entorno Requeridas

Asegúrate de tener estas variables en `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

**⚠️ IMPORTANTE:**
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` es pública (se expone al cliente)
- `SUPABASE_SERVICE_ROLE_KEY` es privada (NUNCA exponer al cliente)
- Ambos están en tu dashboard de Supabase → Settings → API

---

## 🧪 Pruebas

### Probar Flujo Completo

1. **Registro:**
   - Ve a `/signup`
   - Crea una cuenta
   - Deberías ser redirigido a `/app`

2. **Login:**
   - Cierra sesión
   - Ve a `/login`
   - Inicia sesión
   - Deberías ser redirigido a `/app`

3. **Protección:**
   - Cierra sesión
   - Intenta acceder a `/app` directamente
   - Deberías ser redirigido a `/login`

4. **APIs:**
   - Sin autenticación: `GET /api/services` → 401
   - Con autenticación: `GET /api/services` → 200

---

## 🐛 Solución de Problemas

### Error: "Invalid login credentials"
- Verifica que el email y contraseña sean correctos
- Verifica que el usuario exista en Supabase
- Si la confirmación de email está habilitada, verifica tu email

### Error: "Email already registered"
- El email ya está registrado
- Usa otro email o inicia sesión con ese email

### Las rutas API siguen retornando 401
- Verifica que hayas iniciado sesión correctamente
- Verifica que las cookies estén siendo enviadas
- Revisa la consola del navegador para errores

### El middleware no redirige correctamente
- Verifica que `middleware.ts` esté en la raíz del proyecto
- Reinicia el servidor de desarrollo
- Verifica que las rutas en `matcher` sean correctas

---

## ✅ Checklist de Implementación

- [ ] Configurar autenticación en Supabase (Email provider habilitado)
- [ ] Crear usuario de prueba
- [ ] Probar login en `/login`
- [ ] Probar registro en `/signup`
- [ ] Verificar que `/app` redirige a `/login` sin autenticación
- [ ] Verificar que las rutas API retornan 401 sin autenticación
- [ ] Verificar que las rutas API funcionan con autenticación
- [ ] (Opcional) Configurar RLS en Supabase
- [ ] (Opcional) Agregar botón de cerrar sesión

---

## 🎉 ¡Listo!

Tu sistema de autenticación está completamente implementado. Todas las rutas están protegidas y los usuarios deben iniciar sesión para acceder a la aplicación.
