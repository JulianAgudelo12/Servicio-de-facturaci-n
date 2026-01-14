"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Desktop fija a la izquierda */}
      <div className="hidden md:block md:fixed md:inset-y-0 md:left-0 md:z-40">
        <Sidebar />
      </div>

      {/* Contenedor general para mobile + contenido principal */}
      <div className="flex-1 flex flex-col md:ml-64">
        {/* Sidebar Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar Mobile */}
        <div
          className={[
            "fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white z-50 transform transition-transform duration-300 md:hidden",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <Topbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
          <main className="p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
