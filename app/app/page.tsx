"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Tabs from "../../components/admin/Tabs";
import FiltersBar, { ServiceFilters } from "../../components/admin/FiltersBar";
import ServicesTable, { ServiceRow } from "../../components/admin/ServicesTable";
import NewServiceModal, { ServiceFormData } from "../../components/admin/NewServiceModal";

type TabKey = "servicios" | "pendientes" | "fabricacion" | "garantia" | "entregado";

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
    date: formatDateDDMMYYYY(s.fecha),
  };
}

const DEFAULT_FILTERS: ServiceFilters = {
  estado: "",
  maquina: "",
  prioridad: "",
  desde: "",
  hasta: "",
  abonoEstado: "",
  costoFinalEstado: "",
  abonoMin: "",
  abonoMax: "",
  costoFinalMin: "",
  costoFinalMax: "",
};

export default function AdminHome() {
  const router = useRouter();

  const [tab, setTab] = useState<TabKey>("servicios");
  const [search, setSearch] = useState("");

  const [filters, setFilters] = useState<ServiceFilters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const [rows, setRows] = useState<ServiceRow[]>([]);
  const [isNewOpen, setIsNewOpen] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ selección
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());

  // ✅ paginación
  const [currentPage, setCurrentPage] = useState(1);
  const SERVICES_PER_PAGE = 15;

  const debounceRef = useRef<number | null>(null);

  // Filas paginadas
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * SERVICES_PER_PAGE;
    const end = start + SERVICES_PER_PAGE;
    return rows.slice(start, end);
  }, [rows, currentPage]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(rows.length / SERVICES_PER_PAGE));
  }, [rows.length]);

  const counts = useMemo(() => {
    return {
      servicios: rows.length,
      pendientes: rows.filter((r) => r.status === "Pendiente").length,
      fabricacion: rows.filter((r) => r.status === "En fabricación").length,
      garantia: rows.filter((r) => r.status === "Garantía").length,
      entregado: rows.filter((r) => r.status === "Entregado").length,
    } satisfies Record<TabKey, number>;
  }, [rows]);

  function buildQueryParams(q: string, currentTab: TabKey, f: ServiceFilters) {
    const params = new URLSearchParams();

    const qq = q.trim();
    if (qq) params.set("q", qq);

    if (currentTab === "pendientes") params.set("estado", "Pendiente");
    else if (currentTab === "fabricacion") params.set("estado", "En fabricación");
    else if (currentTab === "garantia") params.set("estado", "Garantía");
    else if (currentTab === "entregado") params.set("estado", "Entregado");
    else if (f.estado) params.set("estado", f.estado);

    if (f.maquina.trim()) params.set("maquina", f.maquina.trim());
    if (f.prioridad) params.set("prioridad", f.prioridad);
    if (f.desde) params.set("desde", f.desde);
    if (f.hasta) params.set("hasta", f.hasta);

    if (f.abonoEstado === "pagado") params.set("abono_pagado", "true");
    if (f.abonoEstado === "pendiente") params.set("abono_pagado", "false");
    if (f.costoFinalEstado === "pagado") params.set("costo_final_pagado", "true");
    if (f.costoFinalEstado === "pendiente") params.set("costo_final_pagado", "false");

    const safe = (v: unknown) => {
      const s = String(v ?? "").trim();
      if (!s) return "";
      if (s === "undefined" || s === "null") return "";
      return s;
    };

    const abMin = safe((f as any).abonoMin);
    const abMax = safe((f as any).abonoMax);
    const cfMin = safe((f as any).costoFinalMin);
    const cfMax = safe((f as any).costoFinalMax);

    if (abMin) params.set("abono_min", abMin);
    if (abMax) params.set("abono_max", abMax);
    if (cfMin) params.set("costo_final_min", cfMin);
    if (cfMax) params.set("costo_final_max", cfMax);

    params.set("limit", "200");
    return params.toString();
  }

  async function loadServices(q = search, currentTab = tab, f = filters) {
    try {
      setIsLoading(true);

      const qs = buildQueryParams(q, currentTab, f);
      const res = await fetch(`/api/services?${qs}`, { method: "GET" });
      const json = await res.json();

      if (!res.ok) {
        console.error(json?.error || "Error cargando servicios");
        setRows([]);
        return;
      }

      const mapped: ServiceRow[] = (json.services ?? []).map(mapDbToRow);
      setRows(mapped);
      
      // Resetear a página 1 cuando cambian los filtros/búsqueda
      setCurrentPage(1);

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

  useEffect(() => {
    loadServices("", tab, DEFAULT_FILTERS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    debounceRef.current = window.setTimeout(() => {
      loadServices(search, tab, filters);
    }, 350);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, tab, filters]);

  async function handleCreateService(form: ServiceFormData) {
    try {
      setIsSaving(true);

      const fd = new FormData();
      fd.append("cliente", form.cliente);
      fd.append("telefono", form.telefono);
      fd.append("maquina", form.maquina);
      fd.append("fecha", form.fecha);
      fd.append("hora", form.hora);
      fd.append("estado", form.estado);
      fd.append("descripcion", form.descripcion);
      fd.append("material", form.material);
      fd.append("agente", form.agente);
      fd.append("almacen", form.almacen);
      fd.append("prioridad", form.prioridad);
      fd.append("abono", form.abono);
      fd.append("costo_final", form.costoFinal);
      fd.append("abono_pagado", String(form.abonoPagado));
      fd.append("costo_final_pagado", String(form.costoFinalPagado));

      if (form.cotizacionFile) fd.append("cotizacionFile", form.cotizacionFile);

      const res = await fetch("/api/services", { method: "POST", body: fd });
      const json = await res.json();

      if (!res.ok) {
        console.error(json?.error || "Error creando servicio");
        alert(json?.error || "Error creando servicio");
        return;
      }

      await loadServices(search, tab, filters);
    } finally {
      setIsSaving(false);
    }
  }

  function handleApplyFilters() {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    loadServices(search, tab, filters);
  }

  function handleClearFilters() {
    const cleared = { ...DEFAULT_FILTERS };
    setFilters(cleared);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    loadServices(search, tab, cleared);
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
      const all = rows.map((r) => r.code);
      const allSelected = all.length > 0 && all.every((c) => prev.has(c));

      if (allSelected) return new Set(); // deselecciona todo
      return new Set(all); // selecciona todo lo visible
    });
  }

  // ✅ eliminar seleccionados
  async function handleDeleteSelected() {
    const codes = Array.from(selectedCodes);
    if (codes.length === 0) return;

    const ok = confirm(`¿Seguro que deseas eliminar ${codes.length} servicio(s)?`);
    if (!ok) return;

    try {
      setIsSaving(true);

      const res = await fetch("/api/services", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes }),
      });

      const json = await res.json();
      if (!res.ok) {
        alert(json?.error || "Error eliminando servicios");
        return;
      }

      setSelectedCodes(new Set());
      await loadServices(search, tab, filters);
    } finally {
      setIsSaving(false);
    }
  }

  // ✅ click fila -> detalle
  function handleRowClick(code: string) {
    router.push(`/app/services/${encodeURIComponent(code)}`);
  }

  return (
    <div className="space-y-4">
      <Tabs active={tab} onChange={setTab} counts={counts} />

      <FiltersBar
        search={search}
        setSearch={setSearch}
        onNew={() => setIsNewOpen(true)}
        selectedCount={selectedCodes.size}
        onDeleteSelected={handleDeleteSelected}
        filters={filters}
        setFilters={setFilters}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
      />

      {(isLoading || isSaving) && (
        <div className="text-sm text-slate-700">
          {isLoading ? "Cargando servicios..." : "Procesando..."}
        </div>
      )}

      <ServicesTable
        rows={paginatedRows}
        selectedCodes={selectedCodes}
        onToggle={toggleRow}
        onToggleAll={toggleAll}
        onRowClick={handleRowClick}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalRecords={rows.length}
      />

      <NewServiceModal
        open={isNewOpen}
        onClose={() => setIsNewOpen(false)}
        onSubmit={handleCreateService}
      />
    </div>
  );
}
