"use client";

import TableFilters from '@/app/components/TableFilters';

type FilterProps = {
    searchTerm: string;
    onSearchTermChange: (value: string) => void;
    selectedField: string;
    onSelectedFieldChange: (value: string) => void;
};

const fieldOptions = [
    { value: "codNomComFis", label: "Código / Nombre Comercial / Fiscal" },
    { value: "codigo", label: "Código" },
    { value: "nComercial", label: "Nombre Comercial" },
    { value: "nFiscal", label: "Nombre Fiscal" },
    { value: "pais", label: "País" },
    { value: "email", label: "Email" },
    { value: "web", label: "Web" },
    { value: "agente", label: "Nombre Agente" }
];

export default function Filter({
    searchTerm,
    onSearchTermChange,
    selectedField,
    onSelectedFieldChange,
}: FilterProps) {
    return <TableFilters>
      <label className="block text-xs text-slate-600"><span className="mb-1 block">Buscar por</span>
        <select aria-label="Buscar por" value={selectedField} onChange={event => onSelectedFieldChange(event.target.value)} className="w-full cursor-pointer rounded border border-slate-200 bg-white px-3 py-2 text-sm hover:border-blue-900">
          {fieldOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label className="block text-xs text-slate-600"><span className="mb-1 block">Texto</span>
        <input aria-label="Texto de búsqueda" value={searchTerm} onChange={event => onSearchTermChange(event.target.value)} placeholder="Escribe lo que quieras encontrar" className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm" />
      </label>
    </TableFilters>;
}
