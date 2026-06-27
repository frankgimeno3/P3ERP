import Lupa from "@/app/gm/gmcomponents/svg/lupa";
import type { Account } from "./types";

type CuentaDatosPrincipalesProps = {
  account: Account;
  onFieldChange: (key: keyof Account, value: string) => void;
};

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

function TextField({ label, value, onChange, className = "" }: TextFieldProps) {
  return (
    <label className={`flex min-w-0 items-center justify-start gap-2 text-left ${className}`}>
      <span className="w-36 shrink-0 text-left text-sm font-medium text-slate-700">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-left text-sm text-slate-700 outline-none"
      />
    </label>
  );
}

export default function CuentaDatosPrincipales({ account, onFieldChange }: CuentaDatosPrincipalesProps) {
  return (
    <div className="flex w-full flex-col gap-4 border-x border-gray-500 bg-[#f3f5f7] p-5 text-left">
      <div className="flex w-full items-center justify-start gap-4">
        <TextField label="Codigo" value={account.codigo} onChange={(value) => onFieldChange("codigo", value)} className="flex-1" />

        <div className="flex min-w-0 flex-[2] items-center justify-start gap-2 text-left">
          <TextField
            label="Tipo de cliente"
            value={account.tipoCliente ?? ""}
            onChange={(value) => onFieldChange("tipoCliente", value)}
            className="flex-1"
          />
          <Lupa />
          <input
            type="text"
            value={account.estado}
            onChange={(event) => onFieldChange("estado", event.target.value)}
            className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-left text-sm text-slate-700 outline-none"
          />
        </div>
      </div>

      <TextField
        label="Nombre fiscal"
        value={account.nombreFiscal ?? account.nFiscal ?? ""}
        onChange={(value) => onFieldChange("nombreFiscal", value)}
        className="w-full"
      />

      <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
        <TextField
          label="Nombre comercial"
          value={account.nComercial ?? account.nombre}
          onChange={(value) => onFieldChange("nComercial", value)}
          className="w-full"
        />
        <TextField
          label="Departamento"
          value={account.departamento ?? ""}
          onChange={(value) => onFieldChange("departamento", value)}
          className="w-full"
        />
      </div>

      <TextField
        label="Domicilio"
        value={account.domicilio ?? account.direccion}
        onChange={(value) => onFieldChange("domicilio", value)}
        className="w-full"
      />

      <div className="flex w-full min-w-0 items-center justify-start gap-2">
        <TextField
          label="Poblacion"
          value={account.codigoPostal ?? ""}
          onChange={(value) => onFieldChange("codigoPostal", value)}
          className="flex-1"
        />
        <Lupa />
        <input
          type="text"
          value={account.poblacion ?? account.ciudad}
          onChange={(event) => onFieldChange("poblacion", event.target.value)}
          className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-left text-sm text-slate-700 outline-none"
        />
      </div>

      <div className="flex w-full min-w-0 items-center justify-start gap-2">
        <TextField label="Pais" value={account.prefijo ?? ""} onChange={(value) => onFieldChange("prefijo", value)} className="flex-1" />
        <Lupa />
        <input
          type="text"
          value={account.pais ?? ""}
          onChange={(event) => onFieldChange("pais", event.target.value)}
          className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-left text-sm text-slate-700 outline-none"
        />
      </div>

      <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
        <TextField
          label="Telefono 1"
          value={account.telefono1 ?? account.telefono}
          onChange={(value) => onFieldChange("telefono1", value)}
          className="w-full"
        />
        <TextField
          label="Telefono 2"
          value={account.telefono2 ?? ""}
          onChange={(value) => onFieldChange("telefono2", value)}
          className="w-full"
        />
      </div>

      <TextField label="Pagina web" value={account.web} onChange={(value) => onFieldChange("web", value)} className="w-full" />
      <div className="flex flex-row justify-between w-full  gap-4  ">
        <TextField label="Email" value={account.email} onChange={(value) => onFieldChange("email", value)} className="w-full" />
        <TextField label="Skype" value="" onChange={() => undefined} className="w-full" />
      </div>
    </div>
  );
}
