import React, { FC, useEffect } from 'react';

interface Direccion {
  nombre_direccion: string;
  pais_direccion: string;
  region_direccion: string;
  ciudad_direccion: string;
  codigo_postal: string;
  direccion_completa: string;
  telefono_direccion: string;
  descripcion_direccion: string;
}

interface ModalBorrarDireccionProps {
  isOpen: boolean;
  onClose: () => void;
  direccion: Direccion;
  onConfirm: (direccion: Direccion) => void;
}

const ModalBorrarDireccion: FC<ModalBorrarDireccionProps> = ({
  isOpen,
  onClose,
  direccion,
  onConfirm,
}) => {
   useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-sm relative">
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-900 cursor-pointer"
          onClick={onClose}
        >
          ✕
        </button>

        <h2 className="text-xl font-bold mb-4">Eliminar Dirección</h2>
        <p className="mb-4">¿Estás seguro que quieres eliminar esta dirección?</p>

        <div className="mt-4 flex justify-end space-x-2">
          <button
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 cursor-pointer"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="px-4 py-2 bg-red-600 rounded text-white hover:bg-red-700 cursor-pointer"
            onClick={() => onConfirm(direccion)}
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalBorrarDireccion;
