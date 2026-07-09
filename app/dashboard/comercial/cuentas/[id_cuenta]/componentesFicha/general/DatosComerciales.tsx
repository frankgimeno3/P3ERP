'use client';

import React, { FC, ChangeEvent, useEffect, useState } from 'react';
import { ContactoService } from '@/app/service/ContactoService';
import PopUpContacto, { InterfazContacto } from "./modals/PopUpContacto";

interface DatosComercialesProps {
  datos_comerciales: {
    ciudad_principal_cuenta: string;
    telefono_principal_cuenta: string;
    categoria_principal_cuenta: string;
    contacto_principal: string;
    resumen_actividad_cuenta: string;
  };
  pais_cuenta: string;
  onChange: (field: string, value: string) => void;
}

const inputClass = "w-full rounded border border-gray-300 px-2 py-1 focus:outline-none focus:ring focus:ring-blue-400";

const DatosComerciales: FC<DatosComercialesProps> = ({ datos_comerciales, pais_cuenta, onChange }) => {
  const [contactos, setContactos] = useState<InterfazContacto[]>([]);
  const [contactoSeleccionado, setContactoSeleccionado] = useState<InterfazContacto | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);

  useEffect(() => {
    ContactoService.getContactos()
      .then((data) => {
        const nextContactos = Array.isArray(data) ? data : [];
        setContactos(nextContactos);
        setContactoSeleccionado(nextContactos.find((c) => c.id_contacto === datos_comerciales.contacto_principal) || null);
      })
      .catch((error) => {
        console.error('Error fetching contactos:', error);
        setContactos([]);
        setContactoSeleccionado(null);
      });
  }, [datos_comerciales.contacto_principal]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onChange(name, value);
  };

  const handleContactoSeleccionado = (contacto: InterfazContacto) => {
    setContactoSeleccionado(contacto);
    onChange("contacto_principal", contacto.id_contacto);
  };

  return (
    <div className="w-full space-y-6 p-4">
      <h2 className="text-xl font-bold">Datos Comerciales</h2>

      <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2 lg:grid-cols-3">
        <label className="space-y-1">
          <span className="font-medium">Ciudad</span>
          <input name="ciudad_principal_cuenta" value={datos_comerciales.ciudad_principal_cuenta} onChange={handleInputChange} className={inputClass} />
        </label>
        <label className="space-y-1">
          <span className="font-medium">País</span>
          <input name="pais_cuenta" value={pais_cuenta} onChange={handleInputChange} className={inputClass} />
        </label>
        <label className="space-y-1">
          <span className="font-medium">Teléfono de contacto</span>
          <input name="telefono_principal_cuenta" value={datos_comerciales.telefono_principal_cuenta} onChange={handleInputChange} className={inputClass} />
        </label>
        <label className="space-y-1">
          <span className="font-medium">Categoría</span>
          <input name="categoria_principal_cuenta" value={datos_comerciales.categoria_principal_cuenta} onChange={handleInputChange} className={inputClass} />
        </label>
        <div className="space-y-1">
          <span className="font-medium">Contacto principal</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded border border-gray-300 px-3 py-1 text-left hover:bg-gray-50"
              onClick={() => setPopupOpen(true)}
            >
              {contactoSeleccionado?.nombre_completo_contacto || "Seleccionar contacto..."}
            </button>
          </div>
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

      <PopUpContacto
        isOpen={popupOpen}
        onClose={() => setPopupOpen(false)}
        onSelect={handleContactoSeleccionado}
        contactos={contactos}
      />
    </div>
  );
};

export default DatosComerciales;
