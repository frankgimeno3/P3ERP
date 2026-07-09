import type { Account } from "./types";

type CuentaDatosGestionProps = {
  account: Account;
  onFieldChange: (key: keyof Account, value: string) => void;
  onOpenAgents: () => void;
};

type GestionFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  readOnly?: boolean;
};

function GestionField({ label, value, onChange, type = "text", readOnly = false }: GestionFieldProps) {
  return (
    <label className="flex min-w-0 items-center justify-start gap-2 text-left">
      <span className="w-44 shrink-0 text-left text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={(event) => onChange(event.target.value)}
        className={`min-w-0 flex-1 rounded-md border border-gray-300 px-2 py-1 text-left text-sm text-slate-700 outline-none ${
          readOnly ? "bg-slate-100 text-slate-500" : "bg-white"
        }`}
      />
    </label>
  );
}

function splitDate(value = "") {
  const text = String(value || "");
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(text)) {
    const [yyyy, mm, dd] = text.split("-");
    return { dd, mm, yyyy };
  }
  const [dd = "", mm = "", yyyy = ""] = text.split(/[/-]/);
  return { dd, mm, yyyy };
}

function joinDate(parts: any) {
  return [parts.dd || "", parts.mm || "", parts.yyyy || ""].join("/");
}

function GestionDateField({ label, value, onChange, readOnly = false }: Omit<GestionFieldProps, "type">) {
  const parts = splitDate(value);
  const update = (field: string, nextValue: string) => {
    const next = { ...parts, [field]: nextValue.replace(/\D/g, "") };
    onChange(joinDate(next));
  };

  return (
    <label className="flex min-w-0 items-center justify-start gap-2 text-left">
      <span className="w-44 shrink-0 text-left text-sm font-medium text-slate-700">{label}</span>
      <div className="flex min-w-0 flex-1 gap-2">
        <input value={parts.dd || ""} readOnly={readOnly} onChange={(event) => update("dd", event.target.value.slice(0, 2))} placeholder="dd" className={`w-16 rounded-md border border-gray-300 px-2 py-1 text-sm outline-none ${readOnly ? "bg-slate-100 text-slate-500" : "bg-white text-slate-700"}`} />
        <input value={parts.mm || ""} readOnly={readOnly} onChange={(event) => update("mm", event.target.value.slice(0, 2))} placeholder="mm" className={`w-16 rounded-md border border-gray-300 px-2 py-1 text-sm outline-none ${readOnly ? "bg-slate-100 text-slate-500" : "bg-white text-slate-700"}`} />
        <input value={parts.yyyy || ""} readOnly={readOnly} onChange={(event) => update("yyyy", event.target.value.slice(0, 4))} placeholder="yyyy" className={`w-24 rounded-md border border-gray-300 px-2 py-1 text-sm outline-none ${readOnly ? "bg-slate-100 text-slate-500" : "bg-white text-slate-700"}`} />
      </div>
    </label>
  );
}

export default function CuentaDatosGestion({ account, onFieldChange, onOpenAgents }: CuentaDatosGestionProps) {
  return (
    <div className="w-full border border-gray-500 bg-[#f3f5f7] p-5 text-left">
      <div className="grid w-full grid-cols-1 gap-4">
        <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
          <GestionDateField
            label="Fecha de alta"
            value={account.fechaAlta}
            onChange={(value) => onFieldChange("fechaAlta", value)}
            readOnly
          />
          <GestionDateField
            label="Fecha ultima modificacion"
            value={account.fechaUltimaModificacion ?? ""}
            onChange={(value) => onFieldChange("fechaUltimaModificacion", value)}
          />
        </div>

        <GestionField
          label="Nif/Cif/Vat code"
          value={account.nifCif ?? account.nif}
          onChange={(value) => onFieldChange("nifCif", value)}
        />

        <label className="flex w-full items-start justify-start gap-2 text-left">
          <span className="w-44 shrink-0 text-left text-sm font-medium text-slate-700">Observaciones</span>
          <textarea
            value={account.observaciones}
            onChange={(event) => onFieldChange("observaciones", event.target.value)}
            className="min-h-20 min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-left text-sm text-slate-700 outline-none"
          />
        </label>

        <div className="flex min-w-0 items-center justify-start gap-3 text-left">
          <GestionField
            label="Agente"
            value={account.nombreAgente ?? account.agente}
            onChange={() => undefined}
            readOnly
          />
          <button
            type="button"
            onClick={onOpenAgents}
            className="shrink-0 rounded-md border border-slate-500 bg-[#eef2f5] px-4 py-1 text-sm font-medium text-slate-700 transition hover:bg-white"
          >
            Cambiar agente
          </button>
        </div>
      </div>
    </div>
  );
}
