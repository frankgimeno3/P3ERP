'use client';
import React, { FC, ChangeEvent, useEffect, useState } from 'react';
import { ContactoService } from '@/app/service/ContactoService';
import { useRouter } from 'next/navigation';
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

const DatosComerciales: FC<DatosComercialesProps> = ({ datos_comerciales, pais_cuenta, onChange }) => {
  const router = useRouter();
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

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onChange(name, value);
  };
      const handleContactoSeleccionado = (contacto: InterfazContacto) => {
    setContactoSeleccionado(contacto);
    onChange("contacto_principal", contacto.id_contacto);
  };
  return (
    <div className="p-4 space-y-6 w-full">
      <h2 className="text-xl font-bold">Datos Comerciales</h2>

      <table className="min-w-full border border-gray-300 text-xs bg-white rounded shadow-sm overflow-hidden">
        <thead className="bg-blue-950/80 text-white">
          <tr>
            <th className="text-left p-2 font-light">Ciudad</th>
            <th className="text-left p-2 font-light">País</th>
            <th className="text-left p-2 font-light">Teléfono de contacto</th>
            <th className="text-left p-2 font-light">Categoría</th>
            <th className="text-left p-2 font-light">Contacto principal</th>
            <th className="text-left p-2 font-light">Resumen actividad</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          <tr className="hover:bg-gray-100/30">
            <td className="p-2 w-1/6">
              <input
                type="text"
                name="ciudad_principal_cuenta"
                value={datos_comerciales.ciudad_principal_cuenta}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring focus:ring-blue-400"
              />
            </td>
            <td className="p-2 w-1/6">
              <input
                type="text"
                name="pais_cuenta"
                value={pais_cuenta}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring focus:ring-blue-400"
              />
            </td>
            <td className="p-2 w-1/6">
              <input
                type="text"
                name="telefono_principal_cuenta"
                value={datos_comerciales.telefono_principal_cuenta}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring focus:ring-blue-400"
              />
            </td>
            <td className="p-2 w-1/6">
              <input
                type="text"
                name="categoria_principal_cuenta"
                value={datos_comerciales.categoria_principal_cuenta}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring focus:ring-blue-400"
              />
            </td>
        <td className="p-2 border-b border-gray-200">
              <div className="flex flex-row items-center gap-2">
                <span
                  className="hover:bg-gray-200 cursor-pointer px-2 py-1 rounded"
                  onClick={() => setPopupOpen(true)}
                >
                  {contactoSeleccionado?.nombre_completo_contacto || "Seleccionar contacto..."}
                </span>
                <button
                  className="p-1 rounded hover:bg-gray-200 cursor-pointer"
                  onClick={() => setPopupOpen(true)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gray-600 cursor-pointer"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <circle cx="11" cy="11" r="8" strokeWidth="2" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="2" />
                  </svg>
                </button>
              </div>
            </td>
            <td className="p-2 w-1/6">
              <input
                type="text"
                name="resumen_actividad_cuenta"
                value={datos_comerciales.resumen_actividad_cuenta}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring focus:ring-blue-400"
              />
            </td>
          </tr>
        </tbody>
      </table>
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
