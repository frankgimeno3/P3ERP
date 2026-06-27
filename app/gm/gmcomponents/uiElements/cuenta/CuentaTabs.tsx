import type { TabKey } from "./types";

type CuentaTabsProps = {
  activeTab: TabKey;
  onTabChange: (tabKey: TabKey | "disabled") => void;
};

const tabs = [
  { number: 1, label: "Principal", key: "principal" as const },
  { number: 2, label: "Datos", key: "disabled" as const },
  { number: 3, label: "Facturacion", key: "disabled" as const },
  { number: 4, label: "Operaciones", key: "disabled" as const },
  { number: 5, label: "Seguimiento", key: "disabled" as const },
  { number: 6, label: "Comentarios", key: "comments" as const },
  { number: 7, label: "Documentos", key: "disabled" as const },
  { number: 8, label: "Historial", key: "disabled" as const },
  { number: 9, label: "Contactos", key: "contacts" as const }
];

export default function CuentaTabs({ activeTab, onTabChange }: CuentaTabsProps) {
  return (
    <div className="bg-[#f3f5f7] px-8 pt-5">
      <div className="flex gap-1  ">
        {tabs.map((tab) => {
          const isInteractive = tab.key === "principal" || tab.key === "comments" || tab.key === "contacts";
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.number}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`border px-3 py-2 text-sm font-medium transition ${
                isInteractive
                  ? isActive
                    ? "border-slate-700 bg-slate-700 text-white"
                    : "border-slate-300 bg-[#eef2f5] text-slate-700 hover:bg-white"
                  : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
              }`}
            >
              {tab.number}. {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
