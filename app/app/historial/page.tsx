"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ServicesTable, { ServiceRow, SortDir, SortKey } from "../../../components/admin/ServicesTable";

function formatDateDDMMYYYY(dateStr: string) {
  const [yyyy, mm, dd] = String(dateStr).split("-");
  if (yyyy && mm && dd) return `${dd}-${mm}-${yyyy}`;
  return String(dateStr);
}

function mapDbToRow(s: any): ServiceRow {
  const abono = Number(s.abono ?? 0);
  const finalCost = Number(s.costo_final ?? 0);
  const finalPaymentRaw = s.pago_final;
  const finalPaymentFromDb = Number(finalPaymentRaw);
  const finalPaymentFallback = finalCost - abono;
  const rawDate = String(s.fecha ?? "");
  return {
    code: s.code,
    client: s.cliente,
    phone: s.telefono,
    machine: s.maquina,
    description: s.descripcion,
    material: s.material,
    status: s.estado,
    abono: Number.isFinite(abono) ? abono : 0,
    abonoPaid: Boolean(s.abono_pagado),
    finalCost: Number.isFinite(finalCost) ? finalCost : 0,
    finalPaid: Boolean(s.costo_final_pagado),
    finalPayment: Number.isFinite(finalPaymentFromDb) ? finalPaymentFromDb : (Number.isFinite(finalPaymentFallback) ? finalPaymentFallback : 0),
    date: formatDateDDMMYYYY(rawDate),
    dateRaw: rawDate,
  };
}

const SERVICES_PER_PAGE = 50; // Más servicios por página en historial

export default function HistorialPage() {
  const router = useRouter();

  const [rows, setRows] = useState<ServiceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // ✅ ordenamiento (por defecto: fecha desc)
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // ✅ selección
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());

  const observerTarget = useRef<HTMLDivElement>(null);

  // Cargar servicios con paginación
  async function loadServices(page: number, append = false) {
    try {
      setIsLoading(true);

      const params = new URLSearchParams();
      params.set("limit", String(SERVICES_PER_PAGE));
      params.set("offset", String((page - 1) * SERVICES_PER_PAGE));
      params.set("order", "created_at.desc"); // Más recientes primero

      const res = await fetch(`/api/services?${params.toString()}`, { method: "GET" });
      const json = await res.json();

      if (!res.ok) {
        console.error(json?.error || "Error cargando servicios");
        setHasMore(false);
        return;
      }

      const mapped: ServiceRow[] = (json.services ?? []).map(mapDbToRow);
      
      if (append) {
        setRows((prev) => [...prev, ...mapped]);
      } else {
        setRows(mapped);
      }

      // Si recibimos menos servicios que el límite, no hay más páginas
      setHasMore(mapped.length === SERVICES_PER_PAGE);

      // ✅ limpia selección si ya no existen esas filas en el resultado
      setSelectedCodes((prev) => {
        if (prev.size === 0) return prev;
        const codes = new Set(mapped.map((r) => r.code));
        const next = new Set<string>();
        for (const c of prev) if (codes.has(c)) next.add(c);
        return next;
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Cargar primera página al montar
  useEffect(() => {
    loadServices(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Observer para scroll infinito
  useEffect(() => {
    if (!hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          const nextPage = currentPage + 1;
          setCurrentPage(nextPage);
          loadServices(nextPage, true);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, isLoading, currentPage]);

  // Filas paginadas (solo para mostrar en la tabla, pero cargamos más con scroll)
  const displayedRows = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;

    const toNumber = (v: unknown) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : NaN;
    };

    const toTime = (raw: unknown) => {
      const s = String(raw ?? "");
      const t = Date.parse(s);
      return Number.isFinite(t) ? t : NaN;
    };

    const cmp = (a: ServiceRow, b: ServiceRow) => {
      // missing always last
      const missingA =
        sortKey === "date"
          ? !String(a.dateRaw ?? "").trim()
          : (a as any)[sortKey] === null || (a as any)[sortKey] === undefined || String((a as any)[sortKey] ?? "").trim() === "";
      const missingB =
        sortKey === "date"
          ? !String(b.dateRaw ?? "").trim()
          : (b as any)[sortKey] === null || (b as any)[sortKey] === undefined || String((b as any)[sortKey] ?? "").trim() === "";
      if (missingA && missingB) return 0;
      if (missingA) return 1;
      if (missingB) return -1;

      if (sortKey === "abono" || sortKey === "finalCost" || sortKey === "finalPayment") {
        const av = toNumber((a as any)[sortKey]);
        const bv = toNumber((b as any)[sortKey]);
        if (Number.isNaN(av) && Number.isNaN(bv)) return 0;
        if (Number.isNaN(av)) return 1;
        if (Number.isNaN(bv)) return -1;
        return (av - bv) * dir;
      }

      if (sortKey === "date") {
        const av = toTime(a.dateRaw);
        const bv = toTime(b.dateRaw);
        if (Number.isNaN(av) && Number.isNaN(bv)) return 0;
        if (Number.isNaN(av)) return 1;
        if (Number.isNaN(bv)) return -1;
        return (av - bv) * dir;
      }

      const as = String((a as any)[sortKey] ?? "");
      const bs = String((b as any)[sortKey] ?? "");
      const c = as.localeCompare(bs, "es", { sensitivity: "base", numeric: true });
      return c * dir;
    };

    return [...rows].sort(cmp);
  }, [rows, sortKey, sortDir]);

  function handleSort(k: SortKey) {
    setSortKey((prevKey) => {
      if (prevKey !== k) {
        setSortDir("asc");
        return k;
      }
      setSortDir((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
      return prevKey;
    });
  }

  // ✅ selección fila
  function toggleRow(code: string) {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function toggleAll() {
    setSelectedCodes((prev) => {
      const all = displayedRows.map((r) => r.code);
      const allSelected = all.length > 0 && all.every((c) => prev.has(c));

      if (allSelected) return new Set(); // deselecciona todo
      return new Set(all); // selecciona todo lo visible
    });
  }

  // ✅ click fila -> detalle
  function handleRowClick(code: string) {
    router.push(`/app/services/${encodeURIComponent(code)}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Historial de Servicios</h1>
        <span className="text-sm text-slate-600">
          {rows.length} servicio{rows.length !== 1 ? "s" : ""} cargado{rows.length !== 1 ? "s" : ""}
        </span>
      </div>

      {isLoading && rows.length === 0 && (
        <div className="text-sm text-slate-700">Cargando servicios...</div>
      )}

      <ServicesTable
        rows={displayedRows}
        selectedCodes={selectedCodes}
        onToggle={toggleRow}
        onToggleAll={toggleAll}
        onRowClick={handleRowClick}
        currentPage={1}
        totalPages={1}
        totalRecords={rows.length}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
      />

      {/* Target para scroll infinito */}
      <div ref={observerTarget} className="h-10 flex items-center justify-center">
        {isLoading && rows.length > 0 && (
          <div className="text-sm text-slate-600">Cargando más servicios...</div>
        )}
        {!hasMore && rows.length > 0 && (
          <div className="text-sm text-slate-600">No hay más servicios</div>
        )}
      </div>
    </div>
  );
}
