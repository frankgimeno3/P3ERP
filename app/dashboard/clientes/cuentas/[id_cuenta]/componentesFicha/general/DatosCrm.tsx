'use client';
import React, { FC, ChangeEvent, useState } from "react";
import agentes from "@/app/contents/agentesContents.json";
import contactos from "@/app/contents/contactsContents.json";
import PopUpAgentes, { InterfazAgente } from "./modals/PopUpAgentes";

interface DatosCRMProps {
  nombre_empresa: string;
  id_agente: string;
  presente_en_qq: boolean;
  actividades: string;
  fuente_novedades: string;
  onChange: (field: string, value: string | boolean) => void;
}

const DatosCRM: FC<DatosCRMProps> = ({
  nombre_empresa,
  id_agente,
  presente_en_qq,
  actividades,
  fuente_novedades,
  onChange,
}) => {
  const [popupOpen, setPopupOpen] = useState(false);
  const [agenteSeleccionado, setAgenteSeleccionado] = useState<InterfazAgente | null>(
    agentes.find((a) => a.id_agente === id_agente) || null
  );


  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    onChange(name, value);
  };

  const handleSelectChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onChange("presente_en_qq", e.target.value === "Sí");
  };

  const handleAgenteSeleccionado = (agente: InterfazAgente) => {
    setAgenteSeleccionado(agente);
    onChange("id_agente", agente.id_agente);
  };



  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Datos generales</h2>
      <table className="min-w-full border border-gray-300 text-xs bg-white rounded shadow-sm overflow-hidden">
        <thead className="bg-blue-950/80 text-white">
          <tr>
            <th className="text-left p-2 font-light">Nombre Empresa</th>
            <th className="text-left p-2 font-light">Agente Asignado</th>
            <th className="text-left p-2 font-light">QQ?</th>
            <th className="text-left p-2 font-light">Fuentes novedades</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-gray-200 hover:bg-gray-100/30 ">
            <td className="p-2 border-b border-gray-200">
              <input
                type="text"
                name="nombre_empresa"
                value={nombre_empresa}
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
                  {agenteSeleccionado
                    ? agenteSeleccionado.nombre_completo_agente
                    : "Seleccionar agente..."}
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

            <td className="p-2 border-b border-gray-200">
              <select
                name="presente_en_qq"
                value={presente_en_qq ? "Sí" : "No"}
                onChange={handleSelectChange}
                className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring focus:ring-blue-400"
              >
                <option value="Sí">Sí</option>
                <option value="No">No</option>
              </select>
            </td>

            <td className="p-2 border-b border-gray-200">
              <input
                type="text"
                name="fuente_novedades"
                value={fuente_novedades}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring focus:ring-blue-400"
              />
            </td>

          </tr>

        </tbody>
      </table>

      <div className="py-4">

        <h2 className="text-xl font-bold mt-4">Actividades</h2>
           <textarea
            name="actividades"
            value={actividades}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring focus:ring-blue-400 min-h-24 text-sm"
          />
       </div>

      <PopUpAgentes
        isOpen={popupOpen}
        onClose={() => setPopupOpen(false)}
        onSelect={handleAgenteSeleccionado}
      />

    </div>
  );
};

export default DatosCRM;
