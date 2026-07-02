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

export default function CuentaDatosGestion({ account, onFieldChange, onOpenAgents }: CuentaDatosGestionProps) {
  return (
    <div className="w-full border border-gray-500 bg-[#f3f5f7] p-5 text-left">
      <div className="grid w-full grid-cols-1 gap-4">
        <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
          <GestionField
            label="Fecha de alta"
            type="date"
            value={account.fechaAlta}
            onChange={(value) => onFieldChange("fechaAlta", value)}
            readOnly
          />
          <GestionField
            label="Fecha ultima modificacion"
            type="date"
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
