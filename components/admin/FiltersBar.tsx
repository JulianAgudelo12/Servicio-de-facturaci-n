"use client";

export type ServiceFilters = {
  estado: "" | "Pendiente" | "En fabricación" | "Garantía" | "Entregado";
  maquina: string;
  prioridad: "" | "24 horas" | "48 horas" | "72 horas" | "Normal";
  desde: string;
  hasta: string;
};

export default function FiltersBar({
  search,
  setSearch,
  onNew,

  // ✅ nuevo
  selectedCount,
  onDeleteSelected,

  filters,
  setFilters,
  onApply,
  onClear,
  showFilters,
  setShowFilters,
}: {
  search: string;
  setSearch: (v: string) => void;
  onNew: () => void;

  selectedCount: number;
  onDeleteSelected: () => void;

  filters: ServiceFilters;
  setFilters: (f: ServiceFilters) => void;
  onApply: () => void;
  onClear: () => void;

  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
}) {
  return (
    <div className="py-4 space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onNew}
            className="rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-semibold"
          >
            + Nuevo
          </button>

          <button
            type="button"
            onClick={onDeleteSelected}
            disabled={selectedCount === 0}
            className={[
              "rounded-md border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50",
              "text-slate-800",
              selectedCount === 0 ? "opacity-40 cursor-not-allowed" : "",
            ].join(" ")}
            title={selectedCount === 0 ? "Selecciona filas para eliminar" : `Eliminar (${selectedCount})`}
          >
            🗑️
          </button>
        </div>

        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1 flex items-center border border-slate-200 bg-white rounded-md overflow-hidden">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código, cliente..."
              className="w-full px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none"
            />
            <button
              type="button"
              className="px-3 py-2 border-l border-slate-200 hover:bg-slate-50 text-slate-800 shrink-0"
              title="Buscar"
              onClick={onApply}
            >
              🔎
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="flex-1 sm:flex-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 hover:bg-slate-50"
            >
              <span className="hidden sm:inline">🧰 Filtros</span>
              <span className="sm:hidden">🧰</span>
            </button>

            <button
              type="button"
              onClick={() => setShowFilters(true)}
              className="flex-1 sm:flex-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 hover:bg-slate-50"
              title="Filtrar por fecha"
            >
              <span className="hidden sm:inline">📅 Fecha</span>
              <span className="sm:hidden">📅</span>
            </button>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-800">Estado</label>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                value={filters.estado}
                onChange={(e) => setFilters({ ...filters, estado: e.target.value as ServiceFilters["estado"] })}
              >
                <option value="">Todos</option>
                <option value="Pendiente">Pendiente</option>
                <option value="En fabricación">En fabricación</option>
                <option value="Garantía">Garantía</option>
                <option value="Entregado">Entregado</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-800">Máquina</label>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Ej: LASER / camilo"
                value={filters.maquina}
                onChange={(e) => setFilters({ ...filters, maquina: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-800">Prioridad</label>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                value={filters.prioridad}
                onChange={(e) => setFilters({ ...filters, prioridad: e.target.value as ServiceFilters["prioridad"] })}
              >
                <option value="">Todas</option>
                <option value="24 horas">24 horas</option>
                <option value="48 horas">48 horas</option>
                <option value="72 horas">72 horas</option>
                <option value="Normal">Normal</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-800">Desde</label>
              <input
                type="date"
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                value={filters.desde}
                onChange={(e) => setFilters({ ...filters, desde: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-800">Hasta</label>
              <input
                type="date"
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                value={filters.hasta}
                onChange={(e) => setFilters({ ...filters, hasta: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowFilters(false)}
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 hover:bg-slate-50"
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={onClear}
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 hover:bg-slate-50"
            >
              Limpiar
            </button>

            <button
              type="button"
              onClick={onApply}
              className="rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-semibold"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
