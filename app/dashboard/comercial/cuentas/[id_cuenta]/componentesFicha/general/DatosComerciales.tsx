'use client';

import React, { ChangeEvent, FC, useEffect, useState } from 'react';
import Link from 'next/link';
import { CardInfo } from "./IdentidadCuenta";
import CountrySelect from "@/app/components/CountrySelect";
import { ContactoService } from '@/app/service/ContactoService';
import { CuentaService } from '@/app/service/CuentaService';

interface DatosComercialesProps {
  datos_comerciales: {
    ciudad_principal_cuenta: string;
    telefono_principal_cuenta: string;
    categoria_principal_cuenta: string;
    contacto_principal: string;
  };
  idCuenta: string;
  pais: string;
  onCountryChange: (value: string) => void;
  tipo_cuenta: string;
  cuenta_agencia: string;
  onAccountChange: (field: string, value: string) => void;
  onOpenContactos: () => void;
  onChange: (field: string, value: string) => void;
}

import accountCountries from "@/app/dashboard/comercial/contactos/crear/fases/fasescomponents/countries.json";
const accountCountryNames = accountCountries.map(country => country.name);

const contactCard = "flex w-full cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-white p-2 text-slate-900 text-left font-medium shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50";

function ContactIcon() {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-950 text-white">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21v-2a8 8 0 0 1 16 0v2z" />
      </svg>
    </span>
  );
}

const inputClass = 'w-full rounded border border-white bg-transparent text-white [&_option]:text-slate-900 px-2 py-1 focus:outline-none focus:ring focus:ring-blue-400';

const DatosComerciales: FC<DatosComercialesProps> = ({ datos_comerciales, idCuenta, pais, onCountryChange, tipo_cuenta, cuenta_agencia, onAccountChange, onOpenContactos, onChange }) => {
  const [principal, setPrincipal] = useState<{ id_contacto: string; nombre_completo_contacto: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [categoryStatus, setCategoryStatus] = useState<"loading" | "ready" | "error">("loading");
  const category = datos_comerciales.categoria_principal_cuenta || "";

  useEffect(() => {
    const controller = new AbortController();
    CuentaService.getCuentas({ typesOnly: true }, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setTypes(data); })
      .catch(() => {});
    CuentaService.getCuentas({ categoriesOnly: true }, { signal: controller.signal }).then(data => {
      if (controller.signal.aborted) return;
      setCategories(data);
      setCategoryStatus("ready");
    }).catch(() => { if (!controller.signal.aborted) setCategoryStatus("error"); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    ContactoService.getContactos({ id_cuenta: idCuenta }, { signal: controller.signal })
      .then(rows => {
        if (!controller.signal.aborted) {
          const contacts: { id_contacto: string; nombre_completo_contacto: string; es_principal?: boolean }[] = Array.isArray(rows) ? rows : [];
          setPrincipal(contacts.find(row => row.es_principal));
          setLoading(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) { setError(true); setLoading(false); }
      });
    return () => controller.abort();
  }, [idCuenta]);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    onChange(name, value);
  };

  return (
    <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
      <div className="rounded-xl bg-gray-700 p-4 text-white shadow-md">
        <div className="mb-3 flex justify-between gap-2 font-semibold">País y ciudad<CardInfo title="País y ciudad">Ubicación principal de la empresa.</CardInfo></div>
        <div className="min-w-0 flex-1 space-y-3">
          <CountrySelect countries={accountCountryNames} flags="all" value={pais} onChange={onCountryChange} className={inputClass} />
          <label className="block space-y-1">
          <span className="font-medium">Ciudad</span>
          <input name="ciudad_principal_cuenta" value={datos_comerciales.ciudad_principal_cuenta} onChange={handleInputChange} className={inputClass} />
          </label>
        </div>
      </div>

      <div className="rounded-xl bg-gray-700 p-4 text-white shadow-md">
        <div className="mb-3 flex justify-between gap-2 font-semibold">Contacto y teléfono<CardInfo title="Contacto y teléfono">Persona de referencia y teléfono principal con prefijo internacional.</CardInfo></div>
        <div className="min-w-0 flex-1 space-y-3">
        <label className="block space-y-1">
          <span className="font-medium">Teléfono principal</span>
          <input name="telefono_principal_cuenta" value={datos_comerciales.telefono_principal_cuenta} onChange={handleInputChange} className={inputClass} />
          <span className="text-xs text-white">(agregar el prefijo +xy siempre)</span>
        </label>

        <div className="space-y-1">
          <span className="font-medium">Contacto principal</span>
          {principal ? (
            <>
              <Link href={`/dashboard/comercial/contactos/${encodeURIComponent(principal.id_contacto)}`} className={contactCard}>
                <ContactIcon />{principal.nombre_completo_contacto || principal.id_contacto}
              </Link>
              <button type="button" onClick={onOpenContactos} className="cursor-pointer text-xs text-white hover:underline">Cambiar contacto principal</button>
            </>
          ) : (
            <button type="button" onClick={onOpenContactos} className={contactCard}>
              <ContactIcon />{loading ? "Cargando contacto…" : error ? "Ver contactos" : "Sin contacto principal"}
            </button>
          )}
        </div>
        </div>
      </div>

      <div className="grid content-start gap-3 rounded-xl bg-gray-700 p-4 text-white shadow-md">
        <label className="space-y-1">
          <span className="font-medium">Categoría</span>
          <select name="categoria_principal_cuenta" value={category} onChange={handleInputChange}
            disabled={categoryStatus !== "ready"} className={`${inputClass} enabled:cursor-pointer enabled:hover:border-blue-700 disabled:bg-gray-100`}>
            <option value="">Sin categoría</option>
            {category && !categories.includes(category) && <option value={category}>{category}</option>}
            {categories.map(option => <option key={option} value={option}>{option}</option>)}
          </select>
          {categoryStatus === "error" && <span className="text-xs text-red-700">No se pudieron cargar las categorías.</span>}
        </label>
        <label className="space-y-1">
          <span className="font-medium">Tipo cuenta</span>
          <select value={tipo_cuenta} onChange={event => onAccountChange("tipo_cuenta", event.target.value)} className={`${inputClass} cursor-pointer hover:border-blue-700`}>
            <option value="">Sin definir</option>
            {tipo_cuenta && !types.includes(tipo_cuenta) && <option value={tipo_cuenta}>{tipo_cuenta}</option>}
            {types.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="font-medium">Cuenta agencia</span>
          <select value={cuenta_agencia || "No"} onChange={event => onAccountChange("cuenta_agencia", event.target.value)} className={`${inputClass} cursor-pointer hover:border-blue-700`}>
            <option>No</option><option>Sí</option>
            {cuenta_agencia && !["No", "Sí"].includes(cuenta_agencia) && <option>{cuenta_agencia}</option>}
          </select>
        </label>
      </div>

    </div>
  );
};

export default DatosComerciales;
