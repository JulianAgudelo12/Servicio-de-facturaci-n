type TabKey = "servicios" | "pendientes" | "fabricacion" | "garantia" | "entregado";

export default function Tabs({
  active,
  onChange,
  counts,
}: {
  active: TabKey;
  onChange: (k: TabKey) => void;
  counts: Record<TabKey, number>;
}) {
  // Pestañas: todos los servicios + cada estado
  const tabs: { key: TabKey; label: string }[] = [
    { key: "servicios", label: "Servicios" },
    { key: "pendientes", label: "Pendientes" },
    { key: "fabricacion", label: "En fabricación" },
    { key: "garantia", label: "Garantía" },
    { key: "entregado", label: "Entregado" },
  ];

  return (
    <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={[
            "px-3 py-2 text-sm rounded-t-md -mb-px border transition-colors",
            active === t.key
              ? "bg-white border-slate-200 border-b-white text-slate-900 font-semibold"
              : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200",
          ].join(" ")}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
