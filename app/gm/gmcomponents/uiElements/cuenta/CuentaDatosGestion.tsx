import type { Account } from "./types";

type CuentaDatosGestionProps = {
  account: Account;
  onFieldChange: (key: keyof Account, value: string) => void;
};

type GestionFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
};

function GestionField({ label, value, onChange, type = "text" }: GestionFieldProps) {
  return (
    <label className="flex min-w-0 items-center justify-start gap-2 text-left">
      <span className="w-44 shrink-0 text-left text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-left text-sm text-slate-700 outline-none"
      />
    </label>
  );
}

export default function CuentaDatosGestion({ account, onFieldChange }: CuentaDatosGestionProps) {
  return (
    <div className="w-full border border-gray-500 bg-[#f3f5f7] p-5 text-left">
      <div className="grid w-full grid-cols-1 gap-4">
        <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
          <GestionField
            label="Fecha de alta"
            type="date"
            value={account.fechaAlta}
            onChange={(value) => onFieldChange("fechaAlta", value)}
          />
          <GestionField
            label="Fecha ultima modificacion"
            type="date"
            value={account.fechaUltimaModificacion ?? ""}
            onChange={(value) => onFieldChange("fechaUltimaModificacion", value)}
          />
        </div>

        <label className="flex w-full items-start justify-start gap-2 text-left">
          <span className="w-44 shrink-0 text-left text-sm font-medium text-slate-700">Observaciones</span>
          <textarea
            value={account.observaciones}
            onChange={(event) => onFieldChange("observaciones", event.target.value)}
            className="min-h-20 min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-left text-sm text-slate-700 outline-none"
          />
        </label>

        <GestionField
          label="Agente"
          value={account.nombreAgente ?? account.agente}
          onChange={(value) => onFieldChange("nombreAgente", value)}
        />
      </div>
    </div>
  );
}
