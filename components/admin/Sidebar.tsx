"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../lib/hooks/useAuth";

const NavItem = ({ label, href, active }: { label: string; href: string; active?: boolean }) => (
  <Link
    href={href}
    className={[
      "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition",
      active
        ? "bg-emerald-600 text-white"
        : "text-slate-200 hover:bg-slate-800 hover:text-white",
    ].join(" ")}
  >
    <span className="h-2 w-2 rounded-full bg-current opacity-70" />
    {label}
  </Link>
);

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const userInitial = user?.email?.charAt(0).toUpperCase() || "U";

  const handleSignOut = () => {
    signOut();
    if (onClose) onClose();
  };

  return (
    <aside className="h-screen w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col relative">
      {/* Logo + nombre */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Image
            src="/logo-briolete.png"
            alt="Briolete logo"
            width={42}
            height={42}
            className="rounded-md object-contain"
            priority
          />

          <div className="leading-tight">
            <div className="text-emerald-400 text-sm font-semibold">
              Joyería
            </div>
            <div className="text-white text-xl font-bold tracking-wide">
              Briolete
            </div>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden text-slate-300 hover:text-white"
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        )}
      </div>

      {/* Navegación scrolleable */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        <div>
          <div className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Ventas
          </div>

          <div className="space-y-1">
            <NavItem 
              label="Servicios" 
              href="/app" 
              active={pathname === "/app"} 
            />
            <NavItem 
              label="Historial" 
              href="/app/historial" 
              active={pathname === "/app/historial"} 
            />
          </div>
        </div>
      </nav>

      {/* Footer fijo abajo */}
      <div className="p-3 border-t border-slate-800 shrink-0">
        <div className="flex items-center gap-2 mb-3 px-2">
          <div className="h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center font-semibold text-white text-sm">
            {userInitial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-300 truncate">{user?.email || "Usuario"}</div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-red-500 hover:bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition"
        >
          <span>⏻</span>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
