import Link from 'next/link';
import React, { FC, useEffect } from 'react';

interface ModalBorrarPropuestaProps {
  isOpen: boolean;
  onClose: () => void;
 }

const ModalBorrarPropuesta: FC<ModalBorrarPropuestaProps> = ({ isOpen, onClose }) => {

   useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/10 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-120 p-12 relative">
         <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-xl cursor-pointer pr-2"
        >
          x
        </button>

        <h2 className="text-lg font-semibold text-gray-700 mb-4 text-center">
          ¿Seguro que quieres eliminar la propuesta?
        </h2>

        <div className="flex justify-center gap-4 mt-6">
          <Link
            href="/dashboard/comercial/propuestas"
            className="bg-red-600 text-white px-4 py-2 rounded-lg shadow hover:bg-red-700 cursor-pointer"
            onClick={onClose}
          >
            Confirmar
          </Link>
          <button
            onClick={onClose}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg shadow hover:bg-gray-400 cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalBorrarPropuesta;
