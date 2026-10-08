import SearchableSelect from "@/app/components/SearchableSelect";
import { InterfazCuenta } from "@/app/interfaces/interfaces";
import React, { useEffect } from "react";

 

interface PopupEmpresaProps {
  isOpen: boolean;
  onClose: () => void;
  empresas: InterfazCuenta[];
  onSelect: (empresa: InterfazCuenta) => void;
}

const PopupEmpresa: React.FC<PopupEmpresaProps> = ({
  isOpen,
  onClose,
  empresas,
  onSelect,
}) => {
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

        <h2 className="text-xl font-bold mb-4">Buscar empresa</h2>

        <SearchableSelect label="Empresa" value="" onChange={id=>{const item=empresas.find(r=>r.id_cuenta===id);if(item){onSelect(item);onClose();}}} options={empresas.map(r=>({value:r.id_cuenta,label:[r.nombre_empresa,r.id_cuenta,r.pais_cuenta].filter(Boolean).join(' · ')}))} />
      </div>
    </div>
  );
};

export default PopupEmpresa;
