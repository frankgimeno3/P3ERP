"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import countries from "@/app/data/paises.json";

type Props = { value: string; onChange: (country: string) => void; name?: string; id?: string; required?: boolean; disabled?: boolean; placeholder?: string; className?: string; "aria-label"?: string };
export const COUNTRY_OPTIONS = countries as string[];
export const isValidCountry = (value: string) => COUNTRY_OPTIONS.includes(value);

export default function CountrySelect({ value, onChange, name, id, required, disabled, placeholder = "Escribe y selecciona un país", className = "w-full rounded border border-gray-300 px-3 py-2", "aria-label": ariaLabel }: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => setQuery(value), [value]);
  useEffect(() => { const close = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close); }, []);
  const options = useMemo(() => { const term = query.trim().toLocaleLowerCase("es"); return COUNTRY_OPTIONS.filter((country) => !term || country.toLocaleLowerCase("es").includes(term)).slice(0, 20); }, [query]);
  const listboxId = `${id || name || "country"}-options`;
  return <div ref={root} className="relative w-full"><input id={id} name={name} value={query} required={required} disabled={disabled} autoComplete="off" role="combobox" aria-label={ariaLabel} aria-autocomplete="list" aria-controls={listboxId} aria-expanded={open} placeholder={placeholder} className={className} onFocus={() => setOpen(true)} onChange={(e) => { setQuery(e.target.value); onChange(""); setOpen(true); }} onBlur={() => { if (!isValidCountry(query)) setQuery(""); }} />
    {open && !disabled && <div id={listboxId} role="listbox" className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded border bg-white py-1 text-sm shadow-xl">{options.map((country) => <button key={country} type="button" role="option" aria-selected={country === value} className="block w-full px-3 py-2 text-left hover:bg-blue-50" onMouseDown={(e) => e.preventDefault()} onClick={() => { setQuery(country); onChange(country); setOpen(false); }}>{country}</button>)}{!options.length && <p className="px-3 py-2 text-gray-500">No hay países coincidentes</p>}</div>}
  </div>;
}
