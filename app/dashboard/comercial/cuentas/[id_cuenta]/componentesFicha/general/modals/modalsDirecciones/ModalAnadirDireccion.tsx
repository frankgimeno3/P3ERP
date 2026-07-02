import React, { FC, useState, useEffect } from 'react';

interface Direccion {
  nombre_direccion: string;
  pais_direccion: string;
  region_direccion: string; // opcional pero string
  ciudad_direccion: string;
  codigo_postal: string;    // opcional pero string
  direccion_completa: string;
  telefono_direccion: string;
  descripcion_direccion: string;
}

interface ModalAnadirDireccionProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (direccion: Direccion) => void;
}

const ModalAnadirDireccion: FC<ModalAnadirDireccionProps> = ({ isOpen, onClose, onConfirm }) => {
  const [form, setForm] = useState<Direccion>({
    nombre_direccion: '',
    pais_direccion: '',
    region_direccion: '',
    ciudad_direccion: '',
    codigo_postal: '',
    direccion_completa: '',
    telefono_direccion: '',
    descripcion_direccion: '',
  });

  const [isValid, setIsValid] = useState(false);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    const allFilled =
      form.nombre_direccion.trim() !== '' &&
      form.pais_direccion.trim() !== '' &&
      form.ciudad_direccion.trim() !== '' &&
      form.direccion_completa.trim() !== '' &&
      form.telefono_direccion.trim() !== '' &&
      form.descripcion_direccion.trim() !== '';
    setIsValid(allFilled);
    if (allFilled) setShowError(false);
  }, [form]);
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
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleConfirm = () => {
    if (isValid) {
      onConfirm(form);
      setForm({
        nombre_direccion: '',
        pais_direccion: '',
        region_direccion: '',
        ciudad_direccion: '',
        codigo_postal: '',
        direccion_completa: '',
        telefono_direccion: '',
        descripcion_direccion: '',
      });
      setShowError(false);
    } else {
      setShowError(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex justify-center items-center z-50"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="bg-white p-6 rounded-lg w-full max-w-lg relative">
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-900 cursor-pointer"
          onClick={onClose}
        >
          ✕
        </button>
        <h2 className="text-xl font-bold mb-4">Añadir Dirección</h2>
        <div className="space-y-2 max-h-[70vh] overflow-y-auto">
          {Object.keys(form).map((key) => (
            <div key={key} className="flex flex-col">
              <label className="text-sm capitalize">{key.replace('_', ' ')}</label>
              {key === 'descripcion_direccion' ? (
                <textarea
                  name={key}
                  value={(form as any)[key]}
                  onChange={handleChange}
                  className="border p-1 rounded"
                />
              ) : (
                <input
                  name={key}
                  value={(form as any)[key]}
                  onChange={handleChange}
                  className="border p-1 rounded"
                />
              )}
            </div>
          ))}
        </div>

        {showError && (
          <p className="text-red-600 mt-2 text-sm">
            Debes rellenar todos los campos de los inputs (código postal y región son opcionales)
          </p>
        )}

        <div className="mt-4 flex justify-end space-x-2">
          <button
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 cursor-pointer"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className={`px-4 py-2 rounded text-white ${
              isValid ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer' : 'bg-gray-400 cursor-not-allowed'
            }`}
            onClick={handleConfirm}
            disabled={!isValid}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalAnadirDireccion;
