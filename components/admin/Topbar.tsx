"use client";

import { useAuth } from "@/lib/hooks/useAuth";

export default function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, signOut } = useAuth();
  const userInitial = user?.email?.charAt(0).toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
      <div className="flex items-center gap-3 px-4 md:px-6 py-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="md:hidden inline-flex items-center justify-center rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 text-sm font-semibold shadow-sm"
            aria-label="Abrir menú"
          >
            ☰
          </button>
        )}

        <div className="flex-1">
          <div className="text-sm text-slate-500">Ventas / Servicios</div>
          <div className="text-lg font-semibold text-slate-900">Servicios</div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-medium text-slate-900">
              {user?.email || "Usuario"}
            </span>
            <button
              onClick={signOut}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Cerrar sesión
            </button>
          </div>
          <div className="h-9 w-9 rounded-full bg-emerald-600 flex items-center justify-center font-semibold text-white">
            {userInitial}
          </div>
          <button
            onClick={signOut}
            className="sm:hidden rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
            title="Cerrar sesión"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
