"use client";

import Lupa from "@/app/gm/gmcomponents/svg/lupa";

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
    return (
        <div className="bg-[#f3f5f7]  py-6 px-8">
            <div className=" flex w-full flex-row justify-betweeen items-center">
                <div className="flex flex-row  items-center gap-2 w-full">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Buscar por
                    </label>
                    <select
                        value={selectedField}
                        onChange={(event) => onSelectedFieldChange(event.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
                    >
                        {fieldOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-row items-center gap-2 w-full ">
                    <div className="flex flex-row  items-center gap-2 w-full">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                            Texto
                        </label>
                        <input
                            value={searchTerm}
                            onChange={(event) => onSearchTermChange(event.target.value)}
                            placeholder="Escribe lo que quieras encontrar"
                            className=" w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
                        />
                    </div>
                </div>
                <Lupa/>
            </div>
        </div>

    );
}
