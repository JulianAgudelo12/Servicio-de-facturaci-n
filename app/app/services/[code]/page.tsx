"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Service = {
  id?: string;
  code: string;
  cliente: string;
  telefono: string;
  maquina: string;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:mm:ss o HH:mm
  estado: "Pendiente" | "En fabricación" | "Garantía" | "Entregado";
  descripcion: string;
  material: string;
  agente: string;
  almacen: string;
  prioridad: "24 horas" | "48 horas" | "72 horas" | "Normal";
  abono?: number | null;
  costo_final?: number | null;
  abono_pagado?: boolean | null;
  costo_final_pagado?: boolean | null;
  cotizacion_url: string | null;
};

function formatDateDDMMYYYY(dateStr: string) {
  const [yyyy, mm, dd] = String(dateStr).split("-");
  if (yyyy && mm && dd) return `${dd}-${mm}-${yyyy}`;
  return String(dateStr);
}

function formatTimeHHMM(timeStr: string) {
  if (!timeStr) return "";
  return String(timeStr).slice(0, 5);
}

const inputBase =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-base sm:text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500";

export default function ServiceDetailPage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();

  const code = useMemo(() => decodeURIComponent(params.code), [params.code]);

  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [isEditing, setIsEditing] = useState(false);

  const [form, setForm] = useState({
    cliente: "",
    telefono: "",
    maquina: "",
    fecha: "",
    hora: "",
    estado: "Pendiente" as Service["estado"],
    descripcion: "",
    material: "",
    agente: "",
    almacen: "",
    prioridad: "Normal" as Service["prioridad"],
    abono: "",
    costoFinal: "",
    abonoPagado: false,
    costoFinalPagado: false,
    cotizacionFile: null as File | null,
  });

  const [error, setError] = useState<string>("");

  function setField<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function load() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/services/${encodeURIComponent(code)}`, {
        method: "GET",
      });

      const json = await res.json();

      if (!res.ok) {
        setService(null);
        setError(json?.error || "Servicio no encontrado");
        return;
      }

      const s: Service = json.service;
      setService(s);

      setForm({
        cliente: s.cliente ?? "",
        telefono: s.telefono ?? "",
        maquina: s.maquina ?? "",
        fecha: s.fecha ?? "",
        hora: formatTimeHHMM(s.hora ?? ""),
        estado: (s.estado as Service["estado"]) ?? "Pendiente",
        descripcion: s.descripcion ?? "",
        material: s.material ?? "",
        agente: s.agente ?? "",
        almacen: s.almacen ?? "",
        prioridad: (s.prioridad as Service["prioridad"]) ?? "Normal",
        abono: String(s.abono ?? ""),
        costoFinal: String(s.costo_final ?? ""),
        abonoPagado: Boolean(s.abono_pagado),
        costoFinalPagado: Boolean(s.costo_final_pagado),
        cotizacionFile: null,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  async function handleSave() {
    if (!service) return;

    try {
      setSaving(true);
      setError("");

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

      const res = await fetch(`/api/services/${encodeURIComponent(code)}`, {
        method: "PUT",
        body: fd,
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json?.error || "Error actualizando servicio");
        return;
      }

      setIsEditing(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  function handleCancelEdit() {
    if (!service) return;

    setIsEditing(false);

    setForm({
      cliente: service.cliente ?? "",
      telefono: service.telefono ?? "",
      maquina: service.maquina ?? "",
      fecha: service.fecha ?? "",
      hora: formatTimeHHMM(service.hora ?? ""),
      estado: service.estado ?? "Pendiente",
      descripcion: service.descripcion ?? "",
      material: service.material ?? "",
      agente: service.agente ?? "",
      almacen: service.almacen ?? "",
      prioridad: service.prioridad ?? "Normal",
      abono: String(service.abono ?? ""),
      costoFinal: String(service.costo_final ?? ""),
      abonoPagado: Boolean(service.abono_pagado),
      costoFinalPagado: Boolean(service.costo_final_pagado),
      cotizacionFile: null,
    });
  }

  if (loading) {
    return <div className="text-sm text-slate-700">Cargando servicio...</div>;
  }

  if (!service) {
    return (
      <div className="space-y-3">
        <button
          onClick={() => router.push("/app")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
        >
          <span className="text-lg leading-none">←</span>
          Volver a servicios
        </button>

        <div className="text-red-600 font-semibold">
          {error || "Servicio no encontrado"}
        </div>
      </div>
    );
  }

  function handlePrintInvoice() {
    window.open(`/api/services/${encodeURIComponent(code)}/invoice`, "_blank");
  }
  

  return (
    <div className="space-y-4">
      {/* Top actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Volver (más visible) */}
        <button
          onClick={() => router.push("/app")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 self-start"
        >
          <span className="text-lg leading-none">←</span>
          <span className="hidden sm:inline">Volver a servicios</span>
          <span className="sm:hidden">Volver</span>
        </button>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {!isEditing ? (
            <>
              <button
                onClick={handlePrintInvoice}
                className="rounded-md border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 px-4 py-2 text-sm font-semibold flex items-center justify-center gap-2"
              >
                🧾 <span className="hidden sm:inline">Imprimir factura</span>
                <span className="sm:hidden">Imprimir</span>
              </button>

              <button
                onClick={() => setIsEditing(true)}
                className="rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-semibold"
              >
                Editar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleCancelEdit}
                disabled={saving}
                className="rounded-md border border-red-500 text-red-600 bg-white hover:bg-red-50 px-4 py-2 text-sm font-semibold disabled:opacity-60 disabled:border-slate-300 disabled:text-slate-400"
              >
                Cancelar
              </button>

              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Header card */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-500">Servicio</div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 break-words">
              {service.code}
            </div>

            {!isEditing ? (
              <div className="text-xs sm:text-sm text-slate-600 mt-1 break-words">
                <span className="block sm:inline">{service.cliente}</span>
                <span className="hidden sm:inline"> · </span>
                <span className="block sm:inline">{service.telefono}</span>
                <span className="hidden sm:inline"> · </span>
                <span className="block sm:inline">{service.maquina}</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600">
                    Cliente
                  </label>
                  <input
                    className={inputBase}
                    value={form.cliente}
                    onChange={(e) => setField("cliente", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">
                    Teléfono
                  </label>
                  <input
                    className={inputBase}
                    value={form.telefono}
                    onChange={(e) => setField("telefono", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">
                    Máquina
                  </label>
                  <input
                    className={inputBase}
                    value={form.maquina}
                    onChange={(e) => setField("maquina", e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <span
            className={[
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold self-start sm:self-auto",
              service.estado === "Pendiente"
                ? "bg-amber-100 text-amber-800"
                : service.estado === "En fabricación"
                ? "bg-blue-100 text-blue-800"
                : service.estado === "Garantía"
                ? "bg-purple-100 text-purple-800"
                : "bg-emerald-100 text-emerald-800",
            ].join(" ")}
          >
            {service.estado}
          </span>
        </div>

        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

        {/* Fields */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Fecha */}
          <div className="rounded-md border border-slate-200 p-4">
            <div className="text-xs font-semibold text-slate-600">Fecha</div>
            {!isEditing ? (
              <div className="text-sm font-semibold text-slate-900">
                {formatDateDDMMYYYY(service.fecha)}
              </div>
            ) : (
              <input
                type="date"
                className={inputBase}
                value={form.fecha}
                onChange={(e) => setField("fecha", e.target.value)}
              />
            )}
          </div>

          {/* Hora */}
          <div className="rounded-md border border-slate-200 p-4">
            <div className="text-xs font-semibold text-slate-600">Hora</div>
            {!isEditing ? (
              <div className="text-sm font-semibold text-slate-900">
                {formatTimeHHMM(service.hora)}
              </div>
            ) : (
              <input
                type="time"
                className={inputBase}
                value={form.hora}
                onChange={(e) => setField("hora", e.target.value)}
              />
            )}
          </div>

          {/* Prioridad */}
          <div className="rounded-md border border-slate-200 p-4">
            <div className="text-xs font-semibold text-slate-600">
              Prioridad
            </div>
            {!isEditing ? (
              <div className="text-sm font-semibold text-slate-900">
                {service.prioridad}
              </div>
            ) : (
              <select
                className={inputBase}
                value={form.prioridad}
                onChange={(e) =>
                  setField("prioridad", e.target.value as any)
                }
              >
                <option value="24 horas">24 horas</option>
                <option value="48 horas">48 horas</option>
                <option value="72 horas">72 horas</option>
                <option value="Normal">Normal</option>
              </select>
            )}
          </div>

          {/* Estado */}
          <div className="rounded-md border border-slate-200 p-4 md:col-span-3">
            <div className="text-xs font-semibold text-slate-600">Estado</div>
            {!isEditing ? (
              <div className="text-sm font-semibold text-slate-900">
                {service.estado}
              </div>
            ) : (
              <select
                className={inputBase}
                value={form.estado}
                onChange={(e) => setField("estado", e.target.value as any)}
              >
                <option value="Pendiente">Pendiente</option>
                <option value="En fabricación">En fabricación</option>
                <option value="Garantía">Garantía</option>
                <option value="Entregado">Entregado</option>
              </select>
            )}
          </div>

          {/* Pagos */}
          <div className="rounded-md border border-slate-200 p-4 md:col-span-3">
            <div className="text-xs font-semibold text-slate-600">Pagos</div>
            {!isEditing ? (
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center justify-between rounded-md border border-slate-200 p-3">
                  <div>
                    <div className="text-xs text-slate-500">Abono</div>
                    <div className="text-sm font-semibold text-slate-900">
                      CO$ {Number(service.abono ?? 0) || 0}
                    </div>
                  </div>
                  <span
                    className={[
                      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                      service.abono_pagado ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700",
                    ].join(" ")}
                  >
                    {service.abono_pagado ? "Pagado" : "Pendiente"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-slate-200 p-3">
                  <div>
                    <div className="text-xs text-slate-500">Costo final</div>
                    <div className="text-sm font-semibold text-slate-900">
                      CO$ {Number(service.costo_final ?? 0) || 0}
                    </div>
                  </div>
                  <span
                    className={[
                      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                      service.costo_final_pagado ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700",
                    ].join(" ")}
                  >
                    {service.costo_final_pagado ? "Pagado" : "Pendiente"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Abono (COP)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className={inputBase}
                    value={form.abono}
                    onChange={(e) => setField("abono", e.target.value)}
                    placeholder="0"
                  />
                  <label className="mt-2 inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.abonoPagado}
                      onChange={(e) => setField("abonoPagado", e.target.checked)}
                    />
                    Abono pagado
                  </label>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Costo final (COP)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className={inputBase}
                    value={form.costoFinal}
                    onChange={(e) => setField("costoFinal", e.target.value)}
                    placeholder="0"
                    required
                  />
                  <label className="mt-2 inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.costoFinalPagado}
                      onChange={(e) => setField("costoFinalPagado", e.target.checked)}
                    />
                    Costo final pagado
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Descripción */}
          <div className="rounded-md border border-slate-200 p-4 md:col-span-2">
            <div className="text-xs font-semibold text-slate-600">
              Descripción
            </div>
            {!isEditing ? (
              <div className="text-sm font-semibold text-slate-900">
                {service.descripcion}
              </div>
            ) : (
              <textarea
                className={inputBase}
                rows={4}
                value={form.descripcion}
                onChange={(e) => setField("descripcion", e.target.value)}
              />
            )}
          </div>

          {/* Material */}
          <div className="rounded-md border border-slate-200 p-4 md:col-span-1">
            <div className="text-xs font-semibold text-slate-600">Material</div>
            {!isEditing ? (
              <div className="text-sm font-semibold text-slate-900">
                {service.material}
              </div>
            ) : (
              <select
                className={inputBase}
                value={form.material}
                onChange={(e) => setField("material", e.target.value)}
                required
              >
                <option value="">Selecciona un material</option>
                <option value="Oro de 14k">Oro de 14k</option>
                <option value="Oro 18k">Oro 18k</option>
                <option value="Plata 925">Plata 925</option>
                <option value="Plata 950">Plata 950</option>
              </select>
            )}
          </div>

          {/* Agente */}
          <div className="rounded-md border border-slate-200 p-4">
            <div className="text-xs font-semibold text-slate-600">Agente</div>
            {!isEditing ? (
              <div className="text-sm font-semibold text-slate-900">
                {service.agente}
              </div>
            ) : (
              <input
                className={inputBase}
                value={form.agente}
                onChange={(e) => setField("agente", e.target.value)}
              />
            )}
          </div>

          {/* Almacén */}
          <div className="rounded-md border border-slate-200 p-4">
            <div className="text-xs font-semibold text-slate-600">
              Almacén
            </div>
            {!isEditing ? (
              <div className="text-sm font-semibold text-slate-900">
                {service.almacen}
              </div>
            ) : (
              <input
                className={inputBase}
                value={form.almacen}
                onChange={(e) => setField("almacen", e.target.value)}
              />
            )}
          </div>

          {/* Cotización */}
          <div className="rounded-md border border-slate-200 p-4 md:col-span-3">
            <div className="text-xs font-semibold text-slate-600">Cotización</div>

            {!isEditing ? (
              service.cotizacion_url ? (
                <a
                  href={service.cotizacion_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-emerald-700 hover:underline"
                >
                  Ver/Descargar cotización
                </a>
              ) : (
                <div className="text-sm text-slate-600">No hay cotización.</div>
              )
            ) : (
              <div className="space-y-2">
                {service.cotizacion_url && (
                  <a
                    href={service.cotizacion_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-emerald-700 hover:underline"
                  >
                    Ver cotización actual
                  </a>
                )}

                <input
                  type="file"
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setField("cotizacionFile", file);
                  }}
                />

                {form.cotizacionFile && (
                  <div className="text-xs text-slate-700">
                    Nuevo archivo:{" "}
                    <span className="font-semibold">
                      {form.cotizacionFile.name}
                    </span>
                  </div>
                )}

                <div className="text-xs text-slate-500">
                  Si subes un archivo nuevo, reemplazará la cotización.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
