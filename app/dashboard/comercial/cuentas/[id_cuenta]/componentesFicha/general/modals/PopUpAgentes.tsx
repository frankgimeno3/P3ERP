'use client';
import SearchableSelect from "@/app/components/SearchableSelect";
import React, { useEffect, useState } from "react";

export interface InterfazAgente {
  id_agente: string;
  nombre_completo_agente: string;
}

interface PopUpAgentesProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (agente: InterfazAgente) => void;
  agentes: InterfazAgente[];
}

const PopUpAgentes: React.FC<PopUpAgentesProps> = ({ isOpen, onClose, onSelect, agentes }) => {
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<InterfazAgente[]>([]);
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
    setResultados(agentes); // al abrir, muestra todos
  }, [isOpen]);

  const handleBuscar = () => {
    setCargando(true);
    setTimeout(() => {
      const query = busqueda.toLowerCase();
      const filtrados = agentes.filter(
        (a) =>
          a.id_agente.toLowerCase().includes(query) ||
          a.nombre_completo_agente.toLowerCase().includes(query)
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
          ×
        </button>

        <h2 className="text-xl font-bold mb-4">Seleccionar agente</h2>

        <SearchableSelect label="Seleccionar" value="" onChange={id=>{const item=agentes.find(r=>r.id_agente===id);if(item){onSelect(item);onClose();}}} options={agentes.map(r=>({value:r.id_agente,label:r.nombre_completo_agente+' · '+r.id_agente}))} />
      </div>
    </div>
  );
};

export default PopUpAgentes;
