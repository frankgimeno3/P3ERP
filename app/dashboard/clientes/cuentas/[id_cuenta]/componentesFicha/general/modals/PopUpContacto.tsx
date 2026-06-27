'use client';
import React, { useEffect, useState } from "react";
import contactos from "@/app/contents/contactsContents.json";

export interface InterfazContacto {
  id_contacto: string;
  nombre_completo_contacto: string;
}

interface PopUpContactoProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (contacto: InterfazContacto) => void;
}

const PopUpContacto: React.FC<PopUpContactoProps> = ({ isOpen, onClose, onSelect }) => {
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<InterfazContacto[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    setResultados(contactos);  
  }, [isOpen]);

  const handleBuscar = () => {
    setCargando(true);
    setTimeout(() => {
      const query = busqueda.toLowerCase();
      const filtrados = contactos.filter(
        (c) =>
          c.id_contacto.toLowerCase().includes(query) ||
          c.nombre_completo_contacto.toLowerCase().includes(query)
      );
      setResultados(filtrados);
      setCargando(false);
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-[700px] relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold mb-4">Seleccionar contacto</h2>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Buscar por nombre o código..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
            className="flex-1 border p-2 rounded"
          />
          <button
            onClick={handleBuscar}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Buscar
          </button>
        </div>

        <div className="border rounded p-4 h-64 overflow-y-auto">
          {cargando && <p className="text-gray-500">Cargando...</p>}
          {!cargando && resultados.length === 0 && (
            <p className="text-gray-500">No se encontraron resultados.</p>
          )}
          {!cargando && resultados.length > 0 && (
            <table className="min-w-full border">
              <thead className="bg-gray-200">
                <tr>
                  <th className="p-2 text-left">Código</th>
                  <th className="p-2 text-left">Nombre completo</th>
                </tr>
              </thead>
              <tbody>
                {resultados.map((a) => (
                  <tr
                    key={a.id_contacto}
                    className="hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      onSelect(a);
                      onClose();
                    }}
                  >
                    <td className="p-2 border-t">{a.id_contacto}</td>
                    <td className="p-2 border-t">{a.nombre_completo_contacto}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default PopUpContacto;
