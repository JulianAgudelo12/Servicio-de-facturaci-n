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
  net: string;
  date: string;
};

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
                  <div className="sm:col-span-2">
                    <span className="font-semibold">Descripción: </span>
                    <span className="break-words">{r.description}</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Vista escritorio: tabla */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full md:min-w-[1050px] w-full text-sm">
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
              <th className="p-3 font-semibold">CÓDIGO</th>
              <th className="p-3 font-semibold">CLIENTE</th>
              <th className="p-3 font-semibold">TELÉFONO</th>
              <th className="p-3 font-semibold">MÁQUINA</th>
              <th className="p-3 font-semibold">DESCRIPCIÓN</th>
              <th className="p-3 font-semibold">MATERIAL</th>
              <th className="p-3 font-semibold">ESTADO</th>
              <th className="p-3 text-right font-semibold">NETO</th>
              <th className="p-3 font-semibold">FECHA</th>
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
                  <td className="p-3 text-slate-800">{r.description}</td>
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

                  <td className="p-3 text-right text-slate-800">{r.net}</td>
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
