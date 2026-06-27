"use client";

import { useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import cuentasData from "@/app/gm/gmcomponents/contents/cuentas.json";

type Account = {
  codigo: string;
  nombre: string;
  nCial: string;
  nFiscal: string;
  nComercial: string;
  email: string;
  nif: string;
  pais: string;
  web: string;
  agente: string;
};

const accounts = cuentasData as Account[];

const columns = [
  { key: "codigo", label: "Código" },
  { key: "nFiscal", label: "Nombre Fiscal" },
  { key: "nComercial", label: "Nombre Comercial" },
  { key: "pais", label: "País" },
  { key: "email", label: "Email" },
  { key: "web", label: "Web" },
  { key: "agente", label: "Nombre Agente" },
  { key: "nif", label: "Nif" },
] as const;

type TablaHomeProps = {
  searchTerm: string;
  selectedField: string;
};

export default function TablaHome({ searchTerm, selectedField }: TablaHomeProps) {
  const router = useRouter();
  const [selectedCode, setSelectedCode] = useState(accounts[0]?.codigo ?? "");

  const filteredAccounts = accounts.filter((account) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;

    switch (selectedField) {
      case "codNomComFis":
        return [account.codigo, account.nFiscal, account.nComercial].join(" ").toLowerCase().includes(term);
      case "codigo":
        return account.codigo.toLowerCase().includes(term);
      case "nComercial":
        return account.nComercial.toLowerCase().includes(term);
      case "nFiscal":
        return account.nFiscal.toLowerCase().includes(term);
      case "pais":
        return account.pais.toLowerCase().includes(term);
      case "email":
        return account.email.toLowerCase().includes(term);
      case "web":
        return account.web.toLowerCase().includes(term);
      case "agente":
        return account.agente.toLowerCase().includes(term);
      case "nif":
        return account.nif.toLowerCase().includes(term);
      default:
        return true;
    }
  });

  const currentSelectedCode = filteredAccounts.some((account) => account.codigo === selectedCode)
    ? selectedCode
    : (filteredAccounts[0]?.codigo ?? "");

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!filteredAccounts.length) return;

    const currentIndex = filteredAccounts.findIndex((account) => account.codigo === currentSelectedCode);
    const nextIndex = currentIndex >= 0 ? currentIndex : 0;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = filteredAccounts[Math.min(nextIndex + 1, filteredAccounts.length - 1)];
      setSelectedCode(next.codigo);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      const next = filteredAccounts[Math.max(nextIndex - 1, 0)];
      setSelectedCode(next.codigo);
    }

    if (event.key === "Enter") {
      event.preventDefault();
      router.push(`/cuentas/${currentSelectedCode}`);
    }
  };

  return (
    <div className="bg-[#f3f5f7] px-4 pb-6 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div tabIndex={0} onKeyDown={handleKeyDown} className="outline-none">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="border-r border-slate-300 bg-slate-400 px-3 py-2 text-left text-sm font-semibold uppercase tracking-wide text-white last:border-r-0"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map((account) => {
                const isSelected = currentSelectedCode === account.codigo;

                return (
                  <tr
                    key={account.codigo}
                    onClick={() => setSelectedCode(account.codigo)}
                    onDoubleClick={() => router.push(`/cuentas/${account.codigo}`)}
                    className={`cursor-pointer border-b border-slate-200 ${isSelected ? "bg-blue-100" : "bg-white"}`}
                  >
                    {columns.map((column) => (
                      <td
                        key={`${account.codigo}-${column.key}`}
                        className="border-r border-slate-200 px-3 py-2 text-sm text-slate-700 last:border-r-0"
                      >
                        {String(account[column.key as keyof Account])}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
