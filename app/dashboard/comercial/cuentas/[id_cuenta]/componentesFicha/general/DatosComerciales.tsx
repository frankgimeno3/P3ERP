'use client';
import CountryFlag from "@/app/components/CountryFlag";

import React, { ChangeEvent, FC, useEffect, useState } from 'react';
import Link from 'next/link';
import { ContactoService } from '@/app/service/ContactoService';

interface DatosComercialesProps {
  datos_comerciales: {
    ciudad_principal_cuenta: string;
    telefono_principal_cuenta: string;
    categoria_principal_cuenta: string;
    contacto_principal: string;
    resumen_actividad_cuenta: string;
  };
  pais_cuenta: string;
  idCuenta: string;
  onOpenContactos: () => void;
  onChange: (field: string, value: string) => void;
}

const contactCard = "flex w-full cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-white p-2 text-left font-medium shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50";

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

const inputClass = 'w-full rounded border border-gray-300 px-2 py-1 focus:outline-none focus:ring focus:ring-blue-400';

const DatosComerciales: FC<DatosComercialesProps> = ({ datos_comerciales, pais_cuenta, idCuenta, onOpenContactos, onChange }) => {
  const [principal, setPrincipal] = useState<{ id_contacto: string; nombre_completo_contacto: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    onChange(name, value);
  };

  const scrollToPais = () => {
    document.getElementById('pais-cuenta-detalles')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="w-full space-y-4">
      <h2 className="text-xl font-bold">Datos Comerciales</h2>

      <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1">
          <span className="font-medium">País</span>
          <div className="flex items-center gap-2 rounded border border-gray-300 bg-gray-100 px-2 py-1 text-gray-700">
            <CountryFlag country={pais_cuenta} />
            {pais_cuenta || '-'}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-gray-600">Heredado desde Detalles de la cuenta</span>
            <button type="button" onClick={scrollToPais} className="cursor-pointer rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50">
              Editar arriba
            </button>
          </div>
        </div>

        <label className="space-y-1">
          <span className="font-medium">Ciudad</span>
          <input name="ciudad_principal_cuenta" value={datos_comerciales.ciudad_principal_cuenta} onChange={handleInputChange} className={inputClass} />
        </label>

        <label className="space-y-1">
          <span className="font-medium">Teléfono de contacto</span>
          <input name="telefono_principal_cuenta" value={datos_comerciales.telefono_principal_cuenta} onChange={handleInputChange} className={inputClass} />
          <span className="text-xs text-gray-600">(agregar el prefijo +xy siempre)</span>
        </label>

        <label className="space-y-1">
          <span className="font-medium">Categoría</span>
          <input name="categoria_principal_cuenta" value={datos_comerciales.categoria_principal_cuenta} onChange={handleInputChange} className={inputClass} />
        </label>

        <div className="space-y-1">
          <span className="font-medium">Contacto principal</span>
          {principal ? (
            <>
              <Link href={`/dashboard/comercial/contactos/${encodeURIComponent(principal.id_contacto)}`} className={contactCard}>
                <ContactIcon />{principal.nombre_completo_contacto || principal.id_contacto}
              </Link>
              <button type="button" onClick={onOpenContactos} className="cursor-pointer text-xs text-blue-950 hover:underline">Cambiar contacto principal</button>
            </>
          ) : (
            <button type="button" onClick={onOpenContactos} className={contactCard}>
              <ContactIcon />{loading ? "Cargando contacto?" : error ? "Ver contactos" : "Sin contacto principal"}
            </button>
          )}
        </div>

        <label className="space-y-1 md:col-span-2 lg:col-span-3">
          <span className="font-medium">Resumen actividad</span>
          <textarea
            name="resumen_actividad_cuenta"
            value={datos_comerciales.resumen_actividad_cuenta}
            onChange={handleInputChange}
            className={`${inputClass} min-h-28 resize-y`}
          />
        </label>
      </div>

    </div>
  );
};

export default DatosComerciales;
