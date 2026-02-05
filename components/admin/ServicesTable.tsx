"use client";

import { useEffect, useMemo, useRef } from "react";

export type ServiceRow = {
  code: string;
  client: string;
  phone: string;
  machine: string;
  description: string;
  material: string;
  status: "Pendiente" | "En fabricación" | "Garantía" | "Entregado";
  abono: number;
  abonoPaid: boolean;
  finalCost: number;
  finalPaid: boolean;
  finalPayment: number; // pago_final (costo final - abono)
  date: string;
  dateRaw: string; // fecha original (idealmente YYYY-MM-DD) para ordenar correctamente
};

export type SortDir = "asc" | "desc";
export type SortKey =
  | "code"
  | "client"
  | "phone"
  | "machine"
  | "description"
  | "material"
  | "status"
  | "abono"
  | "finalPayment"
  | "finalCost"
  | "date";

function formatCOP(value: number) {
  const v = Number(value ?? 0);
  if (!Number.isFinite(v)) return "CO$ 0";
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(v);
  } catch {
    return `CO$ ${Math.round(v)}`;
  }
}

function PaidBadge({ paid }: { paid: boolean }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        paid ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700",
      ].join(" ")}
    >
      {paid ? "Pagado" : "Pendiente"}
    </span>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="text-slate-400 ml-1">↕</span>;
  return <span className="text-slate-700 ml-1">{dir === "asc" ? "↑" : "↓"}</span>;
}

