"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [configError, setConfigError] = useState("");

  // Crear cliente de Supabase de forma segura
  const supabase = (() => {
    try {
      return createSupabaseBrowserClient();
    } catch (err: any) {
      return null;
    }
  })();

  // Verificar configuración al montar
  useEffect(() => {
    if (!supabase) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        setConfigError(
          "Error de configuración: Las variables de entorno de Supabase no están configuradas."
        );
      } else {
        setConfigError("Error al inicializar Supabase. Verifica la configuración.");
      }
    }
  }, [supabase]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    
    if (!supabase) {
      setError("No se puede conectar con el servidor. Verifica la configuración.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      // Redirigir a la aplicación
      router.push("/app");
      router.refresh();
    } catch (err: any) {
      setError("Error inesperado. Por favor intenta de nuevo.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-lg dark:border-slate-700 dark:bg-slate-800">
          {/* Logo/Título */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
              Sistema de Facturación
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Inicia sesión para continuar
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-50"
                placeholder="tu@email.com"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-50"
                placeholder="••••••••"
              />
            </div>

            {/* Error de configuración */}
            {configError && (
              <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                <strong>Advertencia:</strong> {configError}
              </div>
            )}

            {/* Error de login */}
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !!configError || !supabase}
              className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Iniciando sesión..." : "Iniciar sesión"}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            Si necesitas una cuenta, contacta al administrador
          </div>
        </div>
      </div>
    </div>
  );
}
