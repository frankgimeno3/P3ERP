"use client";
import React from "react";

interface BotonFlotanteProps {
  isContenidoEdited: boolean;
  onSave?: () => void | Promise<void>;
  disabled?: boolean;
}

const BotonFlotante: React.FC<BotonFlotanteProps> = ({ isContenidoEdited, onSave, disabled = false }) => {
  if (!isContenidoEdited) return null;

  const handleClick = async () => {
    if (onSave) {
      await onSave();
    } else {
      window.location.reload();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className="fixed bottom-6 right-6 bg-red-700 hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-5 rounded-2xl shadow-lg transition-all duration-300 z-50 cursor-pointer"
    >
      {disabled ? 'Guardando...' : 'Guardar mis cambios'}
    </button>
  );
};

export default BotonFlotante;
