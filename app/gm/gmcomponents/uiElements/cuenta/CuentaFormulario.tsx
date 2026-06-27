import CuentaDatosGestion from "./CuentaDatosGestion";
import CuentaDatosPrincipales from "./CuentaDatosPrincipales";
import type { Account } from "./types";

type CuentaFormularioProps = {
  account: Account;
  onFieldChange: (key: keyof Account, value: string) => void;
};

export default function CuentaFormulario({ account, onFieldChange }: CuentaFormularioProps) {
  return (
    <section className="w-full bg-[#f3f5f7] pb-6 text-left px-8">
      <div className="flex w-full flex-col items-start">
        <CuentaDatosPrincipales account={account} onFieldChange={onFieldChange} />
        <CuentaDatosGestion account={account} onFieldChange={onFieldChange} />
      </div>
    </section>
  );
}
