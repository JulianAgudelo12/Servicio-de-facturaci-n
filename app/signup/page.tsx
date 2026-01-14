"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Página de registro deshabilitada
 * El registro solo se puede hacer desde el dashboard de Supabase
 */
export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirigir automáticamente a login después de mostrar el mensaje
    const timer = setTimeout(() => {
      router.push("/login");
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-lg dark:border-slate-700 dark:bg-slate-800 text-center">
          <div className="mb-4 text-5xl">🔒</div>
          <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-slate-50">
            Registro Deshabilitado
          </h1>
          <p className="mb-6 text-slate-600 dark:text-slate-400">
            El registro de nuevos usuarios solo está disponible desde el panel de administración de Supabase.
          </p>
          <p className="mb-6 text-sm text-slate-500 dark:text-slate-500">
            Si necesitas una cuenta, contacta al administrador del sistema.
          </p>
          <a
            href="/login"
            className="inline-block rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            Volver al inicio de sesión
          </a>
          <p className="mt-4 text-xs text-slate-400">
            Redirigiendo automáticamente en 3 segundos...
          </p>
        </div>
      </div>
    </div>
  );
}
