"use client";

import { useMemo, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ServiceFormData) => void;
};

export type ServiceFormData = {
  cliente: string;
  telefono: string;
  maquina: string;
  fecha: string; // YYYY-MM-DD
  hora: string;  // HH:mm
  estado: "Pendiente" | "En fabricación" | "Garantía" | "Entregado";
  descripcion: string;
  material: string;
  agente: string;
  almacen: string;
  prioridad: "24 horas" | "48 horas" | "72 horas" | "Normal";
  abono: string; // money as string (se parsea en API)
  abonoPagado: boolean;
  costoFinal: string; // money as string (se parsea en API)
  costoFinalPagado: boolean;
  cotizacionFile: File | null;
};

const inputBase =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-500";

export default function NewServiceModal({ open, onClose, onSubmit }: Props) {
  const now = useMemo(() => new Date(), []);
  const defaultFecha = useMemo(() => now.toISOString().slice(0, 10), [now]);
  const defaultHora = useMemo(() => {
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }, [now]);

  const [data, setData] = useState<ServiceFormData>({
    cliente: "",
    telefono: "",
    maquina: "",
    fecha: defaultFecha,
    hora: defaultHora,
    estado: "Pendiente",
    descripcion: "",
    material: "",
    agente: "",
    almacen: "",
    prioridad: "24 horas",
    abono: "",
    abonoPagado: false,
    costoFinal: "",
    costoFinalPagado: false,
    cotizacionFile: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const parseMoney = (v: string) => {
    const normalized = String(v ?? "").trim().replace(/\s+/g, "").replace(",", ".");
    if (!normalized) return 0;
    return Number(normalized);
  };

  const pagoFinalPreview = useMemo(() => {
    // No mostrar hasta que ingresen costo final (evita negativos mientras está vacío/0 por defecto)
    if (!String(data.costoFinal ?? "").trim()) return "";
    const abonoNum = parseMoney(data.abono);
    const finalNum = parseMoney(data.costoFinal);
    if (!Number.isFinite(abonoNum) || !Number.isFinite(finalNum)) return "";
    const diff = finalNum - abonoNum;
    return String(Number.isFinite(diff) ? diff : "");
  }, [data.abono, data.costoFinal]);

  // Importante: no retornar antes de hooks (regla de hooks de React)
  if (!open) return null;

  function setField<K extends keyof ServiceFormData>(key: K, value: ServiceFormData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy[key as string];
      return copy;
    });
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!data.cliente.trim()) e.cliente = "Cliente es obligatorio";
    if (!data.telefono.trim()) e.telefono = "Teléfono es obligatorio";
    if (!data.maquina.trim()) e.maquina = "Máquina es obligatoria";
    if (!data.fecha) e.fecha = "Fecha es obligatoria";
    if (!data.hora) e.hora = "Hora es obligatoria";
    if (!data.estado) e.estado = "Estado es obligatorio";
    if (!data.descripcion.trim()) e.descripcion = "Descripción es obligatoria";
    if (!data.material.trim()) e.material = "Material es obligatorio";
    if (!data.agente.trim()) e.agente = "Agente es obligatorio";
    if (!data.almacen.trim()) e.almacen = "Almacén es obligatorio";
    if (!data.prioridad) e.prioridad = "Prioridad es obligatoria";
    if (!String(data.costoFinal).trim()) e.costoFinal = "Costo final es obligatorio";

    const abonoNum = parseMoney(data.abono);
    const finalNum = parseMoney(data.costoFinal);
    if (!Number.isFinite(finalNum) || finalNum < 0) e.costoFinal = "Costo final inválido";
    if (String(data.abono).trim() && (!Number.isFinite(abonoNum) || abonoNum < 0)) e.abono = "Abono inválido";
    if (Number.isFinite(abonoNum) && Number.isFinite(finalNum) && abonoNum > finalNum) {
      e.abono = "El abono no puede ser mayor al costo final";
    }
    // 👉 si quieres que sea obligatoria, descomenta:
    // if (!data.cotizacionFile) e.cotizacionFile = "La cotización es obligatoria";

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(data);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <button
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      {/* Modal */}
      <div className="relative mx-auto mt-6 mb-6 w-[95%] max-w-4xl max-h-[95vh] overflow-y-auto rounded-xl">
        <div className="bg-white shadow-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Nuevo servicio</h2>
              <p className="text-sm text-slate-600">Completa los datos para crear el servicio.</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Cliente */}
              <div>
                <label className="text-sm font-medium text-slate-800">Cliente</label>
                <input
                  className={inputBase}
                  value={data.cliente}
                  onChange={(e) => setField("cliente", e.target.value)}
                />
                {errors.cliente && <p className="text-xs text-red-600 mt-1">{errors.cliente}</p>}
              </div>

              {/* Teléfono */}
              <div>
                <label className="text-sm font-medium text-slate-800">Teléfono</label>
                <input
                  className={inputBase}
                  value={data.telefono}
                  onChange={(e) => setField("telefono", e.target.value)}
                />
                {errors.telefono && <p className="text-xs text-red-600 mt-1">{errors.telefono}</p>}
              </div>

              {/* Máquina */}
              <div>
                <label className="text-sm font-medium text-slate-800">Máquina</label>
                <input
                  className={inputBase}
                  value={data.maquina}
                  onChange={(e) => setField("maquina", e.target.value)}
                />
                {errors.maquina && <p className="text-xs text-red-600 mt-1">{errors.maquina}</p>}
              </div>

              {/* Fecha */}
              <div>
                <label className="text-sm font-medium text-slate-800">Fecha</label>
                <input
                  type="date"
                  className={inputBase}
                  value={data.fecha}
                  onChange={(e) => setField("fecha", e.target.value)}
                />
              </div>

              {/* Hora */}
              <div>
                <label className="text-sm font-medium text-slate-800">Hora</label>
                <input
                  type="time"
                  className={inputBase}
                  value={data.hora}
                  onChange={(e) => setField("hora", e.target.value)}
                />
              </div>

              {/* Estado */}
              <div>
                <label className="text-sm font-medium text-slate-800">Estado</label>
                <select
                  className={inputBase}
                  value={data.estado}
                  onChange={(e) => setField("estado", e.target.value as ServiceFormData["estado"])}
                >
                  <option>Pendiente</option>
                  <option>En fabricación</option>
                  <option>Garantía</option>
                  <option>Entregado</option>
                </select>
              </div>

              {/* Descripción */}
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-800">Descripción</label>
                <textarea
                  rows={4}
                  className={inputBase}
                  value={data.descripcion}
                  onChange={(e) => setField("descripcion", e.target.value)}
                />
              </div>

              {/* Material */}
              <div>
                <label className="text-sm font-medium text-slate-800">Material</label>
                <select
                  className={inputBase}
                  value={data.material}
                  onChange={(e) => setField("material", e.target.value)}
                  required
                >
                  <option value="">Selecciona un material</option>
                  <option value="Oro de 14k">Oro de 14k</option>
                  <option value="Oro 18k">Oro 18k</option>
                  <option value="Plata 925">Plata 925</option>
                  <option value="Plata 950">Plata 950</option>
                </select>
                {errors.material && <p className="text-xs text-red-600 mt-1">{errors.material}</p>}
              </div>

              {/* Agente */}
              <div>
                <label className="text-sm font-medium text-slate-800">Agente</label>
                <input
                  className={inputBase}
                  value={data.agente}
                  onChange={(e) => setField("agente", e.target.value)}
                />
              </div>

              {/* Almacén */}
              <div>
                <label className="text-sm font-medium text-slate-800">Almacén</label>
                <input
                  className={inputBase}
                  value={data.almacen}
                  onChange={(e) => setField("almacen", e.target.value)}
                />
              </div>

              {/* Prioridad */}
              <div>
                <label className="text-sm font-medium text-slate-800">Prioridad</label>
                <select
                  className={inputBase}
                  value={data.prioridad}
                  onChange={(e) =>
                    setField("prioridad", e.target.value as ServiceFormData["prioridad"])
                  }
                >
                  <option>24 horas</option>
                  <option>48 horas</option>
                  <option>72 horas</option>
                  <option>Normal</option>
                </select>
              </div>

              {/* Abono */}
              <div>
                <label className="text-sm font-medium text-slate-800">Abono (COP)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="1"
                  className={inputBase}
                  value={data.abono}
                  onChange={(e) => setField("abono", e.target.value)}
                  placeholder="0"
                />
                {errors.abono && <p className="text-xs text-red-600 mt-1">{errors.abono}</p>}
                <label className="mt-2 inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={data.abonoPagado}
                    onChange={(e) => setField("abonoPagado", e.target.checked)}
                  />
                  Abono pagado
                </label>
              </div>

              {/* Costo final */}
              <div>
                <label className="text-sm font-medium text-slate-800">Costo final (COP)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="1"
                  className={inputBase}
                  value={data.costoFinal}
                  onChange={(e) => setField("costoFinal", e.target.value)}
                  placeholder="0"
                  required
                />
                {errors.costoFinal && (
                  <p className="text-xs text-red-600 mt-1">{errors.costoFinal}</p>
                )}
                <label className="mt-2 inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={data.costoFinalPagado}
                    onChange={(e) => setField("costoFinalPagado", e.target.checked)}
                  />
                  Costo final pagado
                </label>
              </div>

              {/* Pago final (calculado) */}
              <div>
                <label className="text-sm font-medium text-slate-800">Pago final (calculado)</label>
                <input
                  type="number"
                  className={[inputBase, "bg-slate-50 text-slate-700"].join(" ")}
                  value={pagoFinalPreview}
                  readOnly
                  tabIndex={-1}
                />
                <p className="mt-1 text-xs text-slate-600">
                  Se calcula automáticamente: costo final - abono.
                </p>
              </div>

              {/* Cotización */}
              <div className="md:col-span-3">
                <label className="text-sm font-medium text-slate-800">Cotización (archivo)</label>
                <input
                  type="file"
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  onChange={(e) =>
                    setField("cotizacionFile", e.target.files?.[0] ?? null)
                  }
                />
                <p className="mt-1 text-xs text-slate-600">
                  Acepta PDF, imágenes o Word.
                </p>

                {data.cotizacionFile && (
                  <p className="mt-1 text-sm text-slate-800 font-medium">
                    Archivo seleccionado:{" "}
                    <span className="font-semibold">{data.cotizacionFile.name}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-slate-200 bg-red-500 px-4 py-2 text-sm hover:bg-red-600 text-white font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-semibold"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
