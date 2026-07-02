'use client';
import React, { FC, useState } from 'react';
import ModalAnadirDireccion from './modals/modalsDirecciones/ModalAnadirDireccion';
import ModalEditarDireccion from './modals/modalsDirecciones/ModalEditarDireccion';
import ModalBorrarDireccion from './modals/modalsDirecciones/ModalBorrarDireccion';

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

interface DireccionesProps {
  direcciones: Direccion[];
  onChange: (updatedDirecciones: Direccion[]) => void;
}

const Direcciones: FC<DireccionesProps> = ({ direcciones: initialDirecciones, onChange }) => {
  const [direcciones, setDirecciones] = useState(initialDirecciones);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [direccionEdit, setDireccionEdit] = useState<Direccion | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [direccionDelete, setDireccionDelete] = useState<Direccion | null>(null);

  // Sync with parent when initialDirecciones changes
  React.useEffect(() => {
    setDirecciones(initialDirecciones);
  }, [initialDirecciones]);

   const handleAdd = (newDir: Direccion) => {
    const updated = [...direcciones, newDir];
    setDirecciones(updated);
    setIsAddOpen(false);
    onChange(updated);
  };

   const handleEdit = (updatedDir: Direccion) => {
    if (direccionEdit) {
      const updated = direcciones.map(d => d === direccionEdit ? updatedDir : d);
      setDirecciones(updated);
      setIsEditOpen(false);
      setDireccionEdit(null);
      onChange(updated);
    }
  };

   const handleDelete = (dir: Direccion) => {
    const updated = direcciones.filter(d => d !== dir);
    setDirecciones(updated);
    setIsDeleteOpen(false);
    setDireccionDelete(null);
    onChange(updated);
  };

  return (
    <div className="p-4 space-y-6">
      <div className='flex flex-row justify-between'>
        <h2 className="text-xl font-bold">Direcciones</h2>
        <button
          className='p-2 px-4 text-sm rounded-lg shadow-xl bg-blue-950/80 hover:bg-blue-950/70 text-white cursor-pointer'
          onClick={() => setIsAddOpen(true)}
        >
          + 
        </button>
      </div>

      {direcciones.length === 0 && (
        <p className="text-gray-500">No hay direcciones registradas para esta cuenta.</p>
      )}

      {direcciones.map((d, idx) => (
        <table
          key={idx}
          className="min-w-full border border-gray-300 text-xs bg-white rounded shadow-sm overflow-hidden"
        >
          <thead className="bg-blue-950/80 text-white">
            <tr>
              <th className="text-left p-2 font-light">Nombre de la dirección</th>
              <th className="text-left p-2 font-light">País</th>
              <th className="text-left p-2 font-light">Región</th>
              <th className="text-left p-2 font-light">Ciudad</th>
              <th className="text-left p-2 font-light">Código postal</th>
              <th className="text-left p-2 font-light">Dirección completa</th>
              <th className="text-left p-2 font-light">Teléfono</th>
              <th className="text-left p-2 font-light">Descripción</th>
              <th></th>
            </tr>
          </thead>
          <tbody className=''>
            <tr className="hover:bg-gray-100/30 w-36">
              {Object.values(d).map((val, i) => (
                <td key={i} className="p-2 border-b">{val}</td>
              ))}
              <td className="flex flex-row justify-end p-2 gap-3">
                <button
                  className='p-2 px-4 text-xs rounded-lg shadow-xl bg-blue-950/80 hover:bg-blue-950/70 text-white cursor-pointer'
                  onClick={() => {
                    setDireccionEdit(d);
                    setIsEditOpen(true);
                  }}
                >
                  Editar
                </button>
                <button
                  className={`p-2 px-4 text-xs rounded-lg shadow-xl text-white  
                ${direcciones.length === 1 ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 cursor-pointer'}`}
                  onClick={() => {
                    setDireccionDelete(d);
                    setIsDeleteOpen(true);
                  }}
                  disabled={direcciones.length == 1}
                >
                  X
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      ))}

      <ModalAnadirDireccion
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onConfirm={handleAdd}
      />

      {direccionEdit && (
        <ModalEditarDireccion
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          direccion={direccionEdit}
          onConfirm={handleEdit}
        />
      )}

      {direccionDelete && (
        <ModalBorrarDireccion
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          direccion={direccionDelete}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
};

export default Direcciones;