function SortableTh({
  label,
  k,
  sortKey,
  sortDir,
  onSort,
  align = "left",
  className = "",
}: {
  label: string;
  k: SortKey;
  sortKey?: SortKey;
  sortDir?: SortDir;
  onSort?: (k: SortKey) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const active = sortKey === k;
  const dir: SortDir = sortDir ?? "asc";
  const canSort = typeof onSort === "function";

  return (
    <th
      className={[
        "p-3 font-semibold",
        align === "right" ? "text-right" : "",
        className,
      ].join(" ")}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      {canSort ? (
        <button
          type="button"
          onClick={() => onSort(k)}
          className={[
            "inline-flex items-center gap-1 hover:text-slate-900 select-none",
            align === "right" ? "justify-end w-full" : "",
          ].join(" ")}
          title={`Ordenar por ${label} (${active ? (dir === "asc" ? "ascendente" : "descendente") : "ascendente"})`}
        >
          <span>{label}</span>
          <SortIcon active={active} dir={dir} />
        </button>
      ) : (
        <span>{label}</span>
      )}
    </th>
  );
}

export default function ServicesTable({
  rows,
  selectedCodes,
  onToggle,
  onToggleAll,
  onRowClick,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  totalRecords = 0,
  sortKey,
  sortDir,
  onSort,
}: {
  rows: ServiceRow[];
  selectedCodes: Set<string>;
  onToggle: (code: string) => void;
  onToggleAll: () => void;
  onRowClick: (code: string) => void;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  totalRecords?: number;
  sortKey?: SortKey;
  sortDir?: SortDir;
  onSort?: (k: SortKey) => void;
}) {
  const allChecked = useMemo(() => rows.length > 0 && rows.every((r) => selectedCodes.has(r.code)), [rows, selectedCodes]);
  const someChecked = useMemo(() => rows.some((r) => selectedCodes.has(r.code)) && !allChecked, [rows, selectedCodes, allChecked]);

  const headerRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!headerRef.current) return;
    headerRef.current.indeterminate = someChecked;
  }, [someChecked]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      {/* Vista móvil: tarjetas */}
      <div className="md:hidden divide-y divide-slate-200">
        {rows.length === 0 && (
          <div className="p-4 text-sm text-slate-500">No hay servicios para mostrar.</div>
        )}
        {rows.map((r) => {
          const checked = selectedCodes.has(r.code);
          return (
            <button
              key={r.code}
              type="button"
              onClick={() => onRowClick(r.code)}
              className={[
                "w-full text-left px-3 py-3 flex gap-3 items-start bg-white",
                checked ? "bg-emerald-50" : "hover:bg-slate-50",
              ].join(" ")}
            >
              <div className="pt-1">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(r.code)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Seleccionar ${r.code}`}
                />
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-500">Código</span>
                    <span className="text-sm font-semibold text-slate-900 break-all">
                      {r.code}
                    </span>
                  </div>
                  <span
                    className={[
                      "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold shrink-0",
                      r.status === "Pendiente"
                        ? "bg-amber-100 text-amber-800"
                        : r.status === "En fabricación"
                        ? "bg-blue-100 text-blue-800"
                        : r.status === "Garantía"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-emerald-100 text-emerald-800",
                    ].join(" ")}
                  >
                    {r.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-1 text-xs text-slate-700 sm:grid-cols-2">
                  <div>
                    <span className="font-semibold">Cliente: </span>
                    <span className="break-all">{r.client}</span>
                  </div>
                  <div>
                    <span className="font-semibold">Teléfono: </span>
                    <span>{r.phone}</span>
                  </div>
                  <div>
                    <span className="font-semibold">Máquina: </span>
                    <span>{r.machine}</span>
                  </div>
                  <div>
                    <span className="font-semibold">Fecha: </span>
                    <span>{r.date}</span>
                  </div>
                  <div>
                    <span className="font-semibold">Abono: </span>
                    <span className="mr-2">{formatCOP(r.abono)}</span>
                    <PaidBadge paid={r.abonoPaid} />
                  </div>
                  <div>
                    <span className="font-semibold">Pago final: </span>
                    <span className="mr-2">{formatCOP(r.finalPayment)}</span>
                  </div>
                  <div>
                    <span className="font-semibold">Costo final: </span>
                    <span className="mr-2">{formatCOP(r.finalCost)}</span>
                    <PaidBadge paid={r.finalPaid} />
                  </div>
                  <div className="sm:col-span-2">
                    <span className="font-semibold">Descripción: </span>
                    <span className="truncate-2-lines break-words block" title={r.description}>
                      {r.description}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Vista escritorio: tabla */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full md:min-w-[1180px] w-full text-sm">
          <thead className="bg-slate-50 text-slate-800 border-b border-slate-200">
            <tr className="text-left">
              <th className="p-3 w-10">
                <input
                  ref={headerRef}
                  type="checkbox"
                  checked={allChecked}
                  onChange={onToggleAll}
                  aria-label="Seleccionar todo"
                />
              </th>
              <SortableTh label="CÓDIGO" k="code" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortableTh label="CLIENTE" k="client" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortableTh label="TELÉFONO" k="phone" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortableTh label="MÁQUINA" k="machine" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortableTh label="DESCRIPCIÓN" k="description" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="w-[360px]" />
              <SortableTh label="MATERIAL" k="material" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortableTh label="ESTADO" k="status" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortableTh label="ABONO" k="abono" sortKey={sortKey} sortDir={sortDir} onSort={onSort} align="right" />
              <SortableTh label="PAGO FINAL" k="finalPayment" sortKey={sortKey} sortDir={sortDir} onSort={onSort} align="right" />
              <SortableTh label="COSTO FINAL" k="finalCost" sortKey={sortKey} sortDir={sortDir} onSort={onSort} align="right" />
              <SortableTh label="FECHA" k="date" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            </tr>
          </thead>

          <tbody className="text-slate-900">
            {rows.map((r) => {
              const checked = selectedCodes.has(r.code);
              return (
                <tr
                  key={r.code}
                  className={[
                    "border-t border-slate-100 hover:bg-slate-50 cursor-pointer",
                    checked ? "bg-emerald-50" : "",
                  ].join(" ")}
                  onClick={() => onRowClick(r.code)}
                >
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(r.code)}
                      aria-label={`Seleccionar ${r.code}`}
                    />
                  </td>

                  <td className="p-3 font-semibold text-slate-900">{r.code}</td>
                  <td className="p-3 font-medium text-slate-900">{r.client}</td>
                  <td className="p-3 text-slate-800">{r.phone}</td>
                  <td className="p-3 text-slate-800">{r.machine}</td>
                  <td className="p-3 text-slate-800 w-[360px]">
                    <div className="truncate-2-lines break-words" title={r.description}>
                      {r.description}
                    </div>
                  </td>
                  <td className="p-3 text-slate-800">{r.material}</td>

                  <td className="p-3">
                    <span
                      className={[
                        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                        r.status === "Pendiente"
                          ? "bg-amber-100 text-amber-800"
                          : r.status === "En fabricación"
                          ? "bg-blue-100 text-blue-800"
                          : r.status === "Garantía"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-emerald-100 text-emerald-800",
                      ].join(" ")}
                    >
                      {r.status}
                    </span>
                  </td>

                  <td className="p-3 text-right text-slate-800">
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-semibold">{formatCOP(r.abono)}</span>
                      <PaidBadge paid={r.abonoPaid} />
                    </div>
                  </td>
                  <td className="p-3 text-right text-slate-800">
                    <span className="font-semibold">{formatCOP(r.finalPayment)}</span>
                  </td>
                  <td className="p-3 text-right text-slate-800">
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-semibold">{formatCOP(r.finalCost)}</span>
                      <PaidBadge paid={r.finalPaid} />
                    </div>
                  </td>
                  <td className="p-3 text-slate-800">{r.date}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 text-sm text-slate-700">
        <span className="text-xs sm:text-sm">
          Mostrando {rows.length} de {totalRecords} registros
          {selectedCodes.size > 0 ? ` · Seleccionados: ${selectedCodes.size}` : ""}
        </span>

        {totalPages > 1 && onPageChange && (
          <div className="flex gap-1 flex-wrap">
            {/* Botón Anterior */}
            {currentPage > 1 && (
              <button
                onClick={() => onPageChange(currentPage - 1)}
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs sm:text-sm flex items-center justify-center"
                type="button"
                aria-label="Página anterior"
              >
                ‹
              </button>
            )}

            {/* Números de página */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              // Mostrar solo páginas cercanas a la actual
              if (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1)
              ) {
                return (
                  <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={[
                      "h-8 w-8 sm:h-9 sm:w-9 rounded-md border text-xs sm:text-sm",
                      currentPage === page
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-800",
                    ].join(" ")}
                    type="button"
                  >
                    {page}
                  </button>
                );
              } else if (
                page === currentPage - 2 ||
                page === currentPage + 2
              ) {
                return (
                  <span key={page} className="h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center text-slate-400">
                    ...
                  </span>
                );
              }
              return null;
            })}

            {/* Botón Siguiente */}
            {currentPage < totalPages && (
              <button
                onClick={() => onPageChange(currentPage + 1)}
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs sm:text-sm flex items-center justify-center"
                type="button"
                aria-label="Página siguiente"
              >
                ›
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
