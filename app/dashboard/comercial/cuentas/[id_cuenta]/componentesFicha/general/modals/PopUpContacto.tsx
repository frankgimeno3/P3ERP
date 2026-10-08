'use client';
import SearchableSelect from "@/app/components/SearchableSelect";
import React, { useEffect } from "react";

export interface InterfazContacto {
  id_contacto: string;
  nombre_completo_contacto: string;
}

interface PopUpContactoProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (contacto: InterfazContacto) => void;
  contactos: InterfazContacto[];
}

const PopUpContacto: React.FC<PopUpContactoProps> = ({ isOpen, onClose, onSelect, contactos }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-[700px] relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 cursor-pointer text-gray-500 transition hover:text-gray-800"
        >
          ×
        </button>

        <h2 className="text-xl font-bold mb-4">Seleccionar contacto</h2>

        <SearchableSelect label="Seleccionar" value="" onChange={id=>{const item=contactos.find(r=>r.id_contacto===id);if(item){onSelect(item);onClose();}}} options={contactos.map(r=>({value:r.id_contacto,label:r.nombre_completo_contacto+' · '+r.id_contacto}))} />
      </div>
    </div>
  );
};

export default PopUpContacto;
